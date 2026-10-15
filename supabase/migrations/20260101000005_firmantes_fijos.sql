-- ============================================================
-- Migración 005 — Firmantes fijos + contratista por institución
-- Los 2 firmantes fijos aparecen en TODOS los certificados (puestos 1 y 2).
-- El contratista (puesto 3) varía y se asigna a cada institución.
-- Un contratista puede tener varias instituciones.
-- ============================================================

-- ─── Firmantes: marca de fijo y su puesto ────────────────────
alter table public.firmantes
  add column es_fijo    boolean  not null default false,
  add column orden_fijo smallint check (orden_fijo in (1, 2));

alter table public.firmantes
  add constraint firmantes_fijo_coherente
  check (es_fijo = (orden_fijo is not null));

-- Solo un firmante fijo por puesto
create unique index firmantes_orden_fijo_uidx
  on public.firmantes (orden_fijo)
  where es_fijo;

-- ─── Instituciones: contratista asignado ─────────────────────
alter table public.instituciones
  add column contratista_id uuid references public.firmantes(id) on delete restrict;

create index instituciones_contratista_idx
  on public.instituciones (contratista_id);

-- Migrar lo existente: el firmante del puesto 3 pasa a ser el contratista
update public.instituciones i
set contratista_id = f.firmante_id
from public.institucion_firmantes f
where f.institucion_id = i.id and f.orden = 3;

-- Ya no se necesita la asignación por institución
drop table public.institucion_firmantes;
