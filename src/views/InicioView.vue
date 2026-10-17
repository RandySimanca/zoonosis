<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TurnstileWidget from '@/components/TurnstileWidget.vue'
import { supabase } from '@/lib/supabase'
import { TIPOS_DOCUMENTO, TIPOS_LABEL, normalizarNumero } from '@/lib/normalize'

interface InstitucionPublica {
  id: string
  nombre: string
  municipio: string
}

const instituciones = ref<InstitucionPublica[]>([])
const cargandoLista = ref(true)
const errorLista = ref('')

const institucionId = ref('')
const tipoDocumento = ref<(typeof TIPOS_DOCUMENTO)[number]>('TI')
const numeroDocumento = ref('')
const captchaToken = ref('')
const enviando = ref(false)
const errorForm = ref('')
const turnstile = ref<{ reset: () => void } | null>(null)

const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? ''

onMounted(async () => {
  try {
    console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Iniciando carga de instituciones...')

    const { data, error } = await supabase.rpc('listar_instituciones_activas')
    cargandoLista.value = false

    if (error) {
      console.error('Error cargando instituciones:', error)
      errorLista.value = `No se pudieron cargar las instituciones. Error: ${error.message}.`
      return
    }

    instituciones.value = data ?? []
    console.log('Instituciones cargadas:', instituciones.value.length, instituciones.value)

    if (instituciones.value.length === 0) {
      errorLista.value = 'No hay instituciones activas disponibles. Contacta al administrador.'
    }
  } catch (e) {
    console.error('Error inesperado cargando instituciones:', e)
    cargandoLista.value = false
    errorLista.value = 'Error inesperado al cargar instituciones. Contacta al administrador.'
  }
})

async function descargar(): Promise<void> {
  errorForm.value = ''
  const numero = normalizarNumero(numeroDocumento.value)
  if (!institucionId.value || !numero) {
    errorForm.value = 'Completa la institución, el tipo y el número de documento.'
    return
  }
  if (siteKey && !captchaToken.value) {
    errorForm.value = 'Completa la verificación de seguridad.'
    return
  }

  enviando.value = true
  try {
    const base = import.meta.env.VITE_SUPABASE_URL
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    const res = await fetch(`${base}/functions/v1/generar-certificado`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({
        institucion_id: institucionId.value,
        tipo_documento: tipoDocumento.value,
        numero_documento: numero,
        captcha_token: captchaToken.value || 'dev-bypass',
      }),
    })

    if (!res.ok) {
      let mensaje = 'No se pudo generar el certificado. Intenta de nuevo.'
      try {
        const json = (await res.json()) as { error?: string }
        if (json.error) mensaje = json.error
      } catch {
        /* cuerpo no JSON */
      }
      errorForm.value = mensaje
      turnstile.value?.reset()
      return
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Certificado_${numero}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    turnstile.value?.reset()
  } catch {
    errorForm.value = 'Error de red. Revisa tu conexión e intenta de nuevo.'
    turnstile.value?.reset()
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-50">
    <header class="bg-primary-500 text-white">
      <div class="max-w-lg mx-auto px-4 py-8 text-center">
        <p class="text-xs uppercase tracking-widest text-primary-200 mb-2">Gobernación de Córdoba</p>
        <h1 class="text-2xl font-bold">Certificados de participación</h1>
        <p class="text-sm text-primary-100 mt-2">
          Escuelas Promotoras de Salud 2026 · Secretaría de Salud Departamental
        </p>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 py-8">
      <div class="card">
        <p class="text-sm text-slate-600 mb-6">
          Ingresa los datos exactamente como aparecen en tu documento. El certificado solo se entrega
          a quien conoce su número de identificación.
        </p>

        <div v-if="errorLista" class="alert-error mb-4">{{ errorLista }}</div>

        <form class="space-y-4" @submit.prevent="descargar">
          <div>
            <label class="label-field" for="institucion">Institución educativa</label>
            <select
              id="institucion"
              v-model="institucionId"
              class="input-field"
              :disabled="cargandoLista || enviando"
              required
            >
              <option value="" disabled>
                {{ cargandoLista ? 'Cargando…' : 'Selecciona tu institución' }}
              </option>
              <option v-for="i in instituciones" :key="i.id" :value="i.id">
                {{ i.nombre }} — {{ i.municipio }}
              </option>
            </select>
          </div>

          <div>
            <label class="label-field" for="tipo">Tipo de documento</label>
            <select id="tipo" v-model="tipoDocumento" class="input-field" :disabled="enviando">
              <option v-for="t in TIPOS_DOCUMENTO" :key="t" :value="t">
                {{ t }} — {{ TIPOS_LABEL[t] }}
              </option>
            </select>
          </div>

          <div>
            <label class="label-field" for="numero">Número de documento</label>
            <input
              id="numero"
              v-model="numeroDocumento"
              class="input-field"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="Sin puntos ni espacios"
              :disabled="enviando"
              required
            />
          </div>

          <TurnstileWidget
            v-if="siteKey"
            ref="turnstile"
            :site-key="siteKey"
            @token="captchaToken = $event"
          />

          <div v-if="errorForm" class="alert-error">{{ errorForm }}</div>

          <button type="submit" class="btn-primary w-full" :disabled="enviando">
            {{ enviando ? 'Generando certificado…' : 'Descargar certificado' }}
          </button>
        </form>
      </div>

      <p class="text-center text-xs text-slate-400 mt-6">
        Programa ETV y Zoonosis ·
        <router-link to="/admin" class="underline hover:text-slate-600">Administración</router-link>
      </p>
    </div>
  </main>
</template>
