-- ============================================================
-- Seed — Datos ficticios para desarrollo y pruebas
-- IMPORTANTE: Ningún dato real de personas. Solo inventados.
-- Ejecutar DESPUÉS de las migraciones (incluida 006).
-- ============================================================

-- Limpiar en orden inverso a las FK
TRUNCATE TABLE public.intentos_descarga RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.estudiantes       RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.jornadas          RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.instituciones     RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.firmantes         RESTART IDENTITY CASCADE;

-- ─── Firmantes ficticios ──────────────────────────────────────
-- Nombres reales para los fijos según el requerimiento.
-- Contratistas son ficticios.
INSERT INTO public.firmantes (id, nombre, cargo, firma_path, es_fijo, orden_fijo, activo)
VALUES
  -- Fijos: aparecen en TODOS los certificados (puestos 1 y 2)
  ('b0000001-0000-0000-0000-000000000001', 'MARCO TÁMARA BURGOS',
   'Coordinador Departamental, Programa ETV y Zoonosis', 'firmas/placeholder.png', true, 1, true),
  ('b0000002-0000-0000-0000-000000000002', 'LINA HERNÁNDEZ BARROS',
   'Profesional Especializado, Programa ETV y Zoonosis', 'firmas/placeholder.png', true, 2, true),
  -- Contratistas (variables, puesto 3)
  ('b0000003-0000-0000-0000-000000000003', 'ANA PAOLA RÍOS MARTÍNEZ',
   'Contratista Programa ETV y Zoonosis', 'firmas/placeholder.png', false, null, true),
  ('b0000004-0000-0000-0000-000000000004', 'EDGAR IVÁN MORALES QUINTERO',
   'Contratista Programa ETV y Zoonosis', 'firmas/placeholder.png', false, null, true);

-- ─── Instituciones ficticias ──────────────────────────────────
INSERT INTO public.instituciones (id, nombre, municipio, activa)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Institución Educativa Simón Bolívar',
   'Montería', true),
  ('a0000002-0000-0000-0000-000000000002', 'Institución Educativa La Esperanza',
   'Cereté', true),
  ('a0000003-0000-0000-0000-000000000003', 'Institución Educativa San José',
   'Lorica', true);

-- ─── Jornadas de capacitación ─────────────────────────────────
-- Ana Paola dicta en Simón Bolívar (2 jornadas, distintas fechas) y en La Esperanza
-- Edgar dicta en San José
INSERT INTO public.jornadas (id, institucion_id, contratista_id, fecha_expedicion, activa)
VALUES
  ('c0000001-0000-0000-0000-000000000001',
   'a0000001-0000-0000-0000-000000000001',
   'b0000003-0000-0000-0000-000000000003',
   '2026-11-15', true),
  ('c0000002-0000-0000-0000-000000000002',
   'a0000001-0000-0000-0000-000000000001',
   'b0000003-0000-0000-0000-000000000003',
   '2026-12-10', true),
  ('c0000003-0000-0000-0000-000000000003',
   'a0000002-0000-0000-0000-000000000002',
   'b0000003-0000-0000-0000-000000000003',
   '2026-11-22', true),
  ('c0000004-0000-0000-0000-000000000004',
   'a0000003-0000-0000-0000-000000000003',
   'b0000004-0000-0000-0000-000000000004',
   '2026-11-29', true);

-- ─── Estudiantes ficticios ────────────────────────────────────
-- Números de documento inventados; nombres completamente ficticios
-- Unicidad global: cada documento aparece UNA sola vez
INSERT INTO public.estudiantes
  (jornada_id, tipo_documento, numero_documento, nombre_completo, aprobado, codigo_verificacion)
VALUES
  -- Jornada 1: IE Simón Bolívar, 15 nov (Ana Paola)
  ('c0000001-0000-0000-0000-000000000001',
   'TI', '1234567890', 'JUAN CAMILO PÉREZ GÓMEZ', true, 'ver-simon-001-dev'),
  ('c0000001-0000-0000-0000-000000000001',
   'TI', '0987654321', 'VALENTINA TORRES RUIZ', true, 'ver-simon-002-dev'),
  ('c0000001-0000-0000-0000-000000000001',
   'RC', '1122334455', 'SAMUEL ANDRÉS CASTRO MEJÍA', true, 'ver-simon-003-dev'),
  -- Jornada 2: IE Simón Bolívar, 10 dic (Ana Paola)
  ('c0000002-0000-0000-0000-000000000002',
   'TI', '5566778899', 'LAURA MARCELA DÍAZ ROJAS', true, 'ver-simon-004-dev'),
  -- Jornada 3: IE La Esperanza (Ana Paola)
  ('c0000003-0000-0000-0000-000000000003',
   'TI', '5544332211', 'ALEJANDRA SOFÍA MENDOZA RÍOS', true, 'ver-esper-001-dev'),
  ('c0000003-0000-0000-0000-000000000003',
   'CC', '1098765432', 'MIGUEL ÁNGEL VARGAS ORTIZ', true, 'ver-esper-002-dev');

-- ─── Verificación rápida ──────────────────────────────────────
-- Descomenta para confirmar:
-- SELECT j.id, i.nombre, f.nombre AS contratista, j.fecha_expedicion, count(e.id)
-- FROM public.jornadas j
-- JOIN public.instituciones i ON i.id = j.institucion_id
-- JOIN public.firmantes f ON f.id = j.contratista_id
-- LEFT JOIN public.estudiantes e ON e.jornada_id = j.id
-- GROUP BY j.id, i.nombre, f.nombre, j.fecha_expedicion;
