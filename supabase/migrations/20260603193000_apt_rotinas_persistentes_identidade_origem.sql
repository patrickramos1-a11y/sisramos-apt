-- Ajustes de fechamento para rotinas persistentes:
-- - identidade visual padrao em laranja;
-- - metadados opcionais para permitir desfazer conversoes futuras com seguranca.

alter table public.apt_rotina_modelos
  add column if not exists origem_demanda_ids uuid[] null,
  add column if not exists origem_grupo_id uuid null;

alter table public.apt_rotina_modelos
  alter column cor set default '#f97316',
  alter column icone set default 'refresh';
