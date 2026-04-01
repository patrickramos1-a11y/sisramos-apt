import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemandas } from "@/hooks/useDemandas";
import AppLayout from "@/components/layout/AppLayout";
import APTGerenciamento from "@/components/apt/APTGerenciamento";
import GerenciamentoLista from "@/components/apt/GerenciamentoLista";
import SolicitacoesExclusaoLista from "@/components/apt/SolicitacoesExclusaoLista";
import { useSolicitacoesExclusao } from "@/hooks/useSolicitacoesExclusao";
import { PanelLeft, List, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Gerenciamento() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isGestorOrAdmin } = useAuth();
  const { profiles, setores, fetchDemandas } = useDemandas();
  const { refetchSolicitacoes } = useSolicitacoesExclusao();

  const currentTab = searchParams.get("tab") || "painel";

  const tabs = [
    { key: "painel", label: "Painel", icon: PanelLeft },
    { key: "lista", label: "Lista", icon: List },
    ...(isGestorOrAdmin ? [{ key: "exclusoes", label: "Exclusões", icon: Trash2 }] : []),
  ];

  return (
    <AppLayout>
      <div className="p-3 md:p-4 lg:p-6 max-w-[1800px] mx-auto">
        <div className="mb-3 md:mb-4">
          <h1 className="text-lg md:text-2xl font-bold tracking-tight">
            Gerenciamento
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Gestão estratégica de demandas e setores
          </p>

          <div className="flex gap-1 mt-3 p-1 bg-muted/50 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate(`/gerenciamento?tab=${tab.key}`)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all min-h-[36px] touch-feedback",
                  currentTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {currentTab === "exclusoes" ? (
          <SolicitacoesExclusaoLista
            profiles={profiles}
            setores={setores}
            onDemandaChange={() => { fetchDemandas(); refetchSolicitacoes(); }}
          />
        ) : currentTab === "lista" ? (
          <GerenciamentoLista
            profiles={profiles}
            setores={setores}
            onDemandaChange={fetchDemandas}
          />
        ) : (
          <APTGerenciamento
            profiles={profiles}
            setores={setores}
            onDemandaChange={fetchDemandas}
          />
        )}
      </div>
    </AppLayout>
  );
}