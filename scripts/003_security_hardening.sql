-- Aplicar no SQL Editor do Supabase antes de publicar esta versão.
-- O backend usa exclusivamente a service role; clientes não acessam tabelas diretamente.

alter table public.triagem_usuarios add column if not exists senha_hash text;
alter table public.triagem_usuarios add column if not exists role text not null default 'operator';
alter table public.triagem_usuarios alter column senha drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'triagem_usuarios_role_check') then
    alter table public.triagem_usuarios add constraint triagem_usuarios_role_check check (role in ('admin', 'operator'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estoque_itens_tipo_unidade_check') then
    alter table public.estoque_itens add constraint estoque_itens_tipo_unidade_check check (tipo_unidade in ('cx', 'kg', 'sc', 'bdj', 'dz', 'un'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'estoque_itens_medidas_check') then
    alter table public.estoque_itens add constraint estoque_itens_medidas_check check (pallet_total >= 0 and lastro >= 0 and tara_kg >= 0 and peso_kg >= 0);
  end if;
end $$;

create index if not exists estoque_contagens_scope_date_updated_idx on public.estoque_contagens (scope, date, updated_at desc);
create index if not exists perdas_ocorrencias_timestamp_idx on public.perdas_ocorrencias (timestamp desc);

alter table public.estoque_itens enable row level security;
alter table public.estoque_contagens enable row level security;
alter table public.perdas_ocorrencias enable row level security;
alter table public.triagem_usuarios enable row level security;

revoke all on public.estoque_itens, public.estoque_contagens, public.perdas_ocorrencias, public.triagem_usuarios from anon, authenticated;
