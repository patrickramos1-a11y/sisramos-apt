import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useExportPDF } from "@/hooks/useExportPDF";
import { toast } from "sonner";

interface ChartInfo {
  ref: React.RefObject<HTMLDivElement>;
  title: string;
}

interface ExportAllChartsButtonProps {
  charts: ChartInfo[];
}

export default function ExportAllChartsButton({ charts }: ExportAllChartsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { exportAllChartsAsPDF } = useExportPDF();

  const handleExportAll = async () => {
    const validCharts = charts.filter((c) => c.ref.current !== null);
    
    if (validCharts.length === 0) {
      toast.error("Nenhum gráfico encontrado para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const elements = validCharts.map((c) => ({
        element: c.ref.current!,
        title: c.title,
      }));
      
      await exportAllChartsAsPDF(elements);
      toast.success("Todos os gráficos exportados com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar gráficos");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportAll}
      disabled={isExporting}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Exportar Todos os Gráficos</span>
      <span className="sm:hidden">Exportar Tudo</span>
    </Button>
  );
}
