-- ============================================================
-- Migración 002 — Row Level Security (RLS)
-- ============================================================
-- Principio: el rol `anon` NO tiene acceso directo a ninguna tabla.
-- El acceso público se canaliza ÚNICAMENTE por la Edge Function
-- (que usa service_role, el cual omite RLS).
-- El panel de admin requiere usuario autenticado con rol = 'admin'.
-- ============================================================

-- ─── Helper: verificar rol admin ─────────────────────────────
-- Lee el claim 'rol' en app_metadata del JWT.
-- Se asigna con: supabase admin update-user <uid> --app-metadata '{"rol":"admin"}'
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'rol') = 'admin',
    false
  );
$$;

comment on function public.es_admin() is
  'Devuelve true si el usuario autenticado tiene app_metadata.rol = ''admin''.';

-- ─── instituciones ────────────────────────────────────────────
alter table public.instituciones enable row level security;

create policy "admins_select_instituciones"
  on public.instituciones for select
  to authenticated
  using (public.es_admin());

create policy "admins_insert_instituciones"
  on public.instituciones for insert
  to authenticated
  with check (public.es_admin());

create policy "admins_update_instituciones"
  on public.instituciones for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "admins_delete_instituciones"
  on public.instituciones for delete
  to authenticated
  using (public.es_admin());

-- ─── firmantes ───────────────────────────────────────────────
alter table public.firmantes enable row level security;

create policy "admins_select_firmantes"
  on public.firmantes for select
  to authenticated
  using (public.es_admin());

create policy "admins_insert_firmantes"
  on public.firmantes for insert
  to authenticated
  with check (public.es_admin());

create policy "admins_update_firmantes"
  on public.firmantes for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "admins_delete_firmantes"
  on public.firmantes for delete
  to authenticated
  using (public.es_admin());

-- ─── institucion_firmantes ────────────────────────────────────
alter table public.institucion_firmantes enable row level security;

create policy "admins_select_inst_firmantes"
  on public.institucion_firmantes for select
  to authenticated
  using (public.es_admin());

create policy "admins_insert_inst_firmantes"
  on public.institucion_firmantes for insert
  to authenticated
  with check (public.es_admin());

create policy "admins_update_inst_firmantes"
  on public.institucion_firmantes for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "admins_delete_inst_firmantes"
  on public.institucion_firmantes for delete
  to authenticated
  using (public.es_admin());

-- ─── estudiantes ─────────────────────────────────────────────
alter table public.estudiantes enable row level security;

create policy "admins_select_estudiantes"
  on public.estudiantes for select
  to authenticated
  using (public.es_admin());

create policy "admins_insert_estudiantes"
  on public.estudiantes for insert
  to authenticated
  with check (public.es_admin());

create policy "admins_update_estudiantes"
  on public.estudiantes for update
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

create policy "admins_delete_estudiantes"
  on public.estudiantes for delete
  to authenticated
  using (public.es_admin());

-- ─── intentos_descarga ───────────────────────────────────────
-- Inserción solo por service_role (Edge Function). Admins pueden leer.
alter table public.intentos_descarga enable row level security;

create policy "admins_select_intentos"
  on public.intentos_descarga for select
  to authenticated
  using (public.es_admin());
