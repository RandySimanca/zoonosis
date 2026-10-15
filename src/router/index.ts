import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { supabase } from '@/lib/supabase'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'inicio',
    component: () => import('@/views/InicioView.vue'),
  },
  {
    path: '/admin',
    name: 'admin-login',
    component: () => import('@/views/AdminLoginView.vue'),
    // Fase 4: se expandirá con sub-rutas y guard de autenticación
  },
  {
    // Ruta comodín — redirige al inicio
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Guard global: proteger rutas /admin/* cuando llegue la Fase 4
router.beforeEach(async (to) => {
  if (to.path.startsWith('/admin') && to.name !== 'admin-login') {
    const { data } = await supabase.auth.getSession()
    if (!data.session) {
      return { name: 'admin-login' }
    }
  }
})
