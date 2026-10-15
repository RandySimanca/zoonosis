<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { supabase } from '@/lib/supabase'

const instituciones = ref(0)
const estudiantes = ref(0)
const firmantes = ref(0)
const intentos = ref(0)
const error = ref('')

onMounted(async () => {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [a, b, c, d] = await Promise.all([
    supabase.from('instituciones').select('*', { count: 'exact', head: true }),
    supabase.from('estudiantes').select('*', { count: 'exact', head: true }),
    supabase.from('firmantes').select('*', { count: 'exact', head: true }),
    supabase.from('intentos_descarga').select('*', { count: 'exact', head: true }).gte('creado_en', desde),
  ])
  if (a.error || b.error || c.error || d.error) {
    error.value = 'No se pudieron cargar las estadísticas. Verifica que tu usuario tenga rol admin.'
    return
  }
  instituciones.value = a.count ?? 0
  estudiantes.value = b.count ?? 0
  firmantes.value = c.count ?? 0
  intentos.value = d.count ?? 0
})
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-primary-500 mb-6">Resumen</h1>
    <div v-if="error" class="alert-error mb-4">{{ error }}</div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card">
        <p class="text-sm text-slate-500">Instituciones</p>
        <p class="text-3xl font-bold text-primary-500 mt-1">{{ instituciones }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Estudiantes</p>
        <p class="text-3xl font-bold text-primary-500 mt-1">{{ estudiantes }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Firmantes</p>
        <p class="text-3xl font-bold text-primary-500 mt-1">{{ firmantes }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-slate-500">Intentos (24 h)</p>
        <p class="text-3xl font-bold text-primary-500 mt-1">{{ intentos }}</p>
      </div>
    </div>
    <p class="text-sm text-slate-500 mt-8 max-w-2xl">
      Carga instituciones y firmantes, asígnales el orden de firma y luego importa estudiantes por
      Excel o CSV. El público descarga el PDF desde la página de inicio.
    </p>
  </div>
</template>
