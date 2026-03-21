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
      }
    }
    Functions: {
      get_country_counts: {
        Args: Record<string, never>
        Returns: { country: string; count: number }[]
      }
    }
  }
}
