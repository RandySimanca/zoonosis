/**
 * Tipos TypeScript que reflejan el esquema de base de datos.
 * Actualizar aquí cuando cambien las migraciones.
 */

export type TipoDocumento = 'RC' | 'TI' | 'CC' | 'CE' | 'PPT' | 'PEP'

export interface Institucion {
  id: string
  nombre: string
  municipio: string
  fecha_expedicion: string // ISO date: "YYYY-MM-DD"
  activa: boolean
  contratista_id: string | null
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
  creado_en: string
}

export interface Estudiante {
  id: string
  institucion_id: string
  tipo_documento: TipoDocumento
  numero_documento: string
  nombre_completo: string
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
 * Se puede regenerar con: supabase gen types typescript --local > src/types/database.ts
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
        Insert: Omit<Firmante, 'id' | 'creado_en' | 'es_fijo' | 'orden_fijo'> & {
          id?: string
          es_fijo?: boolean
          orden_fijo?: 1 | 2 | null
          creado_en?: string
        }
        Update: Partial<Omit<Firmante, 'id'>>
      }
      estudiantes: {
        Row: Estudiante
        Insert: Omit<Estudiante, 'id' | 'codigo_verificacion' | 'creado_en'> & {
          id?: string
          codigo_verificacion?: string
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
    }
    Enums: Record<string, never>
  }
}
