# Certificados Escuelas Promotoras de Salud 2026

Plataforma web para la generación y descarga de **Certificados de Participación** de la estrategia *Escuelas Promotoras de Salud 2026* — Secretaría de Salud Departamental de Córdoba, Programa ETV y Zoonosis.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + Vite + Vue Router + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Generación PDF | `pdf-lib` (Deno / Edge Function) |
| Importación Excel/CSV | SheetJS `xlsx` |
| CAPTCHA | Cloudflare Turnstile |
| Pruebas | Vitest |

---

## Prerrequisitos

| Herramienta | Versión mínima | Instalación |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| Supabase CLI | 1.200+ | `npm i -g supabase` |
| Docker Desktop | 4.x | https://www.docker.com/products/docker-desktop (requerido por Supabase local) |
| Git | — | https://git-scm.com |

> **Windows**: asegúrate de que Docker Desktop esté corriendo antes de ejecutar `supabase start`.

---

## 1. Instalación

```bash
# Clona el repositorio
git clone <URL_DEL_REPO>
cd certificados_zoonosis

# Instala dependencias del frontend
npm install
```

---

## 2. Variables de entorno

```bash
# Copia la plantilla
cp .env.example .env
```

Edita `.env` con los valores de tu proyecto Supabase (ver paso 3).

---

## 3. Supabase local (desarrollo)

```bash
# Inicia los contenedores de Supabase
supabase start
```

Al terminar, la CLI imprimirá algo como:

```
API URL: http://127.0.0.1:54321
anon key: eyJhbGci...
service_role key: eyJhbGci...
Studio URL: http://127.0.0.1:54323
```

Copia `API URL` y `anon key` en tu `.env`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### Aplicar migraciones

```bash
supabase db reset
# Esto aplica todas las migraciones EN ORDEN y luego ejecuta seed.sql automáticamente.
```

> `db reset` borra la base de datos local y la recrea desde cero. Úsalo en desarrollo.
> En producción usa `supabase db push`.

### Verificar en Studio

Abre http://127.0.0.1:54323 → **Table Editor** → verifica que existan las tablas
`instituciones`, `firmantes`, `institucion_firmantes`, `estudiantes`, `intentos_descarga`
con los datos ficticios del seed.

---

## 4. Crear el usuario administrador

La plataforma **no permite registro público**. El admin se crea manualmente:

```bash
# Reemplaza con el correo y contraseña que desees
supabase auth admin create-user \
  --email admin@salud-cordoba.gov.co \
  --password "Contraseña-Segura-2026!" \
  --app-metadata '{"rol":"admin"}'
```

> El claim `rol: admin` es lo que verifica la función `es_admin()` en RLS.

---

## 5. Secretos de las Edge Functions

Las Edge Functions leen variables sensibles con `Deno.env.get()`.
Para desarrollo local, crea el archivo (no se sube al repo):

```bash
# supabase/functions/.env   ← este archivo está en .gitignore
TURNSTILE_SECRET_KEY=0x4AAAAAAAA...
CORS_ORIGIN=http://127.0.0.1:5173
```

Para producción:

```bash
supabase secrets set TURNSTILE_SECRET_KEY=0x4AAAAAAAA...
supabase secrets set CORS_ORIGIN=https://tudominio.com
```

---

## 6. Servidor de desarrollo

```bash
npm run dev
# Abre http://localhost:5173
```

---

## 7. Estructura del proyecto

```
certificados_zoonosis/
├── src/
│   ├── assets/
│   │   └── main.css              # CSS global + utilidades Tailwind
│   ├── lib/
│   │   └── supabase.ts           # Cliente Supabase singleton
│   ├── router/
│   │   └── index.ts              # Vue Router + guard de autenticación
│   ├── types/
│   │   └── database.ts           # Tipos TypeScript del esquema DB
│   ├── views/
│   │   ├── InicioView.vue
│   │   ├── AdminLoginView.vue
│   │   └── admin/                # CRUD instituciones, firmantes, estudiantes
│   ├── App.vue
│   └── main.ts
├── supabase/
│   ├── config.toml               # Configuración Supabase local
│   ├── seed.sql                  # Datos ficticios para desarrollo
│   ├── migrations/
│   │   ├── 20260101000001_schema.sql   # Tablas y constraints
│   │   ├── 20260101000002_rls.sql      # Row Level Security
│   │   ├── 20260101000003_storage.sql  # Buckets privados
│   │   └── 20260101000004_rpc_indices.sql
│   └── functions/
│       └── _shared/
│           └── cors.ts           # Cabeceras CORS compartidas
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

---

## 8. Pruebas

```bash
# Ejecutar suite de pruebas (Vitest)
npm test
```

Cubre normalización de documentos e importación de filas Excel.

---

## 9. Fases del proyecto

| Fase | Estado | Descripción |
|---|---|---|
| **1 — Base** | ✅ Completada | Estructura, migraciones, RLS, seed, README |
| **2 — PDF** | ✅ Completada | Edge Function `generar-certificado` |
| **3 — Página pública** | ✅ Completada | Formulario con Turnstile |
| **4 — Panel admin** | ✅ Completada | CRUD + importación Excel |
| **5 — Endurecimiento** | ✅ Completada | Rate limiting, cabeceras seguridad, pruebas |
| **6 — Verificación** | 🔲 Opcional | QR + página `/verificar/:codigo` |

---

## 10. Despliegue en producción

```bash
# Enlazar con el proyecto Supabase en la nube
supabase link --project-ref <PROJECT_REF>

# Aplicar migraciones en producción
supabase db push

# Desplegar Edge Functions
supabase functions deploy generar-certificado

# Build del frontend
npm run build
# Subir la carpeta dist/ a tu hosting (Netlify, Vercel, etc.)
```

---

## Consideraciones legales

- **Ley 1581 de 2012 (Colombia)**: el sistema almacena datos de posibles menores de edad.
  - Las IPs nunca se guardan en claro; se almacena su hash SHA-256.
  - El formulario público no muestra listados de estudiantes.
  - El certificado solo se entrega al titular que conoce su número de documento.
- El campo `activa` en `instituciones` permite desactivar una institución sin borrar datos.
