-- Demandas Persistentes da APT
-- Esta migration cria a base paralela para rotinas recorrentes por setor,
-- sem alterar a tabela atual de demandas comuns.

create table if not exists public.apt_rotina_modelos (
  id uuid primary key default gen_random_uuid(),
  setor_id uuid references public.setores(id) on delete set null,
  nome text not null,
  descricao text not null,
  responsavel_padrao_id uuid not null,
  dias_semana int[] not null default '{}',
  semanas_aplicaveis int[] not null default '{1,2,3,4,5}',
  ativo boolean not null default true,
  exige_aprovacao boolean not null default true,
  entra_calculo_apt boolean not null default true,
  cor text not null default '#65a30d',
  icone text not null default 'check',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apt_rotina_modelos_dias_validos check (
    dias_semana <@ array[0,1,2,3,4,5,6]
  ),
  constraint apt_rotina_modelos_semanas_validas check (
    semanas_aplicaveis <@ array[1,2,3,4,5]
  )
);

create table if not exists public.apt_rotina_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.apt_rotina_modelos(id) on delete cascade,
  data date not null,
  mes int not null,
  ano int not null,
  semana_apt int not null,
  responsavel_id uuid not null,
  setor_id uuid null references public.setores(id) on delete set null,
  status_execucao text not null default 'pendente',
  marcado_em timestamptz null,
  marcado_por uuid null,
  observacao text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apt_rotina_ocorrencias_status_check check (
    status_execucao in ('pendente', 'executado', 'nao_realizado')
  ),
  constraint apt_rotina_ocorrencias_semana_check check (semana_apt between 1 and 5),
  unique (modelo_id, data)
);

create table if not exists public.apt_rotina_avaliacoes (
  id uuid primary key default gen_random_uuid(),
  modelo_id uuid not null references public.apt_rotina_modelos(id) on delete cascade,
  responsavel_id uuid not null,
  setor_id uuid null references public.setores(id) on delete set null,
  mes int not null,
  ano int not null,
  momento int null,
  semanas_agrupadas int[] not null default '{}',
  previstas int not null default 0,
  feitas int not null default 0,
  nao_feitas int not null default 0,
  percentual numeric(5,2) not null default 0,
  status_gestor text not null default 'pendente',
  observacao_gestor text null,
  avaliado_em timestamptz null,
  avaliado_por uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint apt_rotina_avaliacoes_status_check check (
    status_gestor in ('pendente', 'aprovado', 'reprovado')
  ),
  unique (modelo_id, responsavel_id, mes, ano, momento)
);

create index if not exists apt_rotina_modelos_setor_idx
  on public.apt_rotina_modelos(setor_id);

create index if not exists apt_rotina_modelos_responsavel_idx
  on public.apt_rotina_modelos(responsavel_padrao_id);

create index if not exists apt_rotina_ocorrencias_periodo_idx
  on public.apt_rotina_ocorrencias(ano, mes, semana_apt);

create index if not exists apt_rotina_ocorrencias_responsavel_idx
  on public.apt_rotina_ocorrencias(responsavel_id);

create index if not exists apt_rotina_ocorrencias_status_idx
  on public.apt_rotina_ocorrencias(status_execucao);

create index if not exists apt_rotina_avaliacoes_periodo_idx
  on public.apt_rotina_avaliacoes(ano, mes, momento);

create or replace function public.update_apt_rotinas_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_apt_rotina_modelos_updated_at on public.apt_rotina_modelos;
create trigger update_apt_rotina_modelos_updated_at
before update on public.apt_rotina_modelos
for each row execute function public.update_apt_rotinas_updated_at();

drop trigger if exists update_apt_rotina_ocorrencias_updated_at on public.apt_rotina_ocorrencias;
create trigger update_apt_rotina_ocorrencias_updated_at
before update on public.apt_rotina_ocorrencias
for each row execute function public.update_apt_rotinas_updated_at();

drop trigger if exists update_apt_rotina_avaliacoes_updated_at on public.apt_rotina_avaliacoes;
create trigger update_apt_rotina_avaliacoes_updated_at
before update on public.apt_rotina_avaliacoes
for each row execute function public.update_apt_rotinas_updated_at();

create or replace function public.apt_rotina_marcar_atrasadas()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  update public.apt_rotina_ocorrencias
  set
    status_execucao = 'nao_realizado',
    marcado_em = coalesce(marcado_em, now()),
    updated_at = now()
  where status_execucao = 'pendente'
    and data < (now() at time zone 'America/Sao_Paulo')::date;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

alter table public.apt_rotina_modelos enable row level security;
alter table public.apt_rotina_ocorrencias enable row level security;
alter table public.apt_rotina_avaliacoes enable row level security;

drop policy if exists "rotina_modelos_select_auth" on public.apt_rotina_modelos;
create policy "rotina_modelos_select_auth"
on public.apt_rotina_modelos
for select
to authenticated
using (true);

drop policy if exists "rotina_modelos_write_gestor_admin" on public.apt_rotina_modelos;
create policy "rotina_modelos_write_gestor_admin"
on public.apt_rotina_modelos
for all
to authenticated
using (public.is_gestor_or_admin(auth.uid()))
with check (public.is_gestor_or_admin(auth.uid()));

drop policy if exists "rotina_ocorrencias_select_auth" on public.apt_rotina_ocorrencias;
create policy "rotina_ocorrencias_select_auth"
on public.apt_rotina_ocorrencias
for select
to authenticated
using (
  public.is_gestor_or_admin(auth.uid())
  or responsavel_id = auth.uid()
);

drop policy if exists "rotina_ocorrencias_update_responsavel" on public.apt_rotina_ocorrencias;
create policy "rotina_ocorrencias_update_responsavel"
on public.apt_rotina_ocorrencias
for update
to authenticated
using (
  public.is_gestor_or_admin(auth.uid())
  or responsavel_id = auth.uid()
)
with check (
  public.is_gestor_or_admin(auth.uid())
  or responsavel_id = auth.uid()
);

drop policy if exists "rotina_ocorrencias_insert_gestor_admin" on public.apt_rotina_ocorrencias;
create policy "rotina_ocorrencias_insert_gestor_admin"
on public.apt_rotina_ocorrencias
for insert
to authenticated
with check (public.is_gestor_or_admin(auth.uid()));

drop policy if exists "rotina_ocorrencias_delete_gestor_admin" on public.apt_rotina_ocorrencias;
create policy "rotina_ocorrencias_delete_gestor_admin"
on public.apt_rotina_ocorrencias
for delete
to authenticated
using (public.is_gestor_or_admin(auth.uid()));

drop policy if exists "rotina_avaliacoes_select_auth" on public.apt_rotina_avaliacoes;
create policy "rotina_avaliacoes_select_auth"
on public.apt_rotina_avaliacoes
for select
to authenticated
using (
  public.is_gestor_or_admin(auth.uid())
  or responsavel_id = auth.uid()
);

drop policy if exists "rotina_avaliacoes_write_gestor_admin" on public.apt_rotina_avaliacoes;
create policy "rotina_avaliacoes_write_gestor_admin"
on public.apt_rotina_avaliacoes
for all
to authenticated
using (public.is_gestor_or_admin(auth.uid()))
with check (public.is_gestor_or_admin(auth.uid()));

grant execute on function public.apt_rotina_marcar_atrasadas() to authenticated;
