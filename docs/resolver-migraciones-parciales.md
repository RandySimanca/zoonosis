# Resolver Migraciones Parciales (Tablas Ya Existen)

Si recibes el error:
```
ERROR: 42P07: relation "instituciones" already exists
```

Significa que algunas tablas ya existen en la base de datos, pero las migraciones no se aplicaron completamente.

## 🔍 Diagnóstico

Ejecuta este comando para ver qué existe:

```bash
supabase db diff --use-migra
```

O en el dashboard de Supabase:
- Database → SQL Editor
- Ejecuta:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Y para funciones:
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

## 📋 Soluciones

### Opción 1: Eliminar Todo y Empezar desde Cero (Solo si NO hay datos importantes)

⚠️ **ADVERTENCIA**: Esto borra TODOS los datos de la base de datos.

```bash
# 1. Eliminar todas las tablas y funciones
# En el dashboard de Supabase → SQL Editor, ejecuta:

DROP TABLE IF EXISTS public.estudiantes CASCADE;
DROP TABLE IF EXISTS public.institucion_firmantes CASCADE;
DROP TABLE IF EXISTS public.firmantes CASCADE;
DROP TABLE IF EXISTS public.instituciones CASCADE;
DROP TABLE IF EXISTS public.intentos_descarga CASCADE;

DROP FUNCTION IF EXISTS public.listar_instituciones_activas CASCADE;
DROP FUNCTION IF EXISTS public.trg_normalizar_numero_documento CASCADE;

DROP EXTENSION IF EXISTS "pgcrypto";

# 2. Luego aplicar las migraciones
supabase db push
```

### Opción 2: Aplicar Migraciones Individualmente (Recomendado si hay datos)

Si ya tienes datos que quieres conservar, aplica las migraciones una por una, verificando si ya existen.

#### Migración 001 - Schema
Si las tablas ya existen, salta esta:
```bash
# Verificar si la tabla estudiantes tiene las columnas correctas
```

En SQL Editor, ejecuta:
```sql
-- Verificar columnas de instituciones
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'instituciones' AND table_schema = 'public'
ORDER BY ordinal_position;
```

Si la columna `contratista_id` no existe, agrégala:
```sql
ALTER TABLE public.instituciones ADD COLUMN IF NOT EXISTS contratista_id uuid;
```

#### Migración 004 - RPC e Índices (La más importante)

Esta es la que probablemente falta. Ejecuta en SQL Editor:

```sql
-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Listado público de instituciones activas ────────────────
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

-- ─── Índice para rate limiting por IP hasheada ───────────────
CREATE INDEX IF NOT EXISTS intentos_descarga_ip_hash_creado_en_idx
  ON public.intentos_descarga (ip_hash, creado_en DESC);

-- ─── Normalizar número de documento al insertar/actualizar ───
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
```

#### Migración 005 - Firmantes Fijos

Verificar si la columna `es_fijo` existe en `firmantes`:
```sql
ALTER TABLE public.firmantes ADD COLUMN IF NOT EXISTS es_fijo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.firmantes ADD COLUMN IF NOT EXISTS orden_fijo SMALLINT;
```

#### Migración 006 - Jornadas

Verificar si la tabla `jornadas` existe (si la usas):
```sql
-- Si necesitas la tabla de jornadas
CREATE TABLE IF NOT EXISTS public.jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id uuid NOT NULL REFERENCES public.instituciones(id) ON DELETE CASCADE,
  contratista_id uuid NOT NULL REFERENCES public.firmantes(id) ON DELETE CASCADE,
  fecha_expedicion date NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);
```

#### Migración 007 - Activar Instituciones

```sql
UPDATE public.instituciones
SET activa = true
WHERE activa = false;
```

### Opción 3: Usar Supabase Studio para Verificar

1. Entra al dashboard de Supabase
2. Database → Table Editor
3. Verifica cada tabla:
   - **instituciones**: ¿Tiene columna `contratista_id`?
   - **firmantes**: ¿Tiene columnas `es_fijo` y `orden_fijo`?
   - **estudiantes**: ¿Tiene columna `codigo_verificacion`?

4. Database → Functions
   - ¿Existe `listar_instituciones_activas`?

5. Database → SQL Editor
   - Ejecuta `SELECT * FROM public.listar_instituciones_activas();`
   - Si da error, crea la función (ver Opción 2)

## ✅ Verificación Final

Después de aplicar las correcciones:

1. **Verificar la función RPC**:
```sql
SELECT * FROM public.listar_instituciones_activas();
```
Debería devolver resultados (vacío si no hay instituciones).

2. **Verificar las columnas**:
```sql
-- Para instituciones
SELECT column_name FROM information_schema.columns
WHERE table_name = 'instituciones' AND table_schema = 'public';

-- Para firmantes
SELECT column_name FROM information_schema.columns
WHERE table_name = 'firmantes' AND table_schema = 'public';
```

3. **Probar la aplicación**:
   - Abre https://zoonosis-nine.vercel.app/
   - Las instituciones deberían cargar ahora

## 🎯 Solución Rápida (La más recomendada)

Si no tienes datos importantes en producción y quieres empezar limpio:

1. En el dashboard de Supabase → Database → SQL Editor
2. Ejecuta:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

3. Luego en tu terminal:
```bash
supabase db push
```

Esto recrea todo el esquema desde cero con las migraciones correctas.

## 📞 Si Ninguna Funciona

Si después de intentar estas soluciones sigue sin funcionar:

1. Verifica el estado del enlace:
```bash
supabase status
```

2. Si el enlace es incorrecto, desenlaza y vuelve a enlazar:
```bash
supabase unlink
supabase link --project-ref <PROJECT_REF>
supabase db push
```

3. Contacta a soporte de Supabase si hay problemas con el proyecto.
