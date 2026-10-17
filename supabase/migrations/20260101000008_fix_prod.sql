-- ============================================================
-- Migración 008 — Correcciones para producción
-- ============================================================
-- Esta migración puede aplicarse de forma segura en producción
-- aunque las tablas ya existan parcialmente.
-- Solo agrega lo que falta.

-- ─── Extensión pgcrypto (si no existe) ───────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Columna contratista_id en instituciones (si no existe) ─
ALTER TABLE public.instituciones
ADD COLUMN IF NOT EXISTS contratista_id uuid;

-- ─── Columnas es_fijo y orden_fijo en firmantes (si no existen) ─
ALTER TABLE public.firmantes
ADD COLUMN IF NOT EXISTS es_fijo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.firmantes
ADD COLUMN IF NOT EXISTS orden_fijo SMALLINT;

-- ─── Columna codigo_verificacion en estudiantes (si no existe) ─
ALTER TABLE public.estudiantes
ADD COLUMN IF NOT EXISTS codigo_verificacion TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex');

-- ─── Función listar_instituciones_activas (CREATE OR REPLACE) ──
CREATE OR REPLACE FUNCTION public.listar_instituciones_activas()
RETURNS table (id uuid, nombre text, municipio text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.nombre, i.municipio
  FROM public.instituciones i
  WHERE i.activa = true
  ORDER BY i.nombre;
$$;

COMMENT ON FUNCTION public.listar_instituciones_activas() IS
  'Listado mínimo para el formulario público. No expone fechas ni estado interno.';

REVOKE ALL ON FUNCTION public.listar_instituciones_activas() FROM public;
GRANT EXECUTE ON FUNCTION public.listar_instituciones_activas() TO anon, authenticated;

-- ─── Índice para rate limiting (si no existe) ───────────────────
CREATE INDEX IF NOT EXISTS intentos_descarga_ip_hash_creado_en_idx
  ON public.intentos_descarga (ip_hash, creado_en DESC);

-- ─── Trigger para normalizar documentos (CREATE OR REPLACE) ────
CREATE OR REPLACE FUNCTION public.trg_normalizar_numero_documento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.numero_documento := UPPER(REGEXP_REPLACE(COALESCE(NEW.numero_documento, ''), '[^A-Za-z0-9]', '', 'g'));
  NEW.nombre_completo := TRIM(NEW.nombre_completo);
  NEW.tipo_documento := UPPER(TRIM(NEW.tipo_documento));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS estudiantes_normalizar_documento ON public.estudiantes;
CREATE TRIGGER estudiantes_normalizar_documento
  BEFORE INSERT OR UPDATE OF numero_documento, nombre_completo, tipo_documento
  ON public.estudiantes
  FOR EACH ROW
  EXECUTE PROCEDURE public.trg_normalizar_numero_documento();

-- ─── Activar todas las instituciones ───────────────────────────
UPDATE public.instituciones
SET activa = true
WHERE activa = false;
