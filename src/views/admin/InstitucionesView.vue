<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Firmante, Institucion } from '@/types/database'

const lista = ref<Institucion[]>([])
const firmantes = ref<Firmante[]>([])
const asignaciones = ref<Record<string, { 1?: string; 2?: string; 3?: string }>>({})
const error = ref('')
const ok = ref('')
const modal = ref(false)
const guardando = ref(false)
const editandoId = ref<string | null>(null)

const form = reactive({
  nombre: '',
  municipio: '',
  fecha_expedicion: '',
  activa: true,
  firmante1: '',
  firmante2: '',
  firmante3: '',
})

async function cargar(): Promise<void> {
  error.value = ''
  const [i, f, a] = await Promise.all([
    supabase.from('instituciones').select('*').order('nombre'),
    supabase.from('firmantes').select('*').order('nombre'),
    supabase.from('institucion_firmantes').select('*'),
  ])
  if (i.error || f.error || a.error) {
    error.value = 'No se pudieron cargar las instituciones.'
    return
  }
  lista.value = i.data ?? []
  firmantes.value = f.data ?? []
  const map: Record<string, { 1?: string; 2?: string; 3?: string }> = {}
  for (const row of a.data ?? []) {
    if (!map[row.institucion_id]) map[row.institucion_id] = {}
    map[row.institucion_id][row.orden] = row.firmante_id
  }
  asignaciones.value = map
}

onMounted(cargar)

function abrirNueva(): void {
  editandoId.value = null
  form.nombre = ''
  form.municipio = ''
  form.fecha_expedicion = ''
  form.activa = true
  form.firmante1 = ''
  form.firmante2 = ''
  form.firmante3 = ''
  modal.value = true
}

function abrirEditar(inst: Institucion): void {
  editandoId.value = inst.id
  form.nombre = inst.nombre
  form.municipio = inst.municipio
  form.fecha_expedicion = inst.fecha_expedicion
  form.activa = inst.activa
  const as = asignaciones.value[inst.id] ?? {}
  form.firmante1 = as[1] ?? ''
  form.firmante2 = as[2] ?? ''
  form.firmante3 = as[3] ?? ''
  modal.value = true
}

async function guardar(): Promise<void> {
  error.value = ''
  ok.value = ''
  const ids = [form.firmante1, form.firmante2, form.firmante3].filter(Boolean)
  if (new Set(ids).size !== ids.length) {
    error.value = 'Cada firmante solo puede ocupar un puesto.'
    return
  }
  guardando.value = true
  try {
    const payload = {
      nombre: form.nombre.trim(),
      municipio: form.municipio.trim(),
      fecha_expedicion: form.fecha_expedicion,
      activa: form.activa,
    }
    let institucionId = editandoId.value
    if (institucionId) {
      const { error: e } = await supabase.from('instituciones').update(payload).eq('id', institucionId)
      if (e) throw e
    } else {
      const { data, error: e } = await supabase.from('instituciones').insert(payload).select('id').single()
      if (e || !data) throw e ?? new Error('Sin id')
      institucionId = data.id
    }

    await supabase.from('institucion_firmantes').delete().eq('institucion_id', institucionId)
    const filas = [
      form.firmante1 ? { institucion_id: institucionId, firmante_id: form.firmante1, orden: 1 as const } : null,
      form.firmante2 ? { institucion_id: institucionId, firmante_id: form.firmante2, orden: 2 as const } : null,
      form.firmante3 ? { institucion_id: institucionId, firmante_id: form.firmante3, orden: 3 as const } : null,
    ].filter((x): x is NonNullable<typeof x> => x !== null)
    if (filas.length) {
      const { error: e2 } = await supabase.from('institucion_firmantes').insert(filas)
      if (e2) throw e2
    }
    modal.value = false
    ok.value = 'Institución guardada.'
    await cargar()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo guardar.'
  } finally {
    guardando.value = false
  }
}

async function eliminar(inst: Institucion): Promise<void> {
  if (!confirm(`¿Eliminar "${inst.nombre}" y todos sus estudiantes? Esta acción no se puede deshacer.`)) {
    return
  }
  const { error: e } = await supabase.from('instituciones').delete().eq('id', inst.id)
  if (e) {
    error.value = 'No se pudo eliminar.'
    return
  }
  ok.value = 'Institución eliminada.'
  await cargar()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-primary-500">Instituciones</h1>
      <button type="button" class="btn-primary" @click="abrirNueva">Nueva</button>
    </div>
    <div v-if="error" class="alert-error mb-4">{{ error }}</div>
    <div v-if="ok" class="alert-success mb-4">{{ ok }}</div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="px-4 py-3">Nombre</th>
            <th class="px-4 py-3">Municipio</th>
            <th class="px-4 py-3">Expedición</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in lista" :key="i.id" class="border-t border-slate-100">
            <td class="px-4 py-3 font-medium">{{ i.nombre }}</td>
            <td class="px-4 py-3">{{ i.municipio }}</td>
            <td class="px-4 py-3">{{ i.fecha_expedicion }}</td>
            <td class="px-4 py-3">{{ i.activa ? 'Activa' : 'Inactiva' }}</td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button type="button" class="text-primary-500 underline mr-3" @click="abrirEditar(i)">Editar</button>
              <button type="button" class="text-red-600 underline" @click="eliminar(i)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!lista.length">
            <td colspan="5" class="px-4 py-8 text-center text-slate-400">No hay instituciones.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="modal" class="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4">
      <form class="card max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto" @submit.prevent="guardar">
        <h2 class="text-lg font-semibold">{{ editandoId ? 'Editar institución' : 'Nueva institución' }}</h2>
        <div>
          <label class="label-field">Nombre</label>
          <input v-model="form.nombre" class="input-field" required />
        </div>
        <div>
          <label class="label-field">Municipio</label>
          <input v-model="form.municipio" class="input-field" required />
        </div>
        <div>
          <label class="label-field">Fecha de expedición</label>
          <input v-model="form.fecha_expedicion" class="input-field" type="date" required />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.activa" type="checkbox" />
          Visible en el formulario público
        </label>
        <p class="text-sm font-medium text-slate-700 pt-2">Firmantes (izquierda, centro, derecha)</p>
        <select v-model="form.firmante1" class="input-field">
          <option value="">— Puesto 1 —</option>
          <option v-for="f in firmantes" :key="f.id" :value="f.id">{{ f.nombre }}</option>
        </select>
        <select v-model="form.firmante2" class="input-field">
          <option value="">— Puesto 2 —</option>
          <option v-for="f in firmantes" :key="f.id" :value="f.id">{{ f.nombre }}</option>
        </select>
        <select v-model="form.firmante3" class="input-field">
          <option value="">— Puesto 3 —</option>
          <option v-for="f in firmantes" :key="f.id" :value="f.id">{{ f.nombre }}</option>
        </select>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" class="btn-secondary" @click="modal = false">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="guardando">
            {{ guardando ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
