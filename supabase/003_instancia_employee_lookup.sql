-- Connect Hub Pro — permite que uma conta do tipo empresa_employee enxergue
-- (só leitura, via RLS) o perfil do DONO da empresa (profiles.company_id) —
-- é lá que evolution_instance_name fica guardado de verdade. Sem isso, o
-- app não consegue descobrir qual número da Evolution API usar pra um
-- funcionário: a policy "select own profile" (001) só deixa cada um ler a
-- própria linha, e funcionário não tem o campo evolution_instance_name
-- preenchido no próprio perfil (só a conta raiz/dona tem).
--
-- Como rodar: igual aos scripts anteriores — Supabase Dashboard -> SQL
-- Editor -> New query -> cole tudo isso -> Run. Idempotente.

-- Função auxiliar SECURITY DEFINER (mesmo padrão de is_platform_admin, em
-- 001_accounts.sql): precisa rodar "por fora" do RLS pra consultar o próprio
-- company_id do usuário sem entrar em recursão com a policy que ela mesma
-- alimenta.
create or replace function public.own_company_id(user_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select p.company_id from public.profiles p where p.id = user_id;
$$;

drop policy if exists "employee reads own company owner profile" on public.profiles;

-- Deixa o funcionário ler (só select) a linha do DONO da própria empresa —
-- ou seja, a linha cujo id é igual ao company_id do funcionário logado.
-- Conta raiz (company_id null) não ganha acesso extra nenhum com isso.
create policy "employee reads own company owner profile"
  on public.profiles for select
  using (id = public.own_company_id(auth.uid()));
