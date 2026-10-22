-- Execute no SQL Editor do seu projeto Supabase.
create table if not exists public.lancamentos (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    descricao text not null check (char_length(descricao) between 1 and 160),
    valor numeric(12, 2) not null check (valor > 0),
    tipo text not null check (tipo in ('receita', 'despesa')),
    categoria text not null check (char_length(categoria) between 1 and 80),
    data date not null,
    created_at timestamptz not null default now()
);

create index if not exists lancamentos_user_data_idx
    on public.lancamentos (user_id, data);

alter table public.lancamentos enable row level security;
drop policy if exists "Cada pessoa acessa os próprios lançamentos" on public.lancamentos;
create policy "Cada pessoa acessa os próprios lançamentos"
    on public.lancamentos for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.lancamentos to authenticated;

create table if not exists public.preferencias_usuario (
    user_id uuid primary key references auth.users(id) on delete cascade,
    meta_economia numeric(12, 2) not null default 0 check (meta_economia >= 0)
);

alter table public.preferencias_usuario enable row level security;
drop policy if exists "Cada pessoa acessa as próprias preferências" on public.preferencias_usuario;
create policy "Cada pessoa acessa as próprias preferências"
    on public.preferencias_usuario for all to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.preferencias_usuario to authenticated;

select
  count(*) as total_lancamentos,
  pg_size_pretty(pg_total_relation_size('public.lancamentos')) as tamanho_da_tabela;
