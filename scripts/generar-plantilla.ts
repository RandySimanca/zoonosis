import * as XLSX from 'xlsx'

// Hoja de instrucciones
const hojaInstrucciones = [
  ['INSTRUCCIONES PARA EL CARGUE DE ESTUDIANTES'],
  [''],
  ['Esta plantilla se usa para importar estudiantes a la base de datos de certificados.'],
  ['Sigue estas instrucciones cuidadosamente para evitar errores.'],
  [''],
  ['Columnas requeridas:'],
  [''],
  ['1. contratista'],
  ['   - Nombre completo del contratista (persona que firma el certificado)'],
  ['   - Debe estar registrado previamente en el panel admin → Firmantes'],
  ['   - El nombre debe coincidir exactamente con el registrado en el sistema'],
  ['   - IMPORTANTE: En Firmantes, NO marcar "Firmante fijo"'],
  ['   - Ejemplo: ANA PAOLA RÍOS MARTÍNEZ'],
  [''],
  ['2. municipio'],
  ['   - Municipio donde está ubicada la institución educativa'],
  ['   - Ejemplo: Montería, Planeta Rica, Cereté'],
  [''],
  ['3. institucion educativa'],
  ['   - Nombre completo de la institución educativa'],
  ['   - Si la institución ya existe, se actualizará la fecha y contratista'],
  ['   - Si no existe, se creará automáticamente'],
  ['   - Ejemplo: Institución Educativa Simón Bolívar'],
  [''],
  ['4. NOMBRE COMPLETO DEL ALUMNO'],
  ['   - Nombre completo del estudiante'],
  ['   - Usa mayúsculas, minúsculas o mezcla, el sistema lo normaliza'],
  ['   - Incluir apellidos completos'],
  ['   - Ejemplo: JUAN CAMILO PÉREZ GÓMEZ'],
  [''],
  ['5. TIPO DE DOCUMENTO'],
  ['   - Tipo de documento de identidad'],
  ['   - Valores válidos:'],
  ['     • RC  - Registro Civil'],
  ['     • TI  - Tarjeta de Identidad'],
  ['     • CC  - Cédula de Ciudadanía'],
  ['     • CE  - Cédula de Extranjería'],
  ['     • PPT - Permiso por Protección Temporal'],
  ['     • PEP - Permiso Especial de Permanencia'],
  ['   - Acepta formatos como: TI, T.I., TARJETA DE IDENTIDAD, etc.'],
  [''],
  ['6. NUMERO DE DOCUMENTO'],
  ['   - Número de documento sin puntos, ni espacios, ni comas'],
  ['   - El sistema lo normaliza automáticamente'],
  ['   - Ejemplos válidos: 1234567890, 12345678'],
  ['   - Ejemplos que se normalizan: 1.234.567.890 → 1234567890'],
  [''],
  ['7. fecha de entrega del certificado'],
  ['   - Fecha en que se entregará el certificado'],
  ['   - Formatos aceptados: DD/MM/AAAA o AAAA-MM-DD'],
  ['   - Ejemplos: 15/11/2026 o 2026-11-15'],
  [''],
  ['Reglas importantes:'],
  [''],
  ['• No dejes filas vacías entre los datos'],
  ['• No cambies el nombre de las columnas'],
  ['• Verifica que el contratista esté registrado en Firmantes antes de importar'],
  ['• Cada combinación institución+municipio+contratista+fecha crea una jornada'],
  ['• Los documentos duplicados en el mismo archivo generarán error'],
  ['• Se pueden importar múltiples instituciones en un solo archivo'],
  [''],
  ['Antes de importar:'],
  [''],
  ['1. Registra los contratistas en el panel admin (Firmantes)'],
  ['2. Sube las firmas de los contratistas al sistema'],
  ['3. Asigna los firmantes a las instituciones correspondientes'],
  ['4. Luego importa este archivo en Estudiantes → Importar Excel'],
  [''],
  ['Para ayuda, contacta al administrador del sistema.'],
]

