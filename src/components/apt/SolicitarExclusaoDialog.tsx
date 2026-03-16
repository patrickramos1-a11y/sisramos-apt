import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SolicitarExclusaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demandaId: string | null;
  demandaNumero: number | null;
  grupoId: string | null;
  siblingCount: number;
  onSolicitacaoEnviada: () => void;
  // Heuristic fields for fallback when grupo_id is null
  demandaDescricao?: string;
  demandaResponsavelId?: string;
  demandaMes?: number;
  demandaAno?: number;
  demandaSemanasRepeticao?: number;
}

export default function SolicitarExclusaoDialog({
  open,
  onOpenChange,
  demandaId,
  demandaNumero,
  grupoId,
  siblingCount,
  onSolicitacaoEnviada,
  demandaDescricao,
  demandaResponsavelId,
  demandaMes,
  demandaAno,
  demandaSemanasRepeticao,
}: SolicitarExclusaoDialogProps) {
  const [justificativa, setJustificativa] = useState("");
  const [tipoExclusao, setTipoExclusao] = useState<"unica" | "todas">("unica");
  const [isLoading, setIsLoading] = useState(false);
  const [resolvedGrupoId, setResolvedGrupoId] = useState<string | null>(grupoId);
  const [actualSiblingCount, setActualSiblingCount] = useState(siblingCount);
  const { user } = useAuth();
  const { toast } = useToast();

  // Resolve grupo_id and sibling count when dialog opens
  useEffect(() => {
    if (!open) return;

    setJustificativa("");
    setTipoExclusao("unica");

    const resolveSiblings = async () => {
      if (grupoId) {
        // Primary path: fetch by grupo_id
        const { data } = await supabase
          .from("demandas")
          .select("id")
          .eq("grupo_id", grupoId)
          .eq("ativa", true);

        if (data && data.length > 1) {
          setResolvedGrupoId(grupoId);
          setActualSiblingCount(data.length);
          return;
        }
      }

      // Heuristic fallback
      if (demandaSemanasRepeticao && demandaSemanasRepeticao > 1 && demandaDescricao && demandaResponsavelId && demandaMes && demandaAno) {
        const { data } = await supabase
          .from("demandas")
          .select("id, grupo_id")
          .eq("descricao", demandaDescricao)
          .eq("responsavel_id", demandaResponsavelId)
          .eq("mes", demandaMes)
          .eq("ano", demandaAno)
          .eq("ativa", true);

        if (data && data.length > 1) {
          setActualSiblingCount(data.length);

          // Auto-fix: assign a shared grupo_id
          const existingGrupoId = data.find(d => d.grupo_id)?.grupo_id;
          const newGrupoId = existingGrupoId || crypto.randomUUID();
          
          if (!existingGrupoId) {
            const siblingIds = data.map(d => d.id);
            await supabase
              .from("demandas")
              .update({ grupo_id: newGrupoId })
              .in("id", siblingIds);
          }

          setResolvedGrupoId(newGrupoId);
          return;
        }
      }

      // No siblings
      setResolvedGrupoId(grupoId);
      setActualSiblingCount(siblingCount);
    };

    resolveSiblings();
  }, [open, grupoId, demandaDescricao, demandaResponsavelId, demandaMes, demandaAno, demandaSemanasRepeticao, siblingCount]);

  const hasSiblings = actualSiblingCount > 1;

  const handleSubmit = async () => {
    if (!demandaId || !user) return;
    if (!justificativa.trim()) {
      toast({
        variant: "destructive",
        title: "Justificativa obrigatória",
        description: "Informe o motivo da solicitação de exclusão.",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("solicitacoes_exclusao" as any)
      .insert({
        demanda_id: demandaId,
        grupo_id: tipoExclusao === "todas" ? resolvedGrupoId : null,
        tipo_exclusao: hasSiblings ? tipoExclusao : "unica",
        solicitante_id: user.id,
        justificativa: justificativa.trim(),
        status: "pendente",
      });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar solicitação",
        description: error.message,
      });
    } else {
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de exclusão será analisada por um gestor.",
      });
      onOpenChange(false);
      onSolicitacaoEnviada();
    }

    setIsLoading(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Solicitar Exclusão - Demanda #{demandaNumero}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-foreground">
                Como colaborador, sua solicitação de exclusão será enviada para
                aprovação de um gestor ou administrador. A demanda continuará
                ativa até que a decisão seja tomada.
              </div>

              {hasSiblings && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-foreground">
                    Esta demanda possui {actualSiblingCount} repetições. O que deseja excluir?
                  </Label>
                  <RadioGroup
                    value={tipoExclusao}
                    onValueChange={(v) => setTipoExclusao(v as "unica" | "todas")}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="unica" id="unica" />
                      <Label htmlFor="unica" className="text-sm text-foreground cursor-pointer">
                        Apenas esta ocorrência
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="todas" id="todas" />
                      <Label htmlFor="todas" className="text-sm text-foreground cursor-pointer">
                        Todas as repetições ({actualSiblingCount})
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="justificativa" className="text-sm font-medium text-foreground">
                  Justificativa *
                </Label>
                <Textarea
                  id="justificativa"
                  placeholder="Informe o motivo da solicitação de exclusão..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isLoading || !justificativa.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Solicitação"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
