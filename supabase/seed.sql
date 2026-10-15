-- ============================================================
-- Seed — Datos ficticios para desarrollo y pruebas
-- IMPORTANTE: Ningún dato real de personas. Solo inventados.
-- Ejecutar DESPUÉS de las migraciones.
-- ============================================================

-- Limpiar en orden inverso a las FK
truncate table public.intentos_descarga restart identity cascade;
truncate table public.estudiantes         restart identity cascade;
truncate table public.instituciones       restart identity cascade;
truncate table public.firmantes           restart identity cascade;

-- ─── Firmantes ficticios ──────────────────────────────────────
-- Nombres y cargos completamente inventados
-- firma_path apunta a un PNG de marcador de posición (subir manualmente en local)
insert into public.firmantes (id, nombre, cargo, firma_path, es_fijo, orden_fijo)
values
  -- Fijos: aparecen en TODOS los certificados (puestos 1 y 2)
  ('b0000001-0000-0000-0000-000000000001', 'CARLOS ANDRÉS VELÁSQUEZ PARRA',
   'Coordinador Departamental Programa ETV y Zoonosis', 'firmas/placeholder.png', true, 1),
  ('b0000002-0000-0000-0000-000000000002', 'FERNEY AUGUSTO DÍAZ BERTEL',
   'Profesional Especializado Programa ETV y Zoonosis', 'firmas/placeholder.png', true, 2),
  -- Contratistas (variables, puesto 3)
  ('b0000003-0000-0000-0000-000000000003', 'ANA PAOLA RÍOS MARTÍNEZ',
   'Contratista Programa ETV y Zoonosis', 'firmas/placeholder.png', false, null),
  ('b0000004-0000-0000-0000-000000000004', 'EDGAR IVÁN MORALES QUINTERO',
   'Contratista Programa ETV y Zoonosis', 'firmas/placeholder.png', false, null);

-- ─── Instituciones ficticias ──────────────────────────────────
-- Ana Paola dicta en dos instituciones (un contratista puede tener varias)
insert into public.instituciones (id, nombre, municipio, fecha_expedicion, activa, contratista_id)
values
  ('a0000001-0000-0000-0000-000000000001', 'Institución Educativa Simón Bolívar',
   'Montería', '2026-11-15', true, 'b0000003-0000-0000-0000-000000000003'),
  ('a0000002-0000-0000-0000-000000000002', 'Institución Educativa La Esperanza',
   'Cereté', '2026-11-22', true, 'b0000003-0000-0000-0000-000000000003'),
  ('a0000003-0000-0000-0000-000000000003', 'Institución Educativa San José',
   'Lorica', '2026-11-29', true, 'b0000004-0000-0000-0000-000000000004');

-- ─── Estudiantes ficticios ────────────────────────────────────
-- Números de documento inventados; nombres completamente ficticios
insert into public.estudiantes
  (institucion_id, tipo_documento, numero_documento, nombre_completo, codigo_verificacion)
values
  -- IE Simón Bolívar (3 estudiantes)
  (
    'a0000001-0000-0000-0000-000000000001',
    'TI', '1234567890',
    'JUAN CAMILO PÉREZ GÓMEZ',
    'ver-simon-001-dev'
  ),
  (
    'a0000001-0000-0000-0000-000000000001',
    'TI', '0987654321',
    'VALENTINA TORRES RUIZ',
    'ver-simon-002-dev'
  ),
  (
    'a0000001-0000-0000-0000-000000000001',
    'RC', '1122334455',
    'SAMUEL ANDRÉS CASTRO MEJÍA',
    'ver-simon-003-dev'
  ),
  -- IE La Esperanza (2 estudiantes)
  (
    'a0000002-0000-0000-0000-000000000002',
    'TI', '5544332211',
    'ALEJANDRA SOFÍA MENDOZA RÍOS',
    'ver-esper-001-dev'
  ),
  (
    'a0000002-0000-0000-0000-000000000002',
    'CC', '1098765432',
    'MIGUEL ÁNGEL VARGAS ORTIZ',
    'ver-esper-002-dev'
  );

-- ─── Verificación rápida ──────────────────────────────────────
-- Descomenta para confirmar que el seed cargó correctamente:
-- select i.nombre, count(e.id) as estudiantes
-- from public.instituciones i
-- left join public.estudiantes e on e.institucion_id = i.id
-- group by i.nombre;
