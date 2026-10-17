# Configuración de Variables de Entorno en Vercel

Para que el proyecto funcione correctamente en Vercel, debes configurar las siguientes variables de entorno.

## ⚠️ IMPORTANTE: Primero Aplicar las Migraciones

Antes de configurar las variables en Vercel, asegúrate de aplicar las migraciones de la base de datos en Supabase producción.

### Pasos para Aplicar Migraciones:

1. **Enlazar tu proyecto local con Supabase producción**:
   ```bash
   supabase link --project-ref <PROJECT_REF>
   ```
   El `PROJECT_REF` lo encuentras en el dashboard de Supabase → Settings → General

2. **Aplicar todas las migraciones**:
   ```bash
   supabase db push
   ```

3. **Verificar que las migraciones se aplicaron**:
   - Ve al dashboard de Supabase
   - Database → Migrations
   - Deberías ver todas las migraciones (001-007)

Si no aplicas las migraciones, verás errores como:
- "Could not find the function public.listar_instituciones_activas"
- "No se pudieron cargar las instituciones"



## Variables de Entorno Requeridas

### Variables del Frontend (VITE_)

Estas variables se configuran en el dashboard de Vercel en la sección **Settings → Environment Variables**:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase | `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Clave anon/public de Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_TURNSTILE_SITE_KEY` | Site key de Cloudflare Turnstile (opcional) | `0x4AAAAAAAA...` |

### Cómo obtener los valores:

1. **VITE_SUPABASE_URL**:
   - Ve al dashboard de Supabase
   - Settings → API → Project URL
   - Copia la URL

2. **VITE_SUPABASE_ANON_KEY**:
   - Ve al dashboard de Supabase
   - Settings → API → anon public
   - Copia la clave

3. **VITE_TURNSTILE_SITE_KEY** (opcional):
   - Ve al dashboard de Cloudflare Turnstile
   - Crea un nuevo site key
   - Copia la site key

## Pasos para Configurar en Vercel

1. Ingresa al dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a **Settings → Environment Variables**
4. Agrega cada variable:
   - **Key**: `VITE_SUPABASE_URL`
   - **Value**: tu URL de Supabase
   - **Environment**: Production, Preview, Development (todas)
5. Repite para `VITE_SUPABASE_ANON_KEY`
6. Repite para `VITE_TURNSTILE_SITE_KEY` (si usas CAPTCHA)
7. Haz clic en **Save**
8. **Importante**: Haz un nuevo deploy para que las variables se apliquen

## Edge Functions Variables

Para las Edge Functions de Supabase, configura los secretos con:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=0x4AAAAAAAA...
supabase secrets set CORS_ORIGIN=https://zoonosis-nine.vercel.app
```

## Verificación

Después de configurar las variables:

1. Haz un nuevo deploy en Vercel
2. Abre la consola del navegador (F12)
3. Ve a la página principal
4. Deberías ver en la consola:
   ```
   Supabase URL: https://xxxxxxxxxxxxxxxxxxxx.supabase.co
   Iniciando carga de instituciones...
   Instituciones cargadas: X
   ```

Si ves `undefined` en Supabase URL, las variables no están configuradas correctamente.

## Problemas Comunes

### Error: "No se pudieron cargar las instituciones"

**Causa**: Las variables de entorno no están configuradas o son incorrectas.

**Solución**:
1. Verifica que las variables estén configuradas en Vercel
2. Verifica que los valores sean correctos
3. Haz un nuevo deploy
4. Revisa la consola del navegador para ver el error detallado

### Error: "No hay instituciones activas disponibles"

**Causa**: Las instituciones existen pero están con `activa = false` en la base de datos.

**Solución**:
1. Ingresa al panel de administración
2. Ve a Instituciones
3. Haz clic en "Activar todas"
4. O aplica la migración: `supabase db push`

### Cloudflare Turnstile Error 110200

**Causa**: La site key de Turnstile no está configurada o es incorrecta.

**Solución**:
1. Verifica que `VITE_TURNSTILE_SITE_KEY` esté configurada en Vercel
2. Verifica que la site key sea correcta
3. Si no necesitas CAPTCHA, puedes quitar el componente TurnstileWidget

## Debugging

Para ver si las variables están configuradas:

```javascript
// En la consola del navegador
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...')
```

Si ves `undefined`, las variables no están configuradas en Vercel.
