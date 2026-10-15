<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import {
  agruparInstituciones,
  normalizarClave,
  parsearArchivoEstudiantes,
} from '@/lib/importar-estudiantes'
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
  if (!file) return
  error.value = ''
  ok.value = ''
  erroresImport.value = []
  importando.value = true
  try {
    const buf = await file.arrayBuffer()
    const { validas, errores } = await parsearArchivoEstudiantes(buf)
    const agrupado = agruparInstituciones(validas)
    const avisos = [...errores, ...agrupado.errores]

    // Contratistas registrados (los firmantes no fijos)
    const { data: firmantes, error: eF } = await supabase
      .from('firmantes')
      .select('id, nombre, es_fijo')
    const { data: existentes, error: eI } = await supabase
      .from('instituciones')
      .select('id, nombre, municipio')
    if (eF || eI) {
      error.value = 'No se pudieron consultar contratistas e instituciones.'
      return
    }
    const contratistas = new Map(
      (firmantes ?? []).filter((f) => !f.es_fijo).map((f) => [normalizarClave(f.nombre), f.id]),
    )
    const instExistentes = new Map(
      (existentes ?? []).map((i) => [
        `${normalizarClave(i.nombre)}|${normalizarClave(i.municipio)}`,
        i.id,
      ]),
    )

    let totalEstudiantes = 0
    let creadas = 0
    let actualizadas = 0

    for (const inst of agrupado.instituciones) {
      const contratistaId = contratistas.get(normalizarClave(inst.contratista))
      if (!contratistaId) {
        avisos.push({
          fila: inst.filas[0].fila,
          mensaje: `Contratista "${inst.contratista}" no está registrado en Firmantes (se omitió "${inst.nombre}", ${inst.filas.length} estudiantes)`,
        })
        continue
      }

      let institucionId = instExistentes.get(inst.clave)
      if (institucionId) {
        const { error: e } = await supabase
          .from('instituciones')
          .update({ fecha_expedicion: inst.fecha_expedicion, contratista_id: contratistaId })
          .eq('id', institucionId)
        if (e) {
          avisos.push({ fila: inst.filas[0].fila, mensaje: `No se pudo actualizar "${inst.nombre}"` })
          continue
        }
        actualizadas++
      } else {
        const { data: nueva, error: e } = await supabase
          .from('instituciones')
          .insert({
            nombre: inst.nombre,
            municipio: inst.municipio,
            fecha_expedicion: inst.fecha_expedicion,
            activa: true,
            contratista_id: contratistaId,
          })
          .select('id')
          .single()
        if (e || !nueva) {
          avisos.push({ fila: inst.filas[0].fila, mensaje: `No se pudo crear "${inst.nombre}"` })
          continue
        }
        institucionId = nueva.id
        creadas++
      }

      const filas = inst.filas.map((v) => ({
        institucion_id: institucionId!,
        tipo_documento: v.tipo_documento,
        numero_documento: v.numero_documento,
        nombre_completo: v.nombre_completo,
      }))
      const { error: e } = await supabase.from('estudiantes').upsert(filas, {
        onConflict: 'institucion_id,tipo_documento,numero_documento',
      })
      if (e) {
        avisos.push({ fila: inst.filas[0].fila, mensaje: `Error al guardar estudiantes de "${inst.nombre}": ${e.message}` })
        continue
      }
      totalEstudiantes += filas.length
    }

    erroresImport.value = avisos.sort((a, b) => a.fila - b.fila).map((er) => `Fila ${er.fila}: ${er.mensaje}`)
    if (!totalEstudiantes) {
      error.value = 'No se importó ningún estudiante.'
      return
    }
    ok.value = `Se importaron o actualizaron ${totalEstudiantes} estudiantes (${creadas} instituciones nuevas, ${actualizadas} actualizadas).`
    await cargarInstituciones()
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
        Importar Excel o CSV con las columnas:
        <code class="text-xs">contratista</code>,
        <code class="text-xs">municipio</code>,
        <code class="text-xs">institucion educativa</code>,
        <code class="text-xs">NOMBRE COMPLETO DEL ALUMNO</code>,
        <code class="text-xs">TIPO DE DOCUMENTO</code>,
        <code class="text-xs">NUMERO DE DOCUMENTO</code>,
        <code class="text-xs">fecha de entrega del certificado</code>.
        <a href="/plantilla-estudiantes.csv" class="text-primary-500 underline" download>Descargar plantilla</a>
      </p>
      <p class="text-xs text-slate-500 mb-3">
        Las instituciones se crean o actualizan automáticamente. El contratista debe estar
        registrado antes en Firmantes (con su firma) y escrito igual en el archivo.
      </p>
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        :disabled="importando"
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
