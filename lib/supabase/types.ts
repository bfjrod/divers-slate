// Manual types — replace with output from:
//   supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string
          name: string
          slug: string
          location: string | null    // EWKT string for PostGIS geography(point, 4326)
          address: string | null
          city: string | null
          state: string | null
          phone: string | null
          website: string | null
          description: string | null
          certifications_accepted: string[] | null
          booking_platform: string | null
          booking_platform_id: string | null
          padi_rating: string | null
          established_year: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          location?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          phone?: string | null
          website?: string | null
          description?: string | null
          certifications_accepted?: string[] | null
          booking_platform?: string | null
          booking_platform_id?: string | null
          padi_rating?: string | null
          established_year?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['shops']['Insert']>
        Relationships: []
      }
      dive_offerings: {
        Row: {
          id: string
          shop_id: string | null
          name: string
          type: string | null
          max_depth_ft: number | null
          min_certification: string | null
          max_divers: number | null
          duration_minutes: number | null
          price_usd: number | null
          description: string | null
        }
        Insert: {
          id?: string
          shop_id?: string | null
          name: string
          type?: string | null
          max_depth_ft?: number | null
          min_certification?: string | null
          max_divers?: number | null
          duration_minutes?: number | null
          price_usd?: number | null
          description?: string | null
        }
        Update: Partial<Database['public']['Tables']['dive_offerings']['Insert']>
        Relationships: [
          { foreignKeyName: 'dive_offerings_shop_id_fkey'; columns: ['shop_id']; referencedRelation: 'shops'; referencedColumns: ['id'] }
        ]
      }
      dive_logs: {
        Row: {
          id: string
          user_id: string | null
          shop_id: string | null
          dive_offering_id: string | null
          logged_at: string
          dive_date: string
          visibility_ft: number | null
          water_temp_f: number | null
          current: string | null
          max_depth_ft: number | null
          bottom_time_minutes: number | null
          notes: string | null
          uddf_file_url: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          shop_id?: string | null
          dive_offering_id?: string | null
          logged_at?: string
          dive_date: string
          visibility_ft?: number | null
          water_temp_f?: number | null
          current?: string | null
          max_depth_ft?: number | null
          bottom_time_minutes?: number | null
          notes?: string | null
          uddf_file_url?: string | null
        }
        Update: Partial<Database['public']['Tables']['dive_logs']['Insert']>
        Relationships: [
          { foreignKeyName: 'dive_logs_shop_id_fkey'; columns: ['shop_id']; referencedRelation: 'shops'; referencedColumns: ['id'] },
          { foreignKeyName: 'dive_logs_dive_offering_id_fkey'; columns: ['dive_offering_id']; referencedRelation: 'dive_offerings'; referencedColumns: ['id'] }
        ]
      }
      reviews: {
        Row: {
          id: string
          shop_id: string | null
          user_id: string | null
          dive_log_id: string | null
          rating_overall: number | null
          rating_instructor: number | null
          rating_equipment: number | null
          rating_value: number | null
          rating_safety: number | null
          body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id?: string | null
          user_id?: string | null
          dive_log_id?: string | null
          rating_overall?: number | null
          rating_instructor?: number | null
          rating_equipment?: number | null
          rating_value?: number | null
          rating_safety?: number | null
          body?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>
        Relationships: [
          { foreignKeyName: 'reviews_shop_id_fkey'; columns: ['shop_id']; referencedRelation: 'shops'; referencedColumns: ['id'] },
          { foreignKeyName: 'reviews_dive_log_id_fkey'; columns: ['dive_log_id']; referencedRelation: 'dive_logs'; referencedColumns: ['id'] }
        ]
      }
      photos: {
        Row: {
          id: string
          dive_log_id: string | null
          user_id: string | null
          r2_key: string
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          dive_log_id?: string | null
          user_id?: string | null
          r2_key: string
          caption?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['photos']['Insert']>
        Relationships: [
          { foreignKeyName: 'photos_dive_log_id_fkey'; columns: ['dive_log_id']; referencedRelation: 'dive_logs'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: {
      shops_geo: {
        Row: {
          id: string
          name: string
          slug: string
          city: string | null
          state: string | null
          lat: number | null
          lng: number | null
        }
        Relationships: []
      }
    }
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Shop = Database['public']['Tables']['shops']['Row']
export type DiveOffering = Database['public']['Tables']['dive_offerings']['Row']
export type DiveLog = Database['public']['Tables']['dive_logs']['Row']
export type Review = Database['public']['Tables']['reviews']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type ShopGeo = Database['public']['Views']['shops_geo']['Row']

// Shop with coordinates (for map rendering)
export type ShopWithCoords = Omit<Shop, 'location'> & {
  lng: number
  lat: number
}
