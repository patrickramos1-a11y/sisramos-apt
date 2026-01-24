import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Loader2 } from "lucide-react";
import { useExportPDF } from "@/hooks/useExportPDF";
import { toast } from "sonner";

interface Demanda {
  id: string;
  numero: number;
  setor_id: string | null;
  responsavel_id: string;
  descricao: string;
  status_responsavel: "pendente" | "executado" | "nao_realizado";
  status_gestor: "pendente" | "executado" | "nao_realizado";
  semanas_repeticao: number;
  semana_limite: number[];
}

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface ExportDemandasButtonProps {
  demandas: Demanda[];
  profiles: Profile[];
  setores: Setor[];
  getProfileById: (id: string) => Profile | undefined;
  getSetorById: (id: string | null) => Setor | undefined;
  activeFilters?: {
    mes?: string;
    ano?: string;
  };
}

export default function ExportDemandasButton({
  demandas,
  profiles,
  setores,
  getProfileById,
  getSetorById,
  activeFilters,
}: ExportDemandasButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { exportDemandas } = useExportPDF();

  const handleExportPDF = async () => {
    if (demandas.length === 0) {
      toast.error("Não há demandas para exportar");
      return;
    }

    setIsExporting(true);
    try {
      const exportData = demandas.map((d, index) => {
        const profile = getProfileById(d.responsavel_id);
        const setor = getSetorById(d.setor_id);
        const semanaOrdenacao = d.semana_limite?.length
          ? Math.min(...d.semana_limite)
          : 0;

        return {
          numero: index + 1,
          setor: setor?.nome || "Sem setor",
          responsavel: profile?.nome || "Desconhecido",
          descricao: d.descricao,
          statusResponsavel: d.status_responsavel,
          statusGestor: d.status_gestor,
          repeticao: d.semanas_repeticao,
          semana: `${semanaOrdenacao}ª`,
        };
      });

      exportDemandas(exportData, activeFilters);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportPDF}
      disabled={isExporting || demandas.length === 0}
      className="gap-2"
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Exportar PDF</span>
      <span className="sm:hidden">PDF</span>
    </Button>
  );
}
