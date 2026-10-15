<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{ siteKey: string }>()
const emit = defineEmits<{ token: [string] }>()

const caja = ref<HTMLDivElement | null>(null)
let widgetId: string | undefined
let scriptEl: HTMLScriptElement | null = null

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

function pintar(): void {
  if (!caja.value || !window.turnstile) return
  widgetId = window.turnstile.render(caja.value, {
    sitekey: props.siteKey,
    theme: 'light',
    callback: (token: string) => emit('token', token),
    'expired-callback': () => emit('token', ''),
    'error-callback': () => emit('token', ''),
  })
}

onMounted(() => {
  if (window.turnstile) {
    pintar()
    return
  }
  scriptEl = document.createElement('script')
  scriptEl.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  scriptEl.async = true
  scriptEl.defer = true
  scriptEl.onload = () => pintar()
  document.head.appendChild(scriptEl)
})

onUnmounted(() => {
  if (widgetId && window.turnstile) {
    try {
      window.turnstile.remove(widgetId)
    } catch {
      /* widget ya destruido */
    }
  }
})

function reset(): void {
  emit('token', '')
  if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
}

defineExpose({ reset })
</script>

<template>
  <div ref="caja" class="flex justify-center" />
</template>
