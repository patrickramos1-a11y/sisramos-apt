import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import BacklogPainel from "@/components/backlog/BacklogPainel";
import BacklogLista from "@/components/backlog/BacklogLista";
import BacklogProjetosManagement from "@/components/backlog/BacklogProjetosManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, List, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Backlog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isGestorOrAdmin } = useAuth();
  const currentTab = searchParams.get("tab") || "painel";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AppLayout>
      <div className="px-3 md:px-4 lg:container lg:mx-auto py-4 md:py-6 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-2xl font-bold">Backlog de Produto</h1>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-grid h-auto p-1">
            <TabsTrigger value="painel" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
              <LayoutDashboard className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Painel
            </TabsTrigger>
            <TabsTrigger value="lista" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
              <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
              Lista
            </TabsTrigger>
            {isGestorOrAdmin && (
              <TabsTrigger value="config" className="flex items-center gap-1.5 text-xs md:text-sm py-2">
                <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Configurar</span>
                <span className="sm:hidden">Config</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="painel" className="mt-4 md:mt-6">
            <BacklogPainel />
          </TabsContent>

          <TabsContent value="lista" className="mt-4 md:mt-6">
            <BacklogLista />
          </TabsContent>

          {isGestorOrAdmin && (
            <TabsContent value="config" className="mt-4 md:mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <BacklogProjetosManagement />
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
