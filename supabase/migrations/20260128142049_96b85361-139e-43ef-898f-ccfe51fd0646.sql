-- Add link column to checklist_items for external references
ALTER TABLE public.checklist_items 
ADD COLUMN link text DEFAULT NULL;

-- Add a comment for documentation
COMMENT ON COLUMN public.checklist_items.link IS 'URL for external references (documents, systems, processes)';