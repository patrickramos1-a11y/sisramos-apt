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
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Backlog de Produto</h1>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="painel" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Painel
            </TabsTrigger>
            <TabsTrigger value="lista" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            {isGestorOrAdmin && (
              <TabsTrigger value="config" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurar
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="painel" className="mt-6">
            <BacklogPainel />
          </TabsContent>

          <TabsContent value="lista" className="mt-6">
            <BacklogLista />
          </TabsContent>

          {isGestorOrAdmin && (
            <TabsContent value="config" className="mt-6">
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
