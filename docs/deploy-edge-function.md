# Deploy de Edge Function desde Dashboard de Supabase

Como no tienes permisos para hacer deploy desde la CLI, debes hacerlo desde el dashboard.

## 📋 Pasos para Deploy

### Paso 1: Ir al Dashboard de Supabase

1. Ingresa a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Edge Functions**

### Paso 2: Crear o Actualizar la Función

#### Opción A: Si la función ya existe

1. Busca `generar-certificado` en la lista
2. Haz clic en ella
3. Haz clic en "Edit"
4. Reemplaza todo el código con el contenido de:
   `supabase/functions/generar-certificado/index.ts`
5. Haz clic en "Save"

#### Opción B: Si la función no existe

1. Haz clic en "New Edge Function"
2. Nombre: `generar-certificado`
3. Copia el contenido de `supabase/functions/generar-certificado/index.ts`
4. Pégalo en el editor
5. Haz clic en "Save"

### Paso 3: Configurar Secretos (Opcional)

Si quieres configurar el CAPTCHA en el futuro:

1. En la página de la Edge Function
2. Haz clic en "Secrets"
3. Agrega:
   - **Name**: `TURNSTILE_SECRET_KEY`
   - **Value**: tu secret key de Cloudflare Turnstile
4. Haz clic en "Save"

### Paso 4: Verificar el Código Modificado

Asegúrate de que el código incluya esta modificación:

```typescript
// Token de bypass para pruebas sin CAPTCHA
if (token === "dev-bypass") {
  console.warn("⚠️  Usando dev-bypass — saltando validación de captcha")
  return true
}
```

Esto permite que el token `'dev-bypass'` funcione como bypass del CAPTCHA.

## ✅ Después del Deploy

1. Vuelve a probar la descarga de certificados
2. Con el CAPTCHA desactivado en el frontend y el bypass en la Edge Function, debería funcionar

## 🧪 Prueba

Después de actualizar la Edge Function:

1. Abre https://zoonosis-nine.vercel.app/
2. Selecciona la institución "INSTITUCIÓN EDUCATIVA PRUEBA LORICA - LC"
3. Tipo: TI
4. Número: 9900000005
5. Haz clic en "Descargar certificado"
6. Debería descargar el PDF ahora

## 📝 Código Completo

El código modificado está en:
`supabase/functions/generar-certificado/index.ts`

La línea clave es la validación del bypass:
```typescript
if (token === "dev-bypass") {
  return true
}
```
