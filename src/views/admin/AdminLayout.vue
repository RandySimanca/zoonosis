<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'

const router = useRouter()
const menuAbierto = ref(false)

const usuario = ref('')
supabase.auth.getSession().then(({ data }) => {
  usuario.value = data.session?.user.email ?? ''
})

const enlaces = [
  { name: 'admin-home', label: 'Resumen' },
  { name: 'admin-instituciones', label: 'Instituciones' },
  { name: 'admin-firmantes', label: 'Firmantes' },
  { name: 'admin-estudiantes', label: 'Estudiantes' },
]

async function salir(): Promise<void> {
  await supabase.auth.signOut()
  await router.push({ name: 'admin-login' })
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <aside
      class="hidden md:flex w-60 flex-col bg-primary-800 text-white shrink-0"
    >
      <div class="px-5 py-6 border-b border-primary-700">
        <p class="text-xs uppercase tracking-widest text-primary-300">ETV y Zoonosis</p>
        <p class="font-semibold mt-1">Administración</p>
      </div>
      <nav class="flex-1 px-3 py-4 space-y-1">
        <router-link
          v-for="e in enlaces"
          :key="e.name"
          :to="{ name: e.name }"
          class="block px-3 py-2 rounded-lg text-sm text-primary-100 hover:bg-primary-700"
          :active-class="e.name === 'admin-home' ? '' : 'bg-primary-600 text-white'"
          :exact-active-class="e.name === 'admin-home' ? 'bg-primary-600 text-white' : 'bg-primary-600 text-white'"
        >
          {{ e.label }}
        </router-link>
      </nav>
      <div class="px-5 py-4 border-t border-primary-700 text-xs text-primary-300">
        <p class="truncate mb-2">{{ usuario }}</p>
        <button class="underline hover:text-white" type="button" @click="salir">Cerrar sesión</button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-w-0">
      <header class="md:hidden bg-primary-800 text-white px-4 py-3 flex items-center justify-between">
        <span class="font-semibold">Administración</span>
        <button type="button" class="text-sm underline" @click="menuAbierto = !menuAbierto">
          Menú
        </button>
      </header>
      <nav v-if="menuAbierto" class="md:hidden bg-primary-700 text-white px-4 py-3 space-y-2">
        <router-link
          v-for="e in enlaces"
          :key="e.name"
          :to="{ name: e.name }"
          class="block py-1"
          @click="menuAbierto = false"
        >
          {{ e.label }}
        </router-link>
        <button type="button" class="underline" @click="salir">Cerrar sesión</button>
      </nav>
      <main class="flex-1 p-4 md:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
