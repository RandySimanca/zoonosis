# Guía para el Cargue de Estudiantes

Esta guía explica cómo usar la plantilla de Excel para importar estudiantes al sistema de certificados.

## 📥 Descargar la Plantilla

La plantilla está disponible en el panel de administración en:
- **Estudiantes → Importar Excel → Descargar plantilla Excel**

O puedes descargarla directamente desde:
- [plantilla-estudiantes.xlsx](/plantilla-estudiantes.xlsx)
- [plantilla-estudiantes.csv](/plantilla-estudiantes.csv)

## 📋 Estructura de la Plantilla

La plantilla de Excel contiene 3 hojas:

### 1. Hoja "INSTRUCCIONES"
Contiene instrucciones detalladas paso a paso para completar la plantilla correctamente.

### 2. Hoja "DATOS"
Esta es la hoja principal donde debes ingresar la información de los estudiantes. Tiene 7 columnas:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| **contratista** | Nombre completo del contratista que firma el certificado | ANA PAOLA RÍOS MARTÍNEZ |
| **municipio** | Municipio de la institución educativa | Montería |
| **institucion educativa** | Nombre completo de la institución | Institución Educativa Simón Bolívar |
| **NOMBRE COMPLETO DEL ALUMNO** | Nombre completo del estudiante (incluye apellidos) | JUAN CAMILO PÉREZ GÓMEZ |
| **TIPO DE DOCUMENTO** | Tipo de documento de identidad | TI, CC, RC, CE, PPT, PEP |
| **NUMERO DE DOCUMENTO** | Número de documento (sin puntos ni espacios) | 1234567890 |
| **fecha de entrega del certificado** | Fecha de entrega (DD/MM/AAAA o AAAA-MM-DD) | 15/11/2026 |

### 3. Hoja "TIPOS_DOC"
Referencia rápida de los tipos de documento aceptados y sus formatos válidos.

## 📝 Paso a Paso para Completar la Plantilla

### Paso 1: Registrar los Contratistas
Antes de importar estudiantes, debes registrar los contratistas en el sistema:

1. Ingresa al panel de administración
2. Ve a **Firmantes**
3. Agrega cada contratista con:
   - Nombre completo (debe coincidir exactamente con la plantilla)
   - Cargo
   - Firma (sube la imagen de la firma)
4. Guarda cada firmante

### Paso 2: Completar la Plantilla

Abre la hoja "DATOS" de la plantilla y sigue estas reglas:

#### Columna: contratista
- Debe coincidir **exactamente** con el nombre registrado en Firmantes
- Usa mayúsculas para mejor legibilidad (opcional)
- Ejemplo: `ANA PAOLA RÍOS MARTÍNEZ`

#### Columna: municipio
- Nombre del municipio donde está la institución
- Ejemplos: `Montería`, `Planeta Rica`, `Cereté`

#### Columna: institucion educativa
- Nombre completo de la institución educativa
- Si la institución ya existe en el sistema, se actualizará
- Si no existe, se creará automáticamente
- Ejemplo: `Institución Educativa Simón Bolívar`

#### Columna: NOMBRE COMPLETO DEL ALUMNO
- Nombre completo incluyendo apellidos
- Puedes usar mayúsculas, minúsculas o mezcla
- No uses abreviaturas
- Ejemplo: `JUAN CAMILO PÉREZ GÓMEZ`

#### Columna: TIPO DE DOCUMENTO
Valores aceptados:
- **RC** - Registro Civil
- **TI** - Tarjeta de Identidad
- **CC** - Cédula de Ciudadanía
- **CE** - Cédula de Extranjería
- **PPT** - Permiso por Protección Temporal
- **PEP** - Permiso Especial de Permanencia

El sistema acepta múltiples formatos:
- `TI`, `T.I.`, `TARJETA DE IDENTIDAD`, `TARJETAIDENTIDAD` → todos se convierten a `TI`

#### Columna: NUMERO DE DOCUMENTO
- Sin puntos, ni espacios, ni comas
- El sistema lo normaliza automáticamente
- Ejemplos válidos: `1234567890`, `12345678`
- Si ingresas `1.234.567.890`, el sistema lo convierte a `1234567890`

#### Columna: fecha de entrega del certificado
- Formatos aceptados:
  - `DD/MM/AAAA` → `15/11/2026`
  - `AAAA-MM-DD` → `2026-11-15`
- Esta fecha aparecerá en el certificado

### Paso 3: Validar la Plantilla

Antes de importar, verifica:

- ✅ No hay filas vacías entre los datos
- ✅ No cambiaste el nombre de las columnas
- ✅ Todos los contratistas están registrados en Firmantes
- ✅ Los tipos de documento son válidos
- ✅ Las fechas están en formato correcto
- ✅ No hay documentos duplicados en el mismo archivo

### Paso 4: Importar al Sistema

1. Ingresa al panel de administración
2. Ve a **Estudiantes**
3. Haz clic en **Importar Excel**
4. Selecciona el archivo `.xlsx` o `.csv`
5. Revisa los errores (si los hay)
6. Los estudiantes se importarán correctamente

## 🎯 Funcionamiento del Sistema

### Agrupación por Jornadas
El sistema agrupa automáticamente los estudiantes por **jornadas**. Una jornada se define por:
- Institución educativa
- Municipio
- Contratista
- Fecha de entrega

Esto significa que:
- Una misma institución puede tener múltiples jornadas con diferentes contratistas o fechas
- Cada combinación única crea una jornada separada
- Las firmas se asignan según el contratista de cada jornada

### Actualización Automática
- Si la institución ya existe, se actualiza:
  - Fecha de expedición
  - Contratista asignado
- Si la institución no existe, se crea automáticamente
- Los estudiantes se actualizan usando la combinación:
  - Institución + Tipo de documento + Número de documento

## ⚠️ Errores Comunes

### Error: "Contratista no está registrado"
**Causa**: El contratista no existe en el sistema o el nombre no coincide exactamente.

**Solución**:
1. Ve a Firmantes
2. Registra el contratista con el nombre exacto
3. Revisa la plantilla y asegúrate de que coincida

### Error: "Tipo de documento no válido"
**Causa**: El tipo de documento no está en la lista de valores aceptados.

**Solución**: Usa solo RC, TI, CC, CE, PPT o PEP.

### Error: "Fecha de entrega no válida"
**Causa**: La fecha no está en el formato correcto.

**Solución**: Usa DD/MM/AAAA (ej: 15/11/2026) o AAAA-MM-DD (ej: 2026-11-15).

### Error: "Documento duplicado en el archivo"
**Causa**: El mismo estudiante aparece más de una vez en el archivo.

**Solución**: Elimina las filas duplicadas. Cada estudiante debe aparecer una sola vez por institución.

## 📞 Soporte

Si tienes dudas o problemas al importar:
1. Revisa las instrucciones en la hoja "INSTRUCCIONES" de la plantilla
2. Verifica que todos los contratistas estén registrados
3. Contacta al administrador del sistema

## 🔗 Flujo Completo

```
1. Registrar Firmantes (contratistas) con sus firmas
   ↓
2. Asignar firmantes a instituciones (opcional, si hay firmantes fijos)
   ↓
3. Completar plantilla de estudiantes
   ↓
4. Importar plantilla en Estudiantes
   ↓
5. Los estudiantes pueden descargar sus certificados desde la página pública
```

---

**Última actualización**: Octubre 2026
**Versión**: 1.0
