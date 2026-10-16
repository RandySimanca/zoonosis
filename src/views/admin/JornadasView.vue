<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Firmante, Institucion, Jornada } from '@/types/database'

interface JornadaConRelaciones extends Jornada {
  institucion?: Institucion
  contratista?: Firmante
  _estudiantes_count?: number
}

const lista = ref<JornadaConRelaciones[]>([])
const instituciones = ref<Institucion[]>([])
const contratistas = ref<Firmante[]>([])
const error = ref('')
const ok = ref('')
const modal = ref(false)
const guardando = ref(false)
const editandoId = ref<string | null>(null)

const form = reactive({
  institucion_id: '',
  contratista_id: '',
  fecha_expedicion: '',
  activa: true,
})

async function cargar(): Promise<void> {
  error.value = ''
  const [j, i, f] = await Promise.all([
    supabase.from('jornadas').select(`
      *,
      institucion:instituciones!institucion_id ( id, nombre, municipio ),
      contratista:firmantes!contratista_id ( id, nombre, cargo )
    `).order('fecha_expedicion', { ascending: false }),
    supabase.from('instituciones').select('*').order('nombre'),
    supabase.from('firmantes').select('*').eq('es_fijo', false).eq('activo', true).order('nombre'),
  ])
  if (j.error || i.error || f.error) {
    error.value = 'No se pudieron cargar los datos.'
    return
  }
  // Contar estudiantes por jornada
  const jornadas = (j.data ?? []) as JornadaConRelaciones[]
  const { data: counts } = await supabase
    .from('estudiantes')
    .select('jornada_id')
  const countMap = new Map<string, number>()
  for (const c of counts ?? []) {
    countMap.set(c.jornada_id, (countMap.get(c.jornada_id) ?? 0) + 1)
  }
  for (const jor of jornadas) {
    jor._estudiantes_count = countMap.get(jor.id) ?? 0
  }
  lista.value = jornadas
  instituciones.value = i.data ?? []
  contratistas.value = f.data ?? []
}

onMounted(cargar)

const institucionNombre = (id: string) =>
  instituciones.value.find((i) => i.id === id)?.nombre ?? '—'
const contratistaNombre = (id: string) =>
  contratistas.value.find((f) => f.id === id)?.nombre ?? '—'

function abrirNueva(): void {
  editandoId.value = null
  form.institucion_id = ''
  form.contratista_id = ''
  form.fecha_expedicion = ''
  form.activa = true
  modal.value = true
}

function abrirEditar(j: JornadaConRelaciones): void {
  editandoId.value = j.id
  form.institucion_id = j.institucion_id
  form.contratista_id = j.contratista_id
  form.fecha_expedicion = j.fecha_expedicion
  form.activa = j.activa
  modal.value = true
}

async function guardar(): Promise<void> {
  error.value = ''
  ok.value = ''
  guardando.value = true
  try {
    const payload = {
      institucion_id: form.institucion_id,
      contratista_id: form.contratista_id,
      fecha_expedicion: form.fecha_expedicion,
      activa: form.activa,
    }
    if (editandoId.value) {
      const { error: e } = await supabase.from('jornadas').update(payload).eq('id', editandoId.value)
      if (e) throw e
    } else {
      const { error: e } = await supabase.from('jornadas').insert(payload)
      if (e) throw e
    }
    modal.value = false
    ok.value = 'Jornada guardada.'
    await cargar()
  } catch (e) {
    const code = (e as { code?: string })?.code
    error.value =
      code === '23505'
        ? 'Ya existe una jornada con la misma institución, contratista y fecha.'
        : e instanceof Error
          ? e.message
          : 'No se pudo guardar.'
  } finally {
    guardando.value = false
  }
}

async function eliminar(j: JornadaConRelaciones): Promise<void> {
  const count = j._estudiantes_count ?? 0
  const msg = count > 0
    ? `¿Eliminar esta jornada y sus ${count} estudiantes? Esta acción no se puede deshacer.`
    : '¿Eliminar esta jornada?'
  if (!confirm(msg)) return
  const { error: e } = await supabase.from('jornadas').delete().eq('id', j.id)
  if (e) {
    error.value = 'No se pudo eliminar.'
    return
  }
  ok.value = 'Jornada eliminada.'
  await cargar()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-primary-500">Jornadas</h1>
      <button type="button" class="btn-primary" @click="abrirNueva">Nueva</button>
    </div>
    <div v-if="error" class="alert-error mb-4">{{ error }}</div>
    <div v-if="ok" class="alert-success mb-4">{{ ok }}</div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="px-4 py-3">Institución</th>
            <th class="px-4 py-3">Municipio</th>
            <th class="px-4 py-3">Contratista</th>
            <th class="px-4 py-3">Fecha</th>
            <th class="px-4 py-3 text-center">Estudiantes</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="j in lista" :key="j.id" class="border-t border-slate-100">
            <td class="px-4 py-3 font-medium">
              {{ (j.institucion as any)?.nombre ?? '—' }}
            </td>
            <td class="px-4 py-3">
              {{ (j.institucion as any)?.municipio ?? '—' }}
            </td>
            <td class="px-4 py-3">
              {{ (j.contratista as any)?.nombre ?? '—' }}
            </td>
            <td class="px-4 py-3">{{ j.fecha_expedicion }}</td>
            <td class="px-4 py-3 text-center font-mono">
              {{ j._estudiantes_count ?? 0 }}
            </td>
            <td class="px-4 py-3">
              <span :class="j.activa ? 'text-green-600' : 'text-slate-400'">
                {{ j.activa ? 'Activa' : 'Inactiva' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button type="button" class="text-primary-500 underline mr-3" @click="abrirEditar(j)">Editar</button>
              <button type="button" class="text-red-600 underline" @click="eliminar(j)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!lista.length">
            <td colspan="7" class="px-4 py-8 text-center text-slate-400">No hay jornadas registradas.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal crear/editar -->
    <div v-if="modal" class="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4">
      <form class="card max-w-lg w-full space-y-3 max-h-[90vh] overflow-y-auto" @submit.prevent="guardar">
        <h2 class="text-lg font-semibold">{{ editandoId ? 'Editar jornada' : 'Nueva jornada' }}</h2>
        <div>
          <label class="label-field">Institución educativa</label>
          <select v-model="form.institucion_id" class="input-field" required>
            <option value="" disabled>Selecciona la institución</option>
            <option v-for="i in instituciones" :key="i.id" :value="i.id">
              {{ i.nombre }} — {{ i.municipio }}
            </option>
          </select>
        </div>
        <div>
          <label class="label-field">Contratista</label>
          <select v-model="form.contratista_id" class="input-field" required>
            <option value="" disabled>Selecciona el contratista</option>
            <option v-for="f in contratistas" :key="f.id" :value="f.id">{{ f.nombre }}</option>
          </select>
        </div>
        <div>
          <label class="label-field">Fecha de expedición</label>
          <input v-model="form.fecha_expedicion" class="input-field" type="date" required />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.activa" type="checkbox" />
          Jornada activa (permite descarga de certificados)
        </label>
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
