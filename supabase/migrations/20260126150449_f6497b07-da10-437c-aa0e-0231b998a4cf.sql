-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  semana INTEGER NOT NULL CHECK (semana >= 1 AND semana <= 5),
  texto TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- Create policies - all authenticated users can view
CREATE POLICY "Todos podem ver checklist items"
ON public.checklist_items
FOR SELECT
USING (true);

-- Only gestors/admins can insert
CREATE POLICY "Gestores podem criar checklist items"
ON public.checklist_items
FOR INSERT
WITH CHECK (is_gestor_or_admin(auth.uid()));

-- Only gestors/admins can update
CREATE POLICY "Gestores podem atualizar checklist items"
ON public.checklist_items
FOR UPDATE
USING (is_gestor_or_admin(auth.uid()));

-- Only gestors/admins can delete
CREATE POLICY "Gestores podem deletar checklist items"
ON public.checklist_items
FOR DELETE
USING (is_gestor_or_admin(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for checklist items
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;