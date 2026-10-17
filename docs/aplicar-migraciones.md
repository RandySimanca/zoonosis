# Aplicar Migraciones en Supabase Producción

Este es el paso más importante para que el proyecto funcione en producción.

## 🎯 Problema Actual

Si ves el error:
```
Could not find the function public.listar_instituciones_activas without parameters in the schema cache
```

Significa que **las migraciones no se han aplicado en Supabase producción**. La base de datos de producción está vacía o incompleta.

Si ves el error:
```
ERROR: 42P07: relation "instituciones" already exists
```

Significa que las tablas ya existen pero las migraciones están parciales. Ve a [Resolver Migraciones Parciales](./resolver-migraciones-parciales.md).

## 📋 Pasos para Solucionar

### Paso 1: Obtener el Project Reference

1. Ingresa al dashboard de Supabase: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings → General**
4. Copia el **Project Reference** (es algo como `abc123xyz456`)

### Paso 2: Enlazar el Proyecto Local

En tu terminal, ejecuta:

```bash
supabase link --project-ref <PROJECT_REF>
```

Reemplaza `<PROJECT_REF>` con el valor que copiaste.

Ejemplo:
```bash
supabase link --project-ref abc123xyz456
```

Si te pide confirmación, responde `y`.

### Paso 3: Aplicar las Migraciones

Una vez enlazado, ejecuta:

```bash
supabase db push
```

Este comando:
- Lee todas las migraciones de `supabase/migrations/`
- Las aplica en orden (001, 002, 003, etc.)
- Crea todas las tablas, funciones y configuraciones

Deberías ver algo como:
```
Applying migration 20260101000001_schema.sql...
Applying migration 20260101000002_rls.sql...
Applying migration 20260101000003_storage.sql...
Applying migration 20260101000004_rpc_indices.sql...
Applying migration 20260101000005_firmantes_fijos.sql...
Applying migration 20260101000006_jornadas.sql...
Applying migration 20260101000007_activar_instituciones.sql...
Finished supabase db push.
```

### Paso 4: Verificar en el Dashboard

1. Ve al dashboard de Supabase
2. Database → Migrations
3. Deberías ver las 7 migraciones aplicadas:
   - 20260101000001_schema.sql
   - 20260101000002_rls.sql
   - 20260101000003_storage.sql
   - 20260101000004_rpc_indices.sql
   - 20260101000005_firmantes_fijos.sql
   - 20260101000006_jornadas.sql
   - 20260101000007_activar_instituciones.sql

### Paso 5: Verificar las Tablas

1. En el dashboard de Supabase
2. Database → Table Editor
3. Deberías ver las tablas:
   - instituciones
   - firmantes
   - institucion_firmantes
   - estudiantes
   - intentos_descarga

### Paso 6: Crear el Usuario Admin

Después de aplicar las migraciones, crea el usuario administrador:

```bash
supabase auth admin create-user \
  --email admin@salud-cordoba.gov.co \
  --password "TuContraseñaSegura2026!" \
  --app-metadata '{"rol":"admin"}'
```

Reemplaza el email y contraseña con los que desees.

## 🔧 Si `supabase link` Falla

Si ya tienes un proyecto enlazado, puedes verificar el enlace actual:

```bash
supabase status
```

Si ya está enlazado con el proyecto correcto, solo necesitas ejecutar:

```bash
supabase db push
```

Si está enlazado con el proyecto incorrecto, primero desenlaza:

```bash
supabase unlink
```

Luego enlaza con el proyecto correcto:

```bash
supabase link --project-ref <PROJECT_REF_CORRECTO>
```

## 📝 Resumen de Migraciones

| Migración | Descripción |
|-----------|-------------|
| 001 | Esquema principal (tablas) |
| 002 | Row Level Security (RLS) |
| 003 | Storage buckets (firmas) |
| 004 | RPC pública, índices, triggers |
| 005 | Firmantes fijos |
| 006 | Jornadas |
| 007 | Activar instituciones existentes |

## ✅ Verificación Final

Después de aplicar las migraciones:

1. **Verifica la función RPC**:
   - En el dashboard de Supabase
   - Database → SQL Editor
   - Ejecuta: `SELECT * FROM public.listar_instituciones_activas();`
   - Debería devolver resultados (vacío si no hay instituciones)

2. **Verifica las instituciones**:
   - Ve a Table Editor → instituciones
   - Si hay datos, deberían estar con `activa = true` (gracias a la migración 007)

3. **Prueba la aplicación**:
   - Abre https://zoonosis-nine.vercel.app/
   - Las instituciones deberían cargar
   - Si no hay instituciones, ingresa al panel admin y agrégalas

## 🚨 Problemas Comunes

### Error: "Project not found"

**Causa**: El Project Reference es incorrecto.

**Solución**: Verifica que el Project Reference sea correcto en el dashboard de Supabase.

### Error: "Migration already applied"

**Causa**: La migración ya se aplicó anteriormente.

**Solución**: Esto es normal, Supabase la saltará automáticamente.

### Error: "Permission denied"

**Causa**: No tienes permisos en el proyecto de Supabase.

**Solución**: Verifica que seas el owner del proyecto o tengas permisos de administrador.

## 📚 Documentación Adicional

- [Supabase CLI - Migrations](https://supabase.com/docs/guides/cli/local-development#managing-migrations)
- [Guía de configuración Vercel](./vercel-config.md)
