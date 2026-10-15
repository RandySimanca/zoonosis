<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { esUsuarioAdmin } from '@/composables/useAdmin'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const enviando = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  if (route.query.error === 'no-admin') {
    errorMsg.value = 'Esta cuenta no tiene rol de administrador.'
  }
  const { data } = await supabase.auth.getSession()
  if (data.session && esUsuarioAdmin(data.session.user.app_metadata as Record<string, unknown>)) {
    await router.replace({ name: 'admin-home' })
  }
})

async function ingresar(): Promise<void> {
  errorMsg.value = ''
  enviando.value = true
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value,
  })
  enviando.value = false

  if (error || !data.session) {
    errorMsg.value = 'Correo o contraseña incorrectos.'
    return
  }
  if (!esUsuarioAdmin(data.session.user.app_metadata as Record<string, unknown>)) {
    await supabase.auth.signOut()
    errorMsg.value = 'Esta cuenta no tiene rol de administrador.'
    return
  }
  await router.push({ name: 'admin-home' })
}
</script>

<template>
  <main class="min-h-screen flex items-center justify-center bg-slate-50 p-4">
    <div class="card max-w-md w-full">
      <div class="w-16 h-16 rounded-full bg-teal-500 mx-auto mb-4 flex items-center justify-center">
        <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>

      <h1 class="text-xl font-bold text-primary-500 text-center mb-1">Panel de administración</h1>
      <p class="text-sm text-slate-500 text-center mb-6">Escuelas Promotoras de Salud 2026</p>

      <form class="space-y-4" @submit.prevent="ingresar">
        <div>
          <label class="label-field" for="email">Correo</label>
          <input
            id="email"
            v-model="email"
            class="input-field"
            type="email"
            autocomplete="username"
            required
            :disabled="enviando"
          />
        </div>
        <div>
          <label class="label-field" for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            class="input-field"
            type="password"
            autocomplete="current-password"
            required
            :disabled="enviando"
          />
        </div>

        <div v-if="errorMsg" class="alert-error">{{ errorMsg }}</div>

        <button type="submit" class="btn-primary w-full" :disabled="enviando">
          {{ enviando ? 'Ingresando…' : 'Ingresar' }}
        </button>
      </form>

      <p class="text-center text-xs text-slate-400 mt-6">
        <router-link to="/" class="underline hover:text-slate-600">Volver al inicio</router-link>
      </p>
    </div>
  </main>
</template>
