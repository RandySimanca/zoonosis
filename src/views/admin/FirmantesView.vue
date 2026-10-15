<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Firmante } from '@/types/database'

const lista = ref<(Firmante & { preview?: string })[]>([])
const error = ref('')
const ok = ref('')
const modal = ref(false)
const guardando = ref(false)
const editandoId = ref<string | null>(null)
const archivo = ref<File | null>(null)

const form = reactive({
  nombre: '',
  cargo: '',
  es_fijo: false,
  orden_fijo: 1 as 1 | 2,
})

async function urlFirma(path: string): Promise<string | undefined> {
  const rel = path.startsWith('firmas/') ? path.slice('firmas/'.length) : path
  const { data } = await supabase.storage.from('firmas').createSignedUrl(rel, 3600)
  return data?.signedUrl
}

async function cargar(): Promise<void> {
  error.value = ''
  const { data, error: e } = await supabase.from('firmantes').select('*').order('nombre')
  if (e) {
    error.value = 'No se pudieron cargar los firmantes.'
    return
  }
  const rows = data ?? []
  lista.value = await Promise.all(
    rows.map(async (f) => ({ ...f, preview: await urlFirma(f.firma_path) })),
  )
}

onMounted(cargar)

function abrirNueva(): void {
  editandoId.value = null
  form.nombre = ''
  form.cargo = ''
  form.es_fijo = false
  form.orden_fijo = 1
  archivo.value = null
  modal.value = true
}

function abrirEditar(f: Firmante): void {
  editandoId.value = f.id
  form.nombre = f.nombre
  form.cargo = f.cargo
  form.es_fijo = f.es_fijo
  form.orden_fijo = f.orden_fijo ?? 1
  archivo.value = null
  modal.value = true
}

function onFile(ev: Event): void {
  const input = ev.target as HTMLInputElement
  archivo.value = input.files?.[0] ?? null
}

async function guardar(): Promise<void> {
  error.value = ''
  ok.value = ''
  if (!editandoId.value && !archivo.value) {
    error.value = 'Sube una imagen PNG o JPG de la firma.'
    return
  }
  guardando.value = true
  try {
    let path: string | undefined
    if (archivo.value) {
      const ext = archivo.value.name.toLowerCase().endsWith('.jpg') || archivo.value.name.toLowerCase().endsWith('.jpeg')
        ? 'jpg'
        : 'png'
      const nombre = `${crypto.randomUUID()}.${ext}`
      const { error: up } = await supabase.storage.from('firmas').upload(nombre, archivo.value, {
        contentType: archivo.value.type,
        upsert: false,
      })
      if (up) throw up
      path = nombre
    }

    if (editandoId.value) {
      const patch: {
        nombre: string
        cargo: string
        es_fijo: boolean
        orden_fijo: 1 | 2 | null
        firma_path?: string
      } = {
        nombre: form.nombre.trim(),
        cargo: form.cargo.trim(),
        es_fijo: form.es_fijo,
        orden_fijo: form.es_fijo ? form.orden_fijo : null,
      }
      if (path) patch.firma_path = path
      const { error: e } = await supabase.from('firmantes').update(patch).eq('id', editandoId.value)
      if (e) throw e
    } else {
      const { error: e } = await supabase.from('firmantes').insert({
        nombre: form.nombre.trim(),
        cargo: form.cargo.trim(),
        es_fijo: form.es_fijo,
        orden_fijo: form.es_fijo ? form.orden_fijo : null,
        firma_path: path!,
      })
      if (e) throw e
    }
    modal.value = false
    ok.value = 'Firmante guardado.'
    await cargar()
  } catch (e) {
    const code = (e as { code?: string })?.code
    error.value =
      code === '23505'
        ? 'Ya existe un firmante fijo en ese puesto. Edítalo primero para quitarle la marca de fijo.'
        : e instanceof Error
          ? e.message
          : 'No se pudo guardar.'
  } finally {
    guardando.value = false
  }
}

async function eliminar(f: Firmante): Promise<void> {
  if (!confirm(`¿Eliminar a ${f.nombre}?`)) return
  const { error: e } = await supabase.from('firmantes').delete().eq('id', f.id)
  if (e) {
    error.value = 'No se pudo eliminar. Puede estar asignado como contratista de una institución.'
    return
  }
  const rel = f.firma_path.startsWith('firmas/') ? f.firma_path.slice('firmas/'.length) : f.firma_path
  await supabase.storage.from('firmas').remove([rel])
  ok.value = 'Firmante eliminado.'
  await cargar()
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-primary-500">Firmantes</h1>
      <button type="button" class="btn-primary" @click="abrirNueva">Nuevo</button>
    </div>
    <div v-if="error" class="alert-error mb-4">{{ error }}</div>
    <div v-if="ok" class="alert-success mb-4">{{ ok }}</div>

    <div class="grid md:grid-cols-2 gap-4">
      <div v-for="f in lista" :key="f.id" class="card flex gap-4">
        <div class="w-28 h-16 bg-slate-100 rounded flex items-center justify-center overflow-hidden shrink-0">
          <img v-if="f.preview" :src="f.preview" alt="" class="max-h-16 object-contain" />
          <span v-else class="text-xs text-slate-400">Sin imagen</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="font-semibold truncate">{{ f.nombre }}</p>
          <p class="text-sm text-slate-500">{{ f.cargo }}</p>
          <p class="text-xs mt-1">
            <span v-if="f.es_fijo" class="text-primary-500 font-medium">Fijo · puesto {{ f.orden_fijo }}</span>
            <span v-else class="text-slate-400">Contratista (variable)</span>
          </p>
          <div class="mt-2 text-sm">
            <button type="button" class="text-primary-500 underline mr-3" @click="abrirEditar(f)">Editar</button>
            <button type="button" class="text-red-600 underline" @click="eliminar(f)">Eliminar</button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="!lista.length" class="text-slate-400 text-sm">Aún no hay firmantes.</p>

    <div v-if="modal" class="fixed inset-0 z-20 bg-black/40 flex items-center justify-center p-4">
      <form class="card max-w-lg w-full space-y-3" @submit.prevent="guardar">
        <h2 class="text-lg font-semibold">{{ editandoId ? 'Editar firmante' : 'Nuevo firmante' }}</h2>
        <div>
          <label class="label-field">Nombre</label>
          <input v-model="form.nombre" class="input-field" required />
        </div>
        <div>
          <label class="label-field">Cargo</label>
          <input v-model="form.cargo" class="input-field" required />
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.es_fijo" type="checkbox" />
          Firmante fijo (aparece en todos los certificados)
        </label>
        <div v-if="form.es_fijo">
          <label class="label-field">Puesto en el certificado</label>
          <select v-model="form.orden_fijo" class="input-field">
            <option :value="1">1 — Izquierda</option>
            <option :value="2">2 — Centro</option>
          </select>
        </div>
        <div>
          <label class="label-field">Imagen de firma (PNG o JPG)</label>
          <input class="input-field" type="file" accept="image/png,image/jpeg" @change="onFile" />
        </div>
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
