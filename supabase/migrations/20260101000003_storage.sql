-- ============================================================
-- Migración 003 — Storage: buckets privados y políticas
-- ============================================================

-- ─── Buckets privados ─────────────────────────────────────────
-- public = false → nunca se sirven archivos sin autorización
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'plantillas',
    'plantillas',
    false,
    10485760,  -- 10 MB
    array['image/png', 'image/jpeg', 'application/pdf']
  ),
  (
    'firmas',
    'firmas',
    false,
    2097152,   -- 2 MB
    array['image/png', 'image/jpeg']
  )
on conflict (id) do nothing;

-- ─── Políticas de Storage ─────────────────────────────────────
-- Solo admins pueden subir, leer y borrar en estos buckets.
-- La Edge Function usa service_role y omite estas políticas.

create policy "admins_all_plantillas"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'plantillas'
    and public.es_admin()
  )
  with check (
    bucket_id = 'plantillas'
    and public.es_admin()
  );

create policy "admins_all_firmas"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'firmas'
    and public.es_admin()
  )
  with check (
    bucket_id = 'firmas'
    and public.es_admin()
  );
