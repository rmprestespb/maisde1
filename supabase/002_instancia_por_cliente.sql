-- Connect Hub Pro — cada cliente com seu próprio número (instância da
-- Evolution API por cliente, em vez da única instância global fixa).
--
-- Como rodar: Supabase Dashboard -> SQL Editor -> New query -> cole tudo
-- isso -> Run. Idempotente (usa "if not exists").

alter table public.profiles
  add column if not exists evolution_instance_name text unique;

comment on column public.profiles.evolution_instance_name is
  'Nome da instância da Evolution API conectada a este cliente. Só é usado '
  'na conta "raiz" (company_id is null — individual ou dono de empresa). '
  'Contas do tipo empresa_employee usam a instância da PRÓPRIA EMPRESA '
  '(via profiles.company_id), nunca teriam esse campo preenchido.';

-- Backfill: a conta raiz do Robson (a única que existe até hoje) continua
-- usando a instância "connecthubpro" que já está configurada no servidor —
-- sem isso, o primeiro login dele depois dessa migração ficaria sem
-- instância associada. Troque 'robson' abaixo se o username de admin for
-- outro.
update public.profiles
set evolution_instance_name = 'connecthubpro'
where username = 'robson' and evolution_instance_name is null;
