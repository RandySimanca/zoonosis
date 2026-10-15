<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { parsearArchivoEstudiantes } from '@/lib/importar-estudiantes'
import { TIPOS_DOCUMENTO, TIPOS_LABEL, normalizarNumero } from '@/lib/normalize'
import { supabase } from '@/lib/supabase'
import type { Estudiante, Institucion, TipoDocumento } from '@/types/database'

const instituciones = ref<Institucion[]>([])
const institucionId = ref('')
const lista = ref<Estudiante[]>([])
const total = ref(0)
const pagina = ref(0)
const TAM = 40
const error = ref('')
const ok = ref('')
const importando = ref(false)
const erroresImport = ref<string[]>([])

const form = reactive({
  tipo_documento: 'TI' as TipoDocumento,
  numero_documento: '',
  nombre_completo: '',
})

async function cargarInstituciones(): Promise<void> {
  const { data, error: e } = await supabase.from('instituciones').select('*').order('nombre')
  if (e) {
    error.value = 'No se pudieron cargar las instituciones.'
    return
  }
  instituciones.value = data ?? []
  if (!institucionId.value && instituciones.value[0]) {
    institucionId.value = instituciones.value[0].id
  }
}

async function cargarEstudiantes(): Promise<void> {
  if (!institucionId.value) {
    lista.value = []
    total.value = 0
    return
  }
  const from = pagina.value * TAM
  const to = from + TAM - 1
  const { data, error: e, count } = await supabase
    .from('estudiantes')
    .select('*', { count: 'exact' })
    .eq('institucion_id', institucionId.value)
    .order('nombre_completo')
    .range(from, to)
  if (e) {
    error.value = 'No se pudieron cargar los estudiantes.'
    return
  }
  lista.value = data ?? []
  total.value = count ?? 0
}

onMounted(async () => {
  await cargarInstituciones()
  await cargarEstudiantes()
})

watch(institucionId, () => {
  pagina.value = 0
  void cargarEstudiantes()
})

async function agregar(): Promise<void> {
  error.value = ''
  ok.value = ''
  const numero = normalizarNumero(form.numero_documento)
  if (!institucionId.value || !numero || !form.nombre_completo.trim()) {
    error.value = 'Completa todos los campos.'
    return
  }
  const { error: e } = await supabase.from('estudiantes').insert({
    institucion_id: institucionId.value,
    tipo_documento: form.tipo_documento,
    numero_documento: numero,
    nombre_completo: form.nombre_completo.trim(),
  })
  if (e) {
    error.value = e.message.includes('duplicate')
      ? 'Ya existe un estudiante con ese documento en esta institución.'
      : 'No se pudo agregar.'
    return
  }
  form.numero_documento = ''
  form.nombre_completo = ''
  ok.value = 'Estudiante agregado.'
  await cargarEstudiantes()
}

async function eliminar(est: Estudiante): Promise<void> {
  if (!confirm(`¿Quitar a ${est.nombre_completo}?`)) return
  const { error: e } = await supabase.from('estudiantes').delete().eq('id', est.id)
  if (e) {
    error.value = 'No se pudo eliminar.'
    return
  }
  await cargarEstudiantes()
}

async function onExcel(ev: Event): Promise<void> {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !institucionId.value) {
    error.value = 'Selecciona una institución antes de importar.'
    return
  }
  error.value = ''
  ok.value = ''
  erroresImport.value = []
  importando.value = true
  try {
    const buf = await file.arrayBuffer()
    const { validas, errores } = await parsearArchivoEstudiantes(buf)
    erroresImport.value = errores.map((er) => `Fila ${er.fila}: ${er.mensaje}`)
    if (!validas.length) {
      error.value = 'No hay filas válidas para importar.'
      return
    }
    const filas = validas.map((v) => ({
      institucion_id: institucionId.value,
      tipo_documento: v.tipo_documento,
      numero_documento: v.numero_documento,
      nombre_completo: v.nombre_completo,
    }))
    const { error: e } = await supabase.from('estudiantes').upsert(filas, {
      onConflict: 'institucion_id,tipo_documento,numero_documento',
    })
    if (e) {
      error.value = 'Error al guardar en la base de datos: ' + e.message
      return
    }
    ok.value = `Se importaron o actualizaron ${validas.length} estudiantes.`
    await cargarEstudiantes()
  } catch {
    error.value = 'No se pudo leer el archivo. Use .xlsx o .csv.'
  } finally {
    importando.value = false
  }
}

