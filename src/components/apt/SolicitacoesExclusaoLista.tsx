import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Check, X, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { playDeleteSound } from "@/lib/audioFeedback";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
  cor: string;
}

interface SolicitacaoExclusao {
  id: string;
  demanda_id: string;
  grupo_id: string | null;
  tipo_exclusao: string;
  solicitante_id: string;
  justificativa: string;
  status: string;
  decisor_id: string | null;
  justificativa_recusa: string | null;
  created_at: string;
  decided_at: string | null;
  // joined
  demanda?: {
    numero: number;
    descricao: string;
    responsavel_id: string;
    setor_id: string | null;
    semana_limite: number[];
    mes: number;
    ano: number;
    semanas_repeticao: number;
    grupo_id: string | null;
  };
}

interface SolicitacoesExclusaoListaProps {
  profiles: Profile[];
  setores: Setor[];
  onDemandaChange: () => void;
}

export default function SolicitacoesExclusaoLista({
  profiles,
  setores,
  onDemandaChange,
}: SolicitacoesExclusaoListaProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoExclusao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [recusaDialog, setRecusaDialog] = useState<SolicitacaoExclusao | null>(null);
  const [justificativaRecusa, setJustificativaRecusa] = useState("");

  const fetchSolicitacoes = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("solicitacoes_exclusao" as any)
      .select("*, demanda:demandas(numero, descricao, responsavel_id, setor_id, semana_limite, mes, ano, semanas_repeticao, grupo_id)")
      .eq("status", "pendente")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching solicitacoes:", error);
      setSolicitacoes([]);
    } else {
      setSolicitacoes((data as any) || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSolicitacoes();
  }, [fetchSolicitacoes]);

  const getProfileByUserId = (userId: string) =>
    profiles.find((p) => p.user_id === userId);

  const getSetorById = (setorId: string | null) => {
    if (!setorId) return null;
    return setores.find((s) => s.id === setorId);
  };

  const handleAprovar = async (solicitacao: SolicitacaoExclusao) => {
    if (!user) return;
    setProcessingId(solicitacao.id);

    try {
      // Execute the actual deletion
      if (solicitacao.tipo_exclusao === "todas" && solicitacao.grupo_id) {
        await supabase
          .from("demandas")
          .delete()
          .eq("grupo_id", solicitacao.grupo_id);
      } else {
        await supabase
          .from("demandas")
          .delete()
          .eq("id", solicitacao.demanda_id);

        // Update remaining siblings' repetition count
        if (solicitacao.demanda?.grupo_id) {
          const { data: remaining } = await supabase
            .from("demandas")
            .select("id")
            .eq("grupo_id", solicitacao.demanda.grupo_id)
            .eq("ativa", true);

          if (remaining && remaining.length > 0) {
            await supabase
              .from("demandas")
              .update({ semanas_repeticao: remaining.length })
              .eq("grupo_id", solicitacao.demanda.grupo_id)
              .eq("ativa", true);
          }
        }
      }

      // Mark solicitacao as approved
      await supabase
        .from("solicitacoes_exclusao" as any)
        .update({
          status: "aprovada",
          decisor_id: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", solicitacao.id);

      // Also approve any other pending requests for the same demand
      if (solicitacao.tipo_exclusao === "todas" && solicitacao.grupo_id) {
        await supabase
          .from("solicitacoes_exclusao" as any)
          .update({
            status: "aprovada",
            decisor_id: user.id,
            decided_at: new Date().toISOString(),
          })
          .eq("grupo_id", solicitacao.grupo_id)
          .eq("status", "pendente");
      }

      playDeleteSound();

      toast({
        title: "Exclusão aprovada!",
        description: "A demanda foi removida permanentemente.",
      });

      fetchSolicitacoes();
      onDemandaChange();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao aprovar exclusão",
        description: "Tente novamente.",
      });
    }

    setProcessingId(null);
  };

  const handleRecusar = async () => {
    if (!recusaDialog || !user) return;
    setProcessingId(recusaDialog.id);

    const { error } = await supabase
      .from("solicitacoes_exclusao" as any)
      .update({
        status: "recusada",
        decisor_id: user.id,
        decided_at: new Date().toISOString(),
        justificativa_recusa: justificativaRecusa.trim() || null,
      })
      .eq("id", recusaDialog.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao recusar solicitação",
        description: error.message,
      });
    } else {
      toast({
        title: "Solicitação recusada",
        description: "A demanda permanece ativa.",
      });
      setRecusaDialog(null);
      setJustificativaRecusa("");
      fetchSolicitacoes();
    }

    setProcessingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (solicitacoes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Check className="h-8 w-8" />
          <p>Nenhuma solicitação de exclusão pendente</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Solicitações de Exclusão</h2>
        <Badge variant="destructive">{solicitacoes.length} pendentes</Badge>
      </div>

      <Card>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Demanda</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solicitacoes.map((s) => {
                const demanda = s.demanda;
                const responsavel = demanda
                  ? getProfileByUserId(demanda.responsavel_id)
                  : null;
                const setor = demanda ? getSetorById(demanda.setor_id) : null;
                const solicitante = getProfileByUserId(s.solicitante_id);

                return (
                  <TableRow key={s.id}>
                    <TableCell className="max-w-[250px]">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">
                          #{demanda?.numero}
                        </span>
                        <p className="text-sm whitespace-normal break-words">
                          {demanda?.descricao || "Demanda removida"}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {demanda?.mes}/{demanda?.ano} · {demanda?.semanas_repeticao}x
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {responsavel?.nome || "-"}
                    </TableCell>
                    <TableCell>
                      {setor ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: setor.cor }}
                          />
                          <span className="text-sm">{setor.nome}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={s.tipo_exclusao === "todas" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {s.tipo_exclusao === "todas"
                          ? `Todas (${demanda?.semanas_repeticao || "?"})`
                          : "Apenas esta"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {solicitante?.nome || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(s.created_at), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm whitespace-normal break-words text-muted-foreground">
                        {s.justificativa}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-center">
                        <Button
                          variant="default"
                          size="sm"
                          className="gap-1 h-8"
                          onClick={() => handleAprovar(s)}
                          disabled={processingId === s.id}
                        >
                          {processingId === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          Aprovar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 h-8"
                          onClick={() => {
                            setRecusaDialog(s);
                            setJustificativaRecusa("");
                          }}
                          disabled={processingId === s.id}
                        >
                          <X className="h-3 w-3" />
                          Recusar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Recusa Dialog */}
      <Dialog
        open={!!recusaDialog}
        onOpenChange={() => setRecusaDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A demanda #{recusaDialog?.demanda?.numero} permanecerá ativa.
            </p>
            <div className="space-y-2">
              <Label htmlFor="justificativa-recusa">
                Justificativa da recusa (opcional)
              </Label>
              <Textarea
                id="justificativa-recusa"
                placeholder="Motivo da recusa..."
                value={justificativaRecusa}
                onChange={(e) => setJustificativaRecusa(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecusaDialog(null)}
              disabled={!!processingId}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRecusar}
              disabled={!!processingId}
            >
              {processingId ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
