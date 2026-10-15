import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { exigirSesionAdmin } from '@/composables/useAdmin'

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
  },
  {
    path: '/admin/panel',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-home',
        component: () => import('@/views/admin/AdminHomeView.vue'),
      },
      {
        path: 'instituciones',
        name: 'admin-instituciones',
        component: () => import('@/views/admin/InstitucionesView.vue'),
      },
      {
        path: 'firmantes',
        name: 'admin-firmantes',
        component: () => import('@/views/admin/FirmantesView.vue'),
      },
      {
        path: 'estudiantes',
        name: 'admin-estudiantes',
        component: () => import('@/views/admin/EstudiantesView.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  if (!to.meta.requiresAdmin) return
  const { ok } = await exigirSesionAdmin()
  if (!ok) {
    return { name: 'admin-login', query: to.path === '/admin' ? {} : { error: undefined } }
  }
})
