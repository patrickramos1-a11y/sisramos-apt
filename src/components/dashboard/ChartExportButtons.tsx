import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { useExportPDF } from "@/hooks/useExportPDF";
import { toast } from "sonner";

interface ChartExportButtonsProps {
  chartRef: React.RefObject<HTMLDivElement>;
  chartName: string;
  compact?: boolean;
}

export default function ChartExportButtons({
  chartRef,
  chartName,
  compact = false,
}: ChartExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { exportChartAsPDF, exportChartAsImage } = useExportPDF();

  const handleExportPDF = async () => {
    if (!chartRef.current) {
      toast.error("Gráfico não encontrado");
      return;
    }

    setIsExporting(true);
    try {
      await exportChartAsPDF(chartRef.current, chartName);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    if (!chartRef.current) {
      toast.error("Gráfico não encontrado");
      return;
    }

    setIsExporting(true);
    try {
      await exportChartAsImage(chartRef.current, chartName);
      toast.success("Imagem exportada com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar imagem");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isExporting}
          className="h-8 w-8 p-0"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="sr-only">Exportar gráfico</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
        <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Baixar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportImage} className="gap-2 cursor-pointer">
          <FileImage className="h-4 w-4" />
          Baixar Imagem
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
