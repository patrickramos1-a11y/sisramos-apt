alter table public.demandas
  add column if not exists modo_execucao text not null default 'semanal',
  add column if not exists semana_inicio_prazo integer null,
  add column if not exists semana_fim_prazo integer null;

alter table public.demandas
  drop constraint if exists demandas_modo_execucao_check;

alter table public.demandas
  add constraint demandas_modo_execucao_check
  check (modo_execucao in ('semanal', 'prazo'));

alter table public.demandas
  drop constraint if exists demandas_semana_prazo_window_check;

alter table public.demandas
  add constraint demandas_semana_prazo_window_check
  check (
    (
      modo_execucao = 'semanal'
      and semana_inicio_prazo is null
      and semana_fim_prazo is null
    )
    or
    (
      modo_execucao = 'prazo'
      and semana_inicio_prazo between 1 and 5
      and semana_fim_prazo between 1 and 5
      and semana_inicio_prazo <= semana_fim_prazo
    )
  );

create index if not exists demandas_modo_execucao_idx on public.demandas (modo_execucao);
create index if not exists demandas_semana_prazo_idx on public.demandas (semana_inicio_prazo, semana_fim_prazo);