const paginas = () => Math.max(1, Math.ceil(total.value / TAM))
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-primary-500 mb-6">Estudiantes</h1>
    <div v-if="error" class="alert-error mb-4">{{ error }}</div>
    <div v-if="ok" class="alert-success mb-4">{{ ok }}</div>

    <div class="card mb-6 space-y-4">
      <div>
        <label class="label-field">Institución</label>
        <select v-model="institucionId" class="input-field">
          <option v-for="i in instituciones" :key="i.id" :value="i.id">{{ i.nombre }}</option>
        </select>
      </div>

      <div class="grid md:grid-cols-4 gap-3 items-end">
        <div>
          <label class="label-field">Tipo</label>
          <select v-model="form.tipo_documento" class="input-field">
            <option v-for="t in TIPOS_DOCUMENTO" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="label-field">Documento</label>
          <input v-model="form.numero_documento" class="input-field" />
        </div>
        <div class="md:col-span-2">
          <label class="label-field">Nombre completo</label>
          <input v-model="form.nombre_completo" class="input-field" />
        </div>
      </div>
      <button type="button" class="btn-primary" @click="agregar">Agregar</button>
    </div>

    <div class="card mb-6">
      <p class="text-sm text-slate-600 mb-3">
        Importar Excel o CSV con columnas
        <code class="text-xs">tipo_documento</code>,
        <code class="text-xs">numero_documento</code>,
        <code class="text-xs">nombre_completo</code>.
        <a href="/plantilla-estudiantes.csv" class="text-primary-500 underline" download>Descargar plantilla</a>
      </p>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        :disabled="importando || !institucionId"
        @change="onExcel"
      />
      <ul v-if="erroresImport.length" class="mt-3 text-sm text-amber-700 space-y-1">
        <li v-for="(er, i) in erroresImport" :key="i">{{ er }}</li>
      </ul>
    </div>

    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-left text-slate-500">
          <tr>
            <th class="px-4 py-3">Tipo</th>
            <th class="px-4 py-3">Documento</th>
            <th class="px-4 py-3">Nombre</th>
            <th class="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in lista" :key="e.id" class="border-t border-slate-100">
            <td class="px-4 py-3">{{ e.tipo_documento }} <span class="text-slate-400">{{ TIPOS_LABEL[e.tipo_documento] }}</span></td>
            <td class="px-4 py-3 font-mono">{{ e.numero_documento }}</td>
            <td class="px-4 py-3">{{ e.nombre_completo }}</td>
            <td class="px-4 py-3 text-right">
              <button type="button" class="text-red-600 underline" @click="eliminar(e)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!lista.length">
            <td colspan="4" class="px-4 py-8 text-center text-slate-400">Sin estudiantes en esta institución.</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="total > TAM" class="flex justify-between items-center mt-4 text-sm">
      <button
        type="button"
        class="btn-secondary py-2 px-4"
        :disabled="pagina === 0"
        @click="pagina--; cargarEstudiantes()"
      >
        Anterior
      </button>
      <span>{{ pagina + 1 }} / {{ paginas() }}</span>
      <button
        type="button"
        class="btn-secondary py-2 px-4"
        :disabled="pagina + 1 >= paginas()"
        @click="pagina++; cargarEstudiantes()"
      >
        Siguiente
      </button>
    </div>
  </div>
</template>
