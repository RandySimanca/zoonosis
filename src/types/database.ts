/**
 * Tipos TypeScript que reflejan el esquema de base de datos.
 * Actualizar aquí cuando cambien las migraciones.
 */

export type TipoDocumento = 'RC' | 'TI' | 'CC' | 'CE' | 'PPT' | 'PEP'

export interface Institucion {
  id: string
  nombre: string
  municipio: string
  activa: boolean
  creado_en: string
}

export interface Firmante {
  id: string
  nombre: string
  cargo: string
  firma_path: string
  /** true = aparece en todos los certificados (puestos 1 y 2) */
  es_fijo: boolean
  orden_fijo: 1 | 2 | null
  /** Permite desactivar sin borrar historial */
  activo: boolean
  creado_en: string
}

export interface Jornada {
  id: string
  institucion_id: string
  contratista_id: string
  fecha_expedicion: string // ISO date: "YYYY-MM-DD"
  activa: boolean
  creado_en: string
}

/** Jornada con relaciones expandidas (para consultas con select joins) */
export interface JornadaConRelaciones extends Jornada {
  institucion?: Institucion
  contratista?: Firmante
}

export interface Estudiante {
  id: string
  jornada_id: string
  tipo_documento: TipoDocumento
  /** Normalizado: solo letras y dígitos [A-Z0-9] */
  numero_documento: string
  nombre_completo: string
  /** Solo los aprobados pueden descargar certificado */
  aprobado: boolean
  /** Hexadecimal de 32 caracteres para verificación */
  codigo_verificacion: string
  creado_en: string
}

export interface IntentoDescarga {
  id: string
  ip_hash: string
  creado_en: string
  exitoso: boolean
}

/**
 * Tipo usado por el cliente de Supabase para el tipado automático.
 */
export interface Database {
  public: {
    Tables: {
      instituciones: {
        Row: Institucion
        Insert: Omit<Institucion, 'id' | 'creado_en'> & { id?: string; creado_en?: string }
        Update: Partial<Omit<Institucion, 'id'>>
      }
      firmantes: {
        Row: Firmante
        Insert: Omit<Firmante, 'id' | 'creado_en' | 'es_fijo' | 'orden_fijo' | 'activo'> & {
          id?: string
          es_fijo?: boolean
          orden_fijo?: 1 | 2 | null
          activo?: boolean
          creado_en?: string
        }
        Update: Partial<Omit<Firmante, 'id'>>
      }
      jornadas: {
        Row: Jornada
        Insert: Omit<Jornada, 'id' | 'creado_en' | 'activa'> & {
          id?: string
          activa?: boolean
          creado_en?: string
        }
        Update: Partial<Omit<Jornada, 'id'>>
      }
      estudiantes: {
        Row: Estudiante
        Insert: Omit<Estudiante, 'id' | 'codigo_verificacion' | 'creado_en' | 'aprobado'> & {
          id?: string
          codigo_verificacion?: string
          aprobado?: boolean
          creado_en?: string
        }
        Update: Partial<Omit<Estudiante, 'id'>>
      }
      intentos_descarga: {
        Row: IntentoDescarga
        Insert: Omit<IntentoDescarga, 'id' | 'creado_en'> & { id?: string; creado_en?: string }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      listar_instituciones_activas: {
        Args: Record<string, never>
        Returns: { id: string; nombre: string; municipio: string }[]
      }
      buscar_estudiante_publico: {
        Args: { p_tipo_documento: string; p_numero_documento: string }
        Returns: { encontrado: boolean }[]
      }
    }
    Enums: Record<string, never>
  }
}
