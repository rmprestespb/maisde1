-- Suporte a vários números de WhatsApp por cliente.
-- Substitui a coluna única profiles.evolution_instance_name (migração 002)
-- por uma tabela com uma linha por número conectado.

create table if not exists public.client_instances (
  id uuid primary key default gen_random_uuid(),
  -- Sempre o id do perfil "dono" (conta raiz) — nunca o de um funcionário.
  -- No código: profile.company_id ?? profile.id.
  profile_id uuid not null references public.profiles(id) on delete cascade,
  instance_name text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists client_instances_profile_id_idx
  on public.client_instances (profile_id);

alter table public.client_instances enable row level security;

-- Leitura: o próprio dono, qualquer funcionário da mesma empresa (via
-- own_company_id, criada na migração 003) ou um admin da plataforma.
drop policy if exists "select own or company instances" on public.client_instances;
create policy "select own or company instances"
  on public.client_instances for select
  using (
    profile_id = auth.uid()
    or profile_id = public.own_company_id(auth.uid())
    or public.is_platform_admin(auth.uid())
  );

-- Criar/editar/remover número: só o dono da conta (nunca um funcionário)
-- ou um admin da plataforma.
drop policy if exists "manage own instances" on public.client_instances;
create policy "manage own instances"
  on public.client_instances for all
  using (
    profile_id = auth.uid()
    or public.is_platform_admin(auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or public.is_platform_admin(auth.uid())
  );

-- Migra o número único que já existia (migração 002) pra tabela nova, sem
-- duplicar se essa migração for rodada mais de uma vez.
insert into public.client_instances (profile_id, instance_name, label)
select p.id, p.evolution_instance_name, 'WhatsApp 01'
from public.profiles p
where p.username = 'robson'
  and p.evolution_instance_name is not null
  and not exists (
    select 1 from public.client_instances ci
    where ci.instance_name = p.evolution_instance_name
  );
