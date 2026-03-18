
-- Drop backlog tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS public.backlog_validacoes CASCADE;
DROP TABLE IF EXISTS public.backlog_registros_implementacao CASCADE;
DROP TABLE IF EXISTS public.backlog_changelog CASCADE;
DROP TABLE IF EXISTS public.backlog_anexos CASCADE;
DROP TABLE IF EXISTS public.backlog_item_modulos CASCADE;
DROP TABLE IF EXISTS public.backlog_items CASCADE;
DROP TABLE IF EXISTS public.backlog_modulos CASCADE;
DROP TABLE IF EXISTS public.backlog_projetos CASCADE;

-- Drop backlog enums
DROP TYPE IF EXISTS public.backlog_categoria CASCADE;
DROP TYPE IF EXISTS public.backlog_status CASCADE;
DROP TYPE IF EXISTS public.backlog_prioridade CASCADE;
DROP TYPE IF EXISTS public.backlog_impacto CASCADE;
DROP TYPE IF EXISTS public.backlog_esforco CASCADE;
DROP TYPE IF EXISTS public.backlog_registro_status CASCADE;
DROP TYPE IF EXISTS public.backlog_tipo_validacao CASCADE;
