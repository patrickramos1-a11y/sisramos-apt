import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Edit, Archive } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useBacklogItems, 
  STATUS_LABELS, 
  CATEGORIAS_LABELS, 
  PRIORIDADE_LABELS,
  BacklogCategoria,
  BacklogStatus,
  BacklogPrioridade,
  BacklogItem
} from "@/hooks/useBacklog";
import { useAuth } from "@/contexts/AuthContext";
import BacklogFilters from "./BacklogFilters";
import NovoBacklogItemDialog from "./NovoBacklogItemDialog";
import BacklogItemDetailDialog from "./BacklogItemDetailDialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_COLORS: Record<BacklogStatus, string> = {
  ideia: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  em_analise: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  refinado: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  aguardando_recursos: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  em_implementacao: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  em_testes: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  implementado: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
  lancado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  validado: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  arquivado: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
};

const PRIORIDADE_COLORS: Record<BacklogPrioridade, string> = {
  alta: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  media: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  baixa: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
};

export default function BacklogLista() {
  const { isGestorOrAdmin } = useAuth();
  const [filters, setFilters] = useState<{
    projetoId?: string;
    categoria?: BacklogCategoria;
    status?: BacklogStatus;
    prioridade?: BacklogPrioridade;
    dependenteCreditos?: boolean;
    search?: string;
  }>({});
  
  const [isNovoDialogOpen, setIsNovoDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: items, isLoading } = useBacklogItems(filters);

  const handleViewItem = (item: BacklogItem) => {
    setSelectedItem(item);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lista de Itens</h2>
        {isGestorOrAdmin && (
          <Button onClick={() => setIsNovoDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Item
          </Button>
        )}
      </div>

      <BacklogFilters filters={filters} onFiltersChange={setFilters} />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : items && items.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="w-32">Projeto</TableHead>
                <TableHead className="w-40">Categoria</TableHead>
                <TableHead className="w-36">Status</TableHead>
                <TableHead className="w-24">Prioridade</TableHead>
                <TableHead className="w-32">Criado em</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewItem(item)}
                >
                  <TableCell className="font-mono text-muted-foreground">
                    {item.numero}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.titulo}</span>
                      {item.dependente_de_creditos && (
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">
                          ⚠️ Depende de créditos
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.projeto?.nome || "-"}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{CATEGORIAS_LABELS[item.categoria]}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={STATUS_COLORS[item.status]}>
                      {STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={PRIORIDADE_COLORS[item.prioridade]}>
                      {PRIORIDADE_LABELS[item.prioridade]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewItem(item);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Archive className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum item encontrado</p>
          <p className="text-sm">
            {Object.keys(filters).length > 0 
              ? "Tente ajustar os filtros" 
              : "Crie o primeiro item do backlog"}
          </p>
        </div>
      )}

      <NovoBacklogItemDialog 
        open={isNovoDialogOpen} 
        onOpenChange={setIsNovoDialogOpen} 
      />

      {selectedItem && (
        <BacklogItemDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          itemId={selectedItem.id}
        />
      )}
    </div>
  );
}
