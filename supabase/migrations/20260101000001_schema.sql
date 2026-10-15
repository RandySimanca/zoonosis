-- ============================================================
-- Migración 001 — Esquema principal
-- Proyecto: Certificados Escuelas Promotoras de Salud 2026
-- ============================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";

-- ─── Instituciones educativas ────────────────────────────────
create table public.instituciones (
  id               uuid        primary key default gen_random_uuid(),
  nombre           text        not null,
  municipio        text        not null,
  fecha_expedicion date        not null,
  activa           boolean     not null default true,
  creado_en        timestamptz not null default now()
);

comment on table public.instituciones is
  'Instituciones educativas participantes en la estrategia EPS 2026.';
comment on column public.instituciones.activa is
  'Solo las activas aparecen en el formulario público.';

-- ─── Firmantes del certificado ───────────────────────────────
create table public.firmantes (
  id         uuid        primary key default gen_random_uuid(),
  nombre     text        not null,
  cargo      text        not null,
  -- Ruta relativa al bucket "firmas" en Supabase Storage
  firma_path text        not null,
  creado_en  timestamptz not null default now()
);

comment on column public.firmantes.firma_path is
  'Ruta dentro del bucket privado "firmas", ej: firmas/ana-rios.png';

-- ─── Asignación institución ↔ firmantes ─────────────────────
create table public.institucion_firmantes (
  institucion_id uuid     not null references public.instituciones(id) on delete cascade,
  firmante_id    uuid     not null references public.firmantes(id)     on delete cascade,
  -- 1 = primero (izquierda), 2 = centro, 3 = derecha en el pie del certificado
  orden          smallint not null check (orden between 1 and 3),
  primary key (institucion_id, firmante_id),
  unique (institucion_id, orden)
);

-- ─── Estudiantes ─────────────────────────────────────────────
create table public.estudiantes (
  id                   uuid        primary key default gen_random_uuid(),
  institucion_id       uuid        not null references public.instituciones(id) on delete cascade,
  tipo_documento       text        not null check (tipo_documento in ('RC','TI','CC','CE','PPT','PEP')),
  -- Normalizado: solo letras y dígitos, sin puntos, comas ni espacios
  numero_documento     text        not null,
  nombre_completo      text        not null,
  -- Token único para verificación (Fase 6); generado automáticamente
  codigo_verificacion  text        not null unique default encode(gen_random_bytes(16), 'hex'),
  creado_en            timestamptz not null default now(),
  unique (institucion_id, tipo_documento, numero_documento)
);

comment on column public.estudiantes.numero_documento is
  'Almacenado normalizado: sin puntos, comas ni espacios. Solo [A-Z0-9].';
comment on column public.estudiantes.codigo_verificacion is
  'Hexadecimal de 32 caracteres. Usado en la Fase 6 para verificar autenticidad del certificado.';

-- ─── Intentos de descarga (auditoría / rate limiting) ────────
create table public.intentos_descarga (
  id         uuid        primary key default gen_random_uuid(),
  -- SHA-256 de la IP del cliente; nunca se guarda la IP en claro (Ley 1581/2012)
  ip_hash    text        not null,
  creado_en  timestamptz not null default now(),
  exitoso    boolean     not null
);

comment on column public.intentos_descarga.ip_hash is
  'SHA-256 de la IP real. Permite rate-limiting sin almacenar datos personales.';
