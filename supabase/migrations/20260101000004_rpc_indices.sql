-- ============================================================
-- Migración 004 — RPC pública, índices y normalización
-- ============================================================

-- ─── Listado público de instituciones activas ────────────────
-- El rol anon no tiene SELECT directo (RLS). Esta función
-- SECURITY DEFINER expone solo id, nombre y municipio.
create or replace function public.listar_instituciones_activas()
returns table (id uuid, nombre text, municipio text)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, i.nombre, i.municipio
  from public.instituciones i
  where i.activa = true
  order by i.nombre;
$$;

comment on function public.listar_instituciones_activas() is
  'Listado mínimo para el formulario público. No expone fechas ni estado interno.';

revoke all on function public.listar_instituciones_activas() from public;
grant execute on function public.listar_instituciones_activas() to anon, authenticated;

-- ─── Índice para rate limiting por IP hasheada ───────────────
create index if not exists intentos_descarga_ip_hash_creado_en_idx
  on public.intentos_descarga (ip_hash, creado_en desc);

-- ─── Normalizar número de documento al insertar/actualizar ───
create or replace function public.trg_normalizar_numero_documento()
returns trigger
language plpgsql
as $$
begin
  new.numero_documento := upper(regexp_replace(coalesce(new.numero_documento, ''), '[^A-Za-z0-9]', '', 'g'));
  new.nombre_completo := trim(new.nombre_completo);
  new.tipo_documento := upper(trim(new.tipo_documento));
  return new;
end;
$$;

drop trigger if exists estudiantes_normalizar_documento on public.estudiantes;
create trigger estudiantes_normalizar_documento
  before insert or update of numero_documento, nombre_completo, tipo_documento
  on public.estudiantes
  for each row
  execute procedure public.trg_normalizar_numero_documento();
