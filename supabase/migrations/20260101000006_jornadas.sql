-- ============================================================
-- Migración 006 — Jornadas de capacitación
-- Separa contratista/fecha de instituciones → jornadas.
-- Unicidad global de documento (tipo + número).
-- ============================================================

-- ─── 1. Firmantes: campo activo ──────────────────────────────
ALTER TABLE public.firmantes
  ADD COLUMN activo boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.firmantes.activo IS
  'Permite desactivar sin borrar historial de jornadas anteriores.';

-- ─── 2. Jornadas de capacitación ─────────────────────────────
CREATE TABLE public.jornadas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id   uuid        NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  contratista_id   uuid        NOT NULL REFERENCES public.firmantes(id) ON DELETE RESTRICT,
  fecha_expedicion date        NOT NULL,
  activa           boolean     NOT NULL DEFAULT true,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  -- Evita jornadas duplicadas exactas
  UNIQUE (institucion_id, contratista_id, fecha_expedicion)
);

COMMENT ON TABLE public.jornadas IS
  'Cada jornada es una sesión de capacitación: institución + contratista + fecha.';

CREATE INDEX jornadas_institucion_idx ON public.jornadas (institucion_id);
CREATE INDEX jornadas_contratista_idx ON public.jornadas (contratista_id);

-- ─── 3. Estudiantes: nuevos campos ──────────────────────────
ALTER TABLE public.estudiantes
  ADD COLUMN aprobado   boolean NOT NULL DEFAULT true,
  ADD COLUMN jornada_id uuid;

COMMENT ON COLUMN public.estudiantes.aprobado IS
  'Solo los aprobados pueden descargar certificado.';

-- ─── 4. Migrar datos: crear jornadas desde instituciones ────
INSERT INTO public.jornadas (institucion_id, contratista_id, fecha_expedicion)
SELECT id, contratista_id, fecha_expedicion
FROM public.instituciones
WHERE contratista_id IS NOT NULL;

-- ─── 5. Asignar jornada_id a estudiantes existentes ─────────
UPDATE public.estudiantes e
SET jornada_id = j.id
FROM public.jornadas j
WHERE j.institucion_id = e.institucion_id;

-- ─── 6. Eliminar estudiantes huérfanos (sin jornada) ────────
DELETE FROM public.estudiantes WHERE jornada_id IS NULL;

-- ─── 7. Hacer jornada_id NOT NULL y agregar FK ──────────────
ALTER TABLE public.estudiantes
  ALTER COLUMN jornada_id SET NOT NULL;

ALTER TABLE public.estudiantes
  ADD CONSTRAINT estudiantes_jornada_id_fkey
  FOREIGN KEY (jornada_id) REFERENCES public.jornadas(id) ON DELETE CASCADE;

-- ─── 8. Verificar ausencia de documentos duplicados ─────────
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT count(*) INTO dup_count
  FROM (
    SELECT tipo_documento, numero_documento
    FROM public.estudiantes
    GROUP BY tipo_documento, numero_documento
    HAVING count(*) > 1
  ) sub;
  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'Existen % documentos duplicados globalmente. Resuelva antes de continuar.',
      dup_count;
  END IF;
END $$;

-- ─── 9. Reemplazar unicidad por-institución → global ────────
ALTER TABLE public.estudiantes
  DROP CONSTRAINT IF EXISTS estudiantes_institucion_id_tipo_documento_numero_documento_key;

ALTER TABLE public.estudiantes
  ADD CONSTRAINT estudiantes_tipo_numero_unico
  UNIQUE (tipo_documento, numero_documento);

-- ─── 10. Eliminar columna institucion_id de estudiantes ─────
ALTER TABLE public.estudiantes DROP COLUMN institucion_id;

-- ─── 11. Limpiar instituciones (datos ahora en jornadas) ────
ALTER TABLE public.instituciones DROP COLUMN IF EXISTS fecha_expedicion;
ALTER TABLE public.instituciones DROP COLUMN IF EXISTS contratista_id;

-- ─── 12. Índice para búsqueda pública por documento ─────────
CREATE INDEX IF NOT EXISTS estudiantes_tipo_numero_idx
  ON public.estudiantes (tipo_documento, numero_documento);

-- ─── 13. RLS para jornadas ──────────────────────────────────
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_jornadas"
  ON public.jornadas FOR SELECT
  TO authenticated
  USING (public.es_admin());

CREATE POLICY "admins_insert_jornadas"
  ON public.jornadas FOR INSERT
  TO authenticated
  WITH CHECK (public.es_admin());

CREATE POLICY "admins_update_jornadas"
  ON public.jornadas FOR UPDATE
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

CREATE POLICY "admins_delete_jornadas"
  ON public.jornadas FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- ─── 14. Función RPC pública: buscar estudiante ─────────────
-- Reemplaza la necesidad de seleccionar institución.
-- Solo retorna datos mínimos; el PDF se genera en la Edge Function.
CREATE OR REPLACE FUNCTION public.buscar_estudiante_publico(
  p_tipo_documento text,
  p_numero_documento text
)
RETURNS TABLE (encontrado boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true AS encontrado
  FROM public.estudiantes e
  INNER JOIN public.jornadas j ON j.id = e.jornada_id AND j.activa = true
  INNER JOIN public.instituciones i ON i.id = j.institucion_id AND i.activa = true
  WHERE e.tipo_documento   = upper(trim(p_tipo_documento))
    AND e.numero_documento = upper(regexp_replace(
          coalesce(p_numero_documento, ''), '[^A-Za-z0-9]', '', 'g'))
    AND e.aprobado = true
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.buscar_estudiante_publico IS
  'Verifica si un estudiante aprobado existe sin exponer datos personales.';

REVOKE ALL ON FUNCTION public.buscar_estudiante_publico FROM public;
GRANT EXECUTE ON FUNCTION public.buscar_estudiante_publico TO anon, authenticated;