// Hoja de datos con ejemplos
const hojaDatos = [
  [
    'contratista',
    'municipio',
    'institucion educativa',
    'NOMBRE COMPLETO DEL ALUMNO',
    'TIPO DE DOCUMENTO',
    'NUMERO DE DOCUMENTO',
    'fecha de entrega del certificado',
  ],
  [
    'ANA PAOLA RÍOS MARTÍNEZ',
    'Montería',
    'Institución Educativa Simón Bolívar',
    'JUAN CAMILO PÉREZ GÓMEZ',
    'TI',
    '1234567890',
    '15/11/2026',
  ],
  [
    'ANA PAOLA RÍOS MARTÍNEZ',
    'Montería',
    'Institución Educativa Simón Bolívar',
    'MARÍA ALEJANDRA LÓPEZ RÍOS',
    'TI',
    '1098765432',
    '15/11/2026',
  ],
  [
    'ANA PAULA RÍOS MARTÍNEZ',
    'Montería',
    'Institución Educativa Simón Bolívar',
    'CARLOS ANDRÉS TORRES HERRERA',
    'CC',
    '80123456',
    '15/11/2026',
  ],
  [
    'ANA PAOLA RÍOS MARTÍNEZ',
    'Planeta Rica',
    'Institución Educativa Técnica Agrícola',
    'LAURA DANIELA FERNÁNDEZ MOSQUERA',
    'TI',
    '1122334455',
    '20/11/2026',
  ],
  [
    'JOSÉ MIGUEL RODRÍGUEZ OSPINA',
    'Cereté',
    'Colegio Departamental de Cereté',
    'SOFÍA ISABEL MENDOZA ROMERO',
    'RC',
    '12345678',
    '22/11/2026',
  ],
  [
    'JOSÉ MIGUEL RODRÍGUEZ OSPINA',
    'Cereté',
    'Colegio Departamental de Cereté',
    'DANIEL ESTEBAN GUTIÉRREZ MORALES',
    'CC',
    '1004567890',
    '22/11/2026',
  ],
]

// Hoja de tipos de documento (referencia)
const hojaTiposDoc = [
  ['Tipo de Documento', 'Descripción', 'Abreviatura', 'Formatos aceptados'],
  ['RC', 'Registro Civil', 'RC', 'RC, REGISTRO CIVIL, REGISTROCIVIL'],
  ['TI', 'Tarjeta de Identidad', 'TI', 'TI, T.I., TARJETA DE IDENTIDAD, TARJETAIDENTIDAD'],
  ['CC', 'Cédula de Ciudadanía', 'CC', 'CC, C.C., CEDULA, CÉDULA, CEDULA DE CIUDADANIA'],
  ['CE', 'Cédula de Extranjería', 'CE', 'CE, C.E., CEDULA DE EXTRANJERIA'],
  ['PPT', 'Permiso por Protección Temporal', 'PPT', 'PPT, PERMISO DE PROTECCION TEMPORAL'],
  ['PEP', 'Permiso Especial de Permanencia', 'PEP', 'PEP, PERMISO ESPECIAL DE PERMANENCIA'],
]

// Crear libro de trabajo
const wb = XLSX.utils.book_new()

// Agregar hojas
const wsInstrucciones = XLSX.utils.aoa_to_sheet(hojaInstrucciones)
const wsDatos = XLSX.utils.aoa_to_sheet(hojaDatos)
const wsTiposDoc = XLSX.utils.aoa_to_sheet(hojaTiposDoc)

// Configurar ancho de columnas de datos
wsDatos['!cols'] = [
  { wch: 30 }, // contratista
  { wch: 20 }, // municipio
  { wch: 40 }, // institucion educativa
  { wch: 40 }, // NOMBRE COMPLETO DEL ALUMNO
  { wch: 20 }, // TIPO DE DOCUMENTO
  { wch: 20 }, // NUMERO DE DOCUMENTO
  { wch: 25 }, // fecha de entrega del certificado
]

// Configurar ancho de columnas de tipos
wsTiposDoc['!cols'] = [
  { wch: 10 }, // Tipo
  { wch: 35 }, // Descripción
  { wch: 15 }, // Abreviatura
  { wch: 40 }, // Formatos aceptados
]

XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'INSTRUCCIONES')
XLSX.utils.book_append_sheet(wb, wsDatos, 'DATOS')
XLSX.utils.book_append_sheet(wb, wsTiposDoc, 'TIPOS_DOC')

// Guardar archivo
XLSX.writeFile(wb, 'public/plantilla-estudiantes.xlsx')
console.log('✅ Plantilla generada: public/plantilla-estudiantes.xlsx')
