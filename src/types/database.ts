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
  creado_en: string
}

export interface Firmante {
  id: string
  nombre: string
  cargo: string
  firma_path: string
  creado_en: string
}

export interface InstitucionFirmante {
  institucion_id: string
  firmante_id: string
  orden: 1 | 2 | 3
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
        Insert: Omit<Firmante, 'id' | 'creado_en'> & { id?: string; creado_en?: string }
        Update: Partial<Omit<Firmante, 'id'>>
      }
      institucion_firmantes: {
        Row: InstitucionFirmante
        Insert: InstitucionFirmante
        Update: Partial<InstitucionFirmante>
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
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
