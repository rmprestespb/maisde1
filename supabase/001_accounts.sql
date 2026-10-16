-- Connect Hub Pro — Fase A/B/C: contas reais (Supabase Auth) + admin da
-- plataforma + contas do tipo empresa/funcionário.
--
-- Como rodar: Supabase Dashboard -> SQL Editor -> New query -> cole tudo
-- isso -> Run. Pode rodar uma vez só (idempotente na maior parte: usa
-- "if not exists"/"or replace" onde dá).
--
-- =============================================================================
-- PASSO 0 (obrigatório, antes de mais nada): desligar a confirmação de e-mail.
-- =============================================================================
-- Dashboard -> Authentication -> Providers -> Email -> desmarque "Confirm
-- email" -> Save. Sem isso, toda conta que o Painel Admin criar (inclusive a
-- sua, se você não marcar "Auto Confirm" no passo manual mais abaixo) fica
-- travada esperando um e-mail de confirmação que nunca vai chegar — porque o
-- e-mail é inventado (não é uma caixa de entrada de verdade), então o
-- cliente nunca conseguiria logar.

-- 1) Tabela de perfis: um registro por usuário do Supabase Auth, com os
--    dados específicos do app (tipo de conta, nome, usuário, hierarquia
--    empresa -> funcionário, se é admin da plataforma, ativo/inativo).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null check (account_type in ('individual', 'empresa', 'empresa_employee')),
  name text not null,
  username text not null unique,
  company_id uuid references public.profiles(id) on delete cascade,
  is_platform_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Função auxiliar SECURITY DEFINER: consulta profiles "por fora" do RLS.
-- Necessária porque a policy abaixo, se consultasse profiles diretamente
-- (como a primeira versão deste script fazia), entra em recursão infinita —
-- a policy de "select" dispara de novo pra avaliar a própria policy. Rodando
-- como SECURITY DEFINER, a função enxerga a tabela sem re-acionar RLS.
create or replace function public.is_platform_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p where p.id = user_id),
    false
  );
$$;

-- Evita duplicar policies se o script rodar de novo.
drop policy if exists "select own profile" on public.profiles;
drop policy if exists "platform admin full access" on public.profiles;
drop policy if exists "company owner manages employees" on public.profiles;
drop policy if exists "self insert own profile" on public.profiles;

-- Qualquer usuário logado consegue ler o PRÓPRIO perfil (necessário pro
-- app saber o nome/tipo de conta/se está ativo depois do login).
create policy "select own profile"
  on public.profiles for select
  using (id = auth.uid());

-- O admin da plataforma (você) enxerga e gerencia todas as contas. Usa a
-- função is_platform_admin() em vez de um "exists (select ... from profiles)"
-- direto na policy — essa era a causa da recursão infinita corrigida ao
-- vivo no SQL Editor; este arquivo agora já reflete o fix.
create policy "platform admin full access"
  on public.profiles for all
  using (public.is_platform_admin(auth.uid()))
  with check (public.is_platform_admin(auth.uid()));

-- Dono de empresa enxerga e gerencia os próprios funcionários
-- (linha cujo company_id aponta pra ele).
create policy "company owner manages employees"
  on public.profiles for all
  using (company_id = auth.uid())
  with check (company_id = auth.uid());

-- Permite que a própria conta recém-criada grave seu perfil uma vez,
-- mas NUNCA como admin da plataforma (isso só é setado manualmente por
-- você, direto no banco, na hora de criar seu próprio acesso).
create policy "self insert own profile"
  on public.profiles for insert
  with check (id = auth.uid() and is_platform_admin = false);

-- 2) Índice auxiliar pra busca por usuário (login).
create index if not exists profiles_username_idx on public.profiles (lower(username));


-- =============================================================================
-- Passo manual (só uma vez): criar o SEU login de admin da plataforma.
-- =============================================================================
-- O app não usa e-mail de verdade pro login — cada "usuário" vira, por
-- baixo dos panos, o e-mail <usuario>@clientes.connecthubpro.app no
-- Supabase Auth. Então escolha o usuário que você vai digitar na tela de
-- login (ex: "robson") e use o e-mail correspondente no passo 1.
--
-- 1. Dashboard -> Authentication -> Users -> "Add user" -> E-mail:
--    robson@clientes.connecthubpro.app (troque "robson" pelo usuário que
--    você quer digitar no login) -> defina uma senha. Deixe "Auto Confirm
--    User" marcado. Crie.
-- 2. Copie o "UID" da linha criada.
-- 3. Rode aqui embaixo, trocando o UID e o nome (o "username" tem que ser
--    exatamente o mesmo que você usou no e-mail do passo 1, sem o
--    "@clientes...."):
--
-- insert into public.profiles (id, account_type, name, username, is_platform_admin)
-- values ('COLE-O-UID-AQUI', 'individual', 'Robson', 'robson', true);
