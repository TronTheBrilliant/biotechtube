export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          slug: string
          name: string
          country: string
          city: string | null
          website: string | null
          domain: string | null
          categories: string[]
          description: string | null
          founded: number | null
          employee_range: string | null
          stage: string | null
          company_type: string | null
          ticker: string | null
          logo_url: string | null
          total_raised: number | null
          valuation: number | null
          is_estimated: boolean
          trending_rank: number | null
          profile_views: number
          source: string
          source_url: string | null
          enriched_at: string | null
          created_at: string
          updated_at: string
          fts: unknown | null
        }
        Insert: {
          id?: string
          slug: string
          name: string
          country: string
          city?: string | null
          website?: string | null
          domain?: string | null
          categories?: string[]
          description?: string | null
          founded?: number | null
          employee_range?: string | null
          stage?: string | null
          company_type?: string | null
          ticker?: string | null
          logo_url?: string | null
          total_raised?: number | null
          valuation?: number | null
          is_estimated?: boolean
          trending_rank?: number | null
          profile_views?: number
          source?: string
          source_url?: string | null
          enriched_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          country?: string
          city?: string | null
          website?: string | null
          domain?: string | null
          categories?: string[]
          description?: string | null
          founded?: number | null
          employee_range?: string | null
          stage?: string | null
          company_type?: string | null
          ticker?: string | null
          logo_url?: string | null
          total_raised?: number | null
          valuation?: number | null
          is_estimated?: boolean
          trending_rank?: number | null
          profile_views?: number
          source?: string
          source_url?: string | null
          enriched_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          company: string | null
          role: string | null
          bio: string | null
          avatar_url: string | null
          tier: string
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          company?: string | null
          role?: string | null
          bio?: string | null
          avatar_url?: string | null
          tier?: string
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string | null
          company?: string | null
          role?: string | null
          bio?: string | null
          avatar_url?: string | null
          tier?: string
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      watchlist_items: {
        Row: {
          id: string
          watchlist_id: string
          company_id: string
          added_at: string
        }
        Insert: {
          id?: string
          watchlist_id: string
          company_id: string
          added_at?: string
        }
        Update: {
          watchlist_id?: string
          company_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          }
        ]
      }
      scrape_log: {
        Row: {
          id: string
          source: string
          url: string
          status: string
          company_count: number
          error_message: string | null
          started_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          source: string
          url: string
          status?: string
          company_count?: number
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
        }
        Update: {
          source?: string
          url?: string
          status?: string
          company_count?: number
          error_message?: string | null
          completed_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_country_counts: {
        Args: Record<string, never>
        Returns: { country: string; count: number }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
