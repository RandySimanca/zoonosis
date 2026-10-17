-- ============================================================
-- Migración 007 — Activar todas las instituciones existentes
-- ============================================================
-- Esta migración asegura que todas las instituciones estén activas
-- para que aparezcan en el formulario público.

update public.instituciones
set activa = true
where activa = false;
