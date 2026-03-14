// Manual types — replace with:
//   supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          display_name: string | null
          username: string | null
          avatar_url: string | null
          cert_level: string | null
          cert_agency: string | null
          cert_number: string | null
          home_city: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          username?: string | null
          avatar_url?: string | null
          cert_level?: string | null
          cert_agency?: string | null
          cert_number?: string | null
          home_city?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['users']['Insert']>
        Relationships: []
      }
      dive_sites: {
        Row: {
          id: string
          name: string
          slug: string | null
          location: string | null
          country: string | null
          region: string | null
          site_type: string | null
          avg_depth_ft: number | null
          max_depth_ft: number | null
          avg_visibility_ft: number | null
          log_count: number
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          location?: string | null
          country?: string | null
          region?: string | null
          site_type?: string | null
          avg_depth_ft?: number | null
          max_depth_ft?: number | null
          avg_visibility_ft?: number | null
          log_count?: number
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['dive_sites']['Insert']>
        Relationships: []
      }
      shops: {
        Row: {
          id: string
          name: string
          slug: string | null
          location: string | null
          address: string | null
          city: string | null
          state: string | null
          country: string | null
          phone: string | null
          website: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          location?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          phone?: string | null
          website?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
        Relationships: []
      }
      dive_logs: {
        Row: {
          id: string
          user_id: string | null
          dive_site_id: string | null
          shop_id: string | null
          custom_location: string | null
          dive_date: string
          dive_number: number | null
          max_depth_ft: number | null
          avg_depth_ft: number | null
          bottom_time_minutes: number | null
          surface_interval_minutes: number | null
          air_in_psi: number | null
          air_out_psi: number | null
          tank_size: string | null
          gas_mix: string | null
          visibility_ft: number | null
          water_temp_surface_f: number | null
          water_temp_bottom_f: number | null
          current: string | null
          weather: string | null
          wave_height_ft: number | null
          tide: string | null
          wetsuit_mm: number | null
          weight_lbs: number | null
          bcd: string | null
          computer: string | null
          notes: string | null
          marine_life: string[] | null
          buddy: string | null
          dive_type: string | null
          certification_earned: string | null
          uddf_file_url: string | null
          has_photos: boolean
          is_public: boolean
          location_lat: number | null
          location_lng: number | null
          profile_data: { t: number; d: number; tmp?: number }[] | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          dive_site_id?: string | null
          shop_id?: string | null
          custom_location?: string | null
          dive_date: string
          dive_number?: number | null
          max_depth_ft?: number | null
          avg_depth_ft?: number | null
          bottom_time_minutes?: number | null
          surface_interval_minutes?: number | null
          air_in_psi?: number | null
          air_out_psi?: number | null
          tank_size?: string | null
          gas_mix?: string | null
          visibility_ft?: number | null
          water_temp_surface_f?: number | null
          water_temp_bottom_f?: number | null
          current?: string | null
          weather?: string | null
          wave_height_ft?: number | null
          tide?: string | null
          wetsuit_mm?: number | null
          weight_lbs?: number | null
          bcd?: string | null
          computer?: string | null
          notes?: string | null
          marine_life?: string[] | null
          buddy?: string | null
          dive_type?: string | null
          certification_earned?: string | null
          uddf_file_url?: string | null
          has_photos?: boolean
          is_public?: boolean
          location_lat?: number | null
          location_lng?: number | null
          profile_data?: { t: number; d: number; tmp?: number }[] | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['dive_logs']['Insert']>
        Relationships: [
          { foreignKeyName: 'dive_logs_user_id_fkey'; columns: ['user_id']; referencedRelation: 'users'; referencedColumns: ['id'] },
          { foreignKeyName: 'dive_logs_dive_site_id_fkey'; columns: ['dive_site_id']; referencedRelation: 'dive_sites'; referencedColumns: ['id'] }
        ]
      }
      dive_photos: {
        Row: {
          id: string
          dive_log_id: string | null
          user_id: string | null
          url: string
          thumbnail_url: string | null
          caption: string | null
          width: number | null
          height: number | null
          taken_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dive_log_id?: string | null
          user_id?: string | null
          url: string
          thumbnail_url?: string | null
          caption?: string | null
          width?: number | null
          height?: number | null
          taken_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['dive_photos']['Insert']>
        Relationships: [
          { foreignKeyName: 'dive_photos_dive_log_id_fkey'; columns: ['dive_log_id']; referencedRelation: 'dive_logs'; referencedColumns: ['id'] }
        ]
      }
      gear: {
        Row: {
          id: string
          user_id: string | null
          type: string | null
          brand: string | null
          model: string | null
          purchased_at: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          type?: string | null
          brand?: string | null
          model?: string | null
          purchased_at?: string | null
          notes?: string | null
        }
        Update: Partial<Database['public']['Tables']['gear']['Insert']>
        Relationships: []
      }
      certifications: {
        Row: {
          id: string
          user_id: string | null
          agency: string | null
          level: string | null
          cert_number: string | null
          issued_date: string | null
          dive_log_id: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          agency?: string | null
          level?: string | null
          cert_number?: string | null
          issued_date?: string | null
          dive_log_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['certifications']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type User = Database['public']['Tables']['users']['Row']
export type DiveSite = Database['public']['Tables']['dive_sites']['Row']
export type Shop = Database['public']['Tables']['shops']['Row']
export type DiveLog = Database['public']['Tables']['dive_logs']['Row']
export type DivePhoto = Database['public']['Tables']['dive_photos']['Row']
export type Gear = Database['public']['Tables']['gear']['Row']
export type Certification = Database['public']['Tables']['certifications']['Row']

// DiveLog with joined site name (for list views)
export type DiveLogWithSite = DiveLog & {
  dive_sites: Pick<DiveSite, 'name' | 'slug' | 'country' | 'region'> | null
}
