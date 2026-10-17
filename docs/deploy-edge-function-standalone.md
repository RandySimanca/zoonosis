# Deploy de Edge Function - Versión Consolidada

Como el dashboard de Supabase no puede encontrar los archivos `_shared`, use la versión consolidada en un solo archivo.

## 📋 Pasos para Deploy

### Paso 1: Ir al Dashboard de Supabase

1. Ingresa a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Edge Functions**

### Paso 2: Crear o Actualizar la Función

#### Si la función ya existe:

1. Busca `generar-certificado` en la lista
2. Haz clic en ella
3. Haz clic en "Edit"
4. **BORRA TODO** el código existente
5. Copia el contenido de: `supabase/functions/generar-certificado/index-standalone.ts`
6. Pégalo en el editor
7. Haz clic en "Save"

#### Si la función no existe:

1. Haz clic en "New Edge Function"
2. Nombre: `generar-certificado`
3. Copia el contenido de: `supabase/functions/generar-certificado/index-standalone.ts`
4. Pégalo en el editor
5. Haz clic en "Save"

### Paso 3: Verificar que se Guardó

Después de guardar, recarga la página y verifica que el código esté ahí.

### Paso 4: Probar

1. Abre https://zoonosis-nine.vercel.app/
2. Selecciona: "INSTITUCIÓN EDUCATIVA PRUEBA LORICA - LC"
3. Tipo: TI
4. Número: 9900000005
5. Haz clic en "Descargar certificado"

### Paso 5: Ver los Logs

1. En el dashboard de Supabase
2. Edge Functions → `generar-certificado`
3. Haz clic en "Logs"
4. Deberías ver:
   ```
   📥 Body recibido: { ... }
   🔍 Buscando estudiante: { ... }
   📊 Resultado búsqueda: { ... }
   ```

## 🔍 Qué hace esta versión consolidada

Esta versión incluye todo en un solo archivo:
- Configuración CORS
- Cliente de Supabase
- Funciones de normalización
- Lógica principal de generación de certificados
- Logging detallado para debugging
- Bypass de CAPTCHA con 'dev-bypass'

## ✅ Ventajas

- No necesita archivos `_shared`
- Más fácil de copiar y pegar desde el dashboard
- Incluye todo el código necesario
- Incluye logging para debugging

## 📝 Archivo

El archivo consolidado está en:
`supabase/functions/generar-certificado/index-standalone.ts`

Después de que funcione correctamente, podemos volver a la versión modular con CLI cuando tengas los permisos necesarios.
