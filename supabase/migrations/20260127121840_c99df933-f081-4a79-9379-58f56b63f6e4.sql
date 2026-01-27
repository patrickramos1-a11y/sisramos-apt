-- Create junction table for checklist item user assignments
CREATE TABLE public.checklist_item_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(checklist_item_id, user_id)
);

-- Enable RLS
ALTER TABLE public.checklist_item_assignees ENABLE ROW LEVEL SECURITY;

-- Public access policies (matching the no-auth model)
CREATE POLICY "Allow public select on checklist_item_assignees"
ON public.checklist_item_assignees FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public insert on checklist_item_assignees"
ON public.checklist_item_assignees FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update on checklist_item_assignees"
ON public.checklist_item_assignees FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public delete on checklist_item_assignees"
ON public.checklist_item_assignees FOR DELETE
TO anon, authenticated
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_checklist_item_assignees_item_id ON public.checklist_item_assignees(checklist_item_id);
CREATE INDEX idx_checklist_item_assignees_user_id ON public.checklist_item_assignees(user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_item_assignees;