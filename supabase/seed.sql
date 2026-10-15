-- ============================================================
-- Seed — Datos ficticios para desarrollo y pruebas
-- IMPORTANTE: Ningún dato real de personas. Solo inventados.
-- Ejecutar DESPUÉS de las migraciones.
-- ============================================================

-- Limpiar en orden inverso a las FK
truncate table public.intentos_descarga restart identity cascade;
truncate table public.estudiantes         restart identity cascade;
truncate table public.institucion_firmantes restart identity cascade;
truncate table public.firmantes           restart identity cascade;
truncate table public.instituciones       restart identity cascade;

-- ─── Instituciones ficticias ──────────────────────────────────
insert into public.instituciones (id, nombre, municipio, fecha_expedicion, activa)
values
  (
    'a0000001-0000-0000-0000-000000000001',
    'Institución Educativa Simón Bolívar',
    'Montería',
    '2026-11-15',
    true
  ),
  (
    'a0000002-0000-0000-0000-000000000002',
    'Institución Educativa La Esperanza',
    'Cereté',
    '2026-11-22',
    true
  );

-- ─── Firmantes ficticios ──────────────────────────────────────
-- Nombres y cargos completamente inventados
-- firma_path apunta a un PNG de marcador de posición (subir manualmente en local)
insert into public.firmantes (id, nombre, cargo, firma_path)
values
  -- Firmantes de IE Simón Bolívar
  (
    'b0000001-0000-0000-0000-000000000001',
    'ANA PAOLA RÍOS MARTÍNEZ',
    'Contratista Programa ETV y Zoonosis',
    'firmas/placeholder.png'
  ),
  (
    'b0000002-0000-0000-0000-000000000002',
    'CARLOS ANDRÉS VELÁSQUEZ PARRA',
    'Profesional Especializado Programa ETV y Zoonosis',
    'firmas/placeholder.png'
  ),
  (
    'b0000003-0000-0000-0000-000000000003',
    'DIANA MARCELA SOTO HERRERA',
    'Contratista Programa ETV y Zoonosis',
    'firmas/placeholder.png'
  ),
  -- Firmantes de IE La Esperanza
  (
    'b0000004-0000-0000-0000-000000000004',
    'EDGAR IVÁN MORALES QUINTERO',
    'Contratista Programa ETV y Zoonosis',
    'firmas/placeholder.png'
  ),
  (
    'b0000005-0000-0000-0000-000000000005',
    'FERNEY AUGUSTO DÍAZ BERTEL',
    'Profesional Especializado Programa ETV y Zoonosis',
    'firmas/placeholder.png'
  ),
  (
    'b0000006-0000-0000-0000-000000000006',
    'GLORIA PATRICIA SUÁREZ LUNA',
    'Contratista Programa ETV y Zoonosis',
    'firmas/placeholder.png'
  );

-- ─── Asignación institución ↔ firmantes ───────────────────────
insert into public.institucion_firmantes (institucion_id, firmante_id, orden)
values
  -- IE Simón Bolívar: orden 1 izq, 2 centro, 3 derecha
  ('a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 1),
  ('a0000001-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000002', 2),
  ('a0000001-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000003', 3),
  -- IE La Esperanza
  ('a0000002-0000-0000-0000-000000000002', 'b0000004-0000-0000-0000-000000000004', 1),
  ('a0000002-0000-0000-0000-000000000002', 'b0000005-0000-0000-0000-000000000005', 2),
  ('a0000002-0000-0000-0000-000000000002', 'b0000006-0000-0000-0000-000000000006', 3);

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
