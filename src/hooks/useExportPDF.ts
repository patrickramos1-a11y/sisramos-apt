import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

interface DemandaExport {
  numero: number;
  setor: string;
  responsavel: string;
  descricao: string;
  observacoes: string;
  statusResponsavel: string;
  statusGestor: string;
  repeticao: number;
  semana: string;
}

interface ExportFilters {
  mes?: string;
  ano?: string;
  setor?: string;
  responsavel?: string;
}

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  executado: "Executado",
  nao_realizado: "Não Realizado",
};

export function useExportPDF() {
  const exportDemandas = useCallback(
    (demandas: DemandaExport[], filters?: ExportFilters) => {
      const doc = new jsPDF({ orientation: "landscape" });

      // Header
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("Lista de Demandas - APT", 14, 20);

      // Subtitle with filters
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      const filterParts: string[] = [];
      if (filters?.mes) filterParts.push(`Mês: ${filters.mes}`);
      if (filters?.ano) filterParts.push(`Ano: ${filters.ano}`);
      if (filters?.setor) filterParts.push(`Setor: ${filters.setor}`);
      if (filters?.responsavel) filterParts.push(`Responsável: ${filters.responsavel}`);
      
      const filterText = filterParts.length > 0 
        ? `Filtros: ${filterParts.join(" | ")}` 
        : "Sem filtros aplicados";
      doc.text(filterText, 14, 28);
      
      // Date
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, 34);

      // Table data
      const tableData = demandas.map((d) => [
        d.numero.toString(),
        d.setor,
        d.responsavel,
        d.descricao.length > 50 ? d.descricao.substring(0, 50) + "..." : d.descricao,
        d.observacoes.length > 40 ? d.observacoes.substring(0, 40) + "..." : d.observacoes,
        statusLabels[d.statusResponsavel] || d.statusResponsavel,
        statusLabels[d.statusGestor] || d.statusGestor,
        `${d.repeticao}x`,
        d.semana,
      ]);

      autoTable(doc, {
        startY: 40,
        head: [["Nº", "Setor", "Responsável", "Descrição", "Observações", "Feito", "Aprovado", "Rep.", "Semana"]],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 14 },
          1: { cellWidth: 28 },
          2: { cellWidth: 32 },
          3: { cellWidth: 70 },
          4: { cellWidth: 55 },
          5: { cellWidth: 22 },
          6: { cellWidth: 24 },
          7: { cellWidth: 14 },
          8: { cellWidth: 20 },
        },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: "center" }
        );
      }

      doc.save(`demandas-apt-${new Date().toISOString().split("T")[0]}.pdf`);
    },
    []
  );

  const exportChartAsPDF = useCallback(
    async (element: HTMLElement, chartName: string) => {
      // Force light theme for export
      const root = document.documentElement;
      const wasDark = root.classList.contains("dark");
      if (wasDark) {
        root.classList.remove("dark");
        root.classList.add("light");
      }

      // Wait for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");
        const doc = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Header
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text(chartName, 10, 15);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 10, 22);

        // Image
        const yPosition = 30;
        if (imgHeight + yPosition > pageHeight - 20) {
          const scaledHeight = pageHeight - yPosition - 20;
          const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
          doc.addImage(imgData, "PNG", 10, yPosition, scaledWidth, scaledHeight);
        } else {
          doc.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
        }

        doc.save(`${chartName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`);
      } catch (error) {
        console.error("Erro ao exportar gráfico como PDF:", error);
        throw error;
      } finally {
        // Restore dark theme if it was active
        if (wasDark) {
          root.classList.remove("light");
          root.classList.add("dark");
        }
      }
    },
    []
  );

  const exportChartAsImage = useCallback(
    async (element: HTMLElement, chartName: string) => {
      // Force light theme for export
      const root = document.documentElement;
      const wasDark = root.classList.contains("dark");
      if (wasDark) {
        root.classList.remove("dark");
        root.classList.add("light");
      }

      // Wait for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        const link = document.createElement("a");
        link.download = `${chartName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } catch (error) {
        console.error("Erro ao exportar gráfico como imagem:", error);
        throw error;
      } finally {
        // Restore dark theme if it was active
        if (wasDark) {
          root.classList.remove("light");
          root.classList.add("dark");
        }
      }
    },
    []
  );

  const exportAllChartsAsPDF = useCallback(
    async (elements: { element: HTMLElement; title: string }[]) => {
      // Force light theme for export
      const root = document.documentElement;
      const wasDark = root.classList.contains("dark");
      if (wasDark) {
        root.classList.remove("dark");
        root.classList.add("light");
      }

      // Wait for styles to apply
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const doc = new jsPDF();
        let isFirstPage = true;

        for (const { element, title } of elements) {
          if (!isFirstPage) {
            doc.addPage();
          }
          isFirstPage = false;

          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          const imgWidth = pageWidth - 20;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Header
          doc.setFontSize(14);
          doc.setTextColor(40, 40, 40);
          doc.text(title, 10, 15);

          // Image
          const yPosition = 25;
          if (imgHeight + yPosition > pageHeight - 10) {
            const scaledHeight = pageHeight - yPosition - 10;
            const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
            doc.addImage(imgData, "PNG", 10, yPosition, scaledWidth, scaledHeight);
          } else {
            doc.addImage(imgData, "PNG", 10, yPosition, imgWidth, imgHeight);
          }
        }

        // Footer with page numbers
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" }
          );
        }

        doc.save(`dashboard-completo-${new Date().toISOString().split("T")[0]}.pdf`);
      } catch (error) {
        console.error("Erro ao exportar todos os gráficos:", error);
        throw error;
      } finally {
        // Restore dark theme if it was active
        if (wasDark) {
          root.classList.remove("light");
          root.classList.add("dark");
        }
      }
    },
    []
  );

  return {
    exportDemandas,
    exportChartAsPDF,
    exportChartAsImage,
    exportAllChartsAsPDF,
  };
}
