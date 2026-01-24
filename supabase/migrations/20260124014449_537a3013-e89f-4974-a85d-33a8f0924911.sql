-- Add grupo_id to link "sibling" demands created from multi-week selection
ALTER TABLE public.demandas ADD COLUMN grupo_id uuid DEFAULT NULL;

-- Create index for efficient sibling lookup
CREATE INDEX idx_demandas_grupo_id ON public.demandas(grupo_id) WHERE grupo_id IS NOT NULL;