export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_ai_models: {
        Row: {
          api_key_direct: string | null
          api_key_env_var: string | null
          base_url: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          model_id: string
          name: string
          provider: string
        }
        Insert: {
          api_key_direct?: string | null
          api_key_env_var?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          model_id: string
          name: string
          provider: string
        }
        Update: {
          api_key_direct?: string | null
          api_key_env_var?: string | null
          base_url?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          model_id?: string
          name?: string
          provider?: string
        }
        Relationships: []
      }
      admin_chat_history: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          model_used: string | null
          role: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          role: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          model_used?: string | null
          role?: string
        }
        Relationships: []
      }
      agent_config: {
        Row: {
          agent_id: string
          batch_size: number
          config: Json | null
          enabled: boolean
          last_run_id: string | null
          model_id: string | null
          schedule_cron: string
        }
        Insert: {
          agent_id: string
          batch_size?: number
          config?: Json | null
          enabled?: boolean
          last_run_id?: string | null
          model_id?: string | null
          schedule_cron: string
        }
        Update: {
          agent_id?: string
          batch_size?: number
          config?: Json | null
          enabled?: boolean
          last_run_id?: string | null
          model_id?: string | null
          schedule_cron?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_config_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_fixes: {
        Row: {
          confidence: number | null
          created_at: string
          entity_id: string
          entity_type: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          run_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          entity_id: string
          entity_type: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          run_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_fixes_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          agent_id: string
          completed_at: string | null
          details: Json | null
          id: string
          issues_found: number | null
          items_fixed: number | null
          items_scanned: number | null
          model_used: string | null
          started_at: string
          status: string
          summary: string | null
          triggered_by: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          details?: Json | null
          id?: string
          issues_found?: number | null
          items_fixed?: number | null
          items_scanned?: number | null
          model_used?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          triggered_by?: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          details?: Json | null
          id?: string
          issues_found?: number | null
          items_fixed?: number | null
          items_scanned?: number | null
          model_used?: string | null
          started_at?: string
          status?: string
          summary?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      ai_ml_devices: {
        Row: {
          ai_ml_category: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          decision_date: string | null
          device_name: string
          id: string
          medical_specialty: string | null
          panel: string | null
          product_type: string | null
          slug: string | null
          source_url: string | null
          submission_number: string | null
          submission_type: string | null
        }
        Insert: {
          ai_ml_category?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          decision_date?: string | null
          device_name: string
          id?: string
          medical_specialty?: string | null
          panel?: string | null
          product_type?: string | null
          slug?: string | null
          source_url?: string | null
          submission_number?: string | null
          submission_type?: string | null
        }
        Update: {
          ai_ml_category?: string | null
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          decision_date?: string | null
          device_name?: string
          id?: string
          medical_specialty?: string | null
          panel?: string | null
          product_type?: string | null
          slug?: string | null
          source_url?: string | null
          submission_number?: string | null
          submission_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_ml_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      biotech_events: {
        Row: {
          city: string | null
          country: string | null
          country_flag: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          source: string | null
          start_date: string
          type: string | null
          url: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_flag?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          source?: string | null
          start_date: string
          type?: string | null
          url?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_flag?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          source?: string | null
          start_date?: string
          type?: string | null
          url?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          slug: string
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          content: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug: string
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          slug?: string
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          categories: string[] | null
          city: string | null
          company_type: string | null
          country: string
          created_at: string | null
          description: string | null
          domain: string | null
          employee_range: string | null
          engagement_score: number | null
          enriched_at: string | null
          fda_approval_count: number | null
          founded: number | null
          fts: unknown
          id: string
          is_estimated: boolean | null
          last_enhanced_at: string | null
          logo_url: string | null
          name: string
          profile_completeness: number | null
          profile_level: number | null
          profile_views: number | null
          publication_count: number | null
          quality_score: number | null
          shares_outstanding: number | null
          slug: string
          source: string
          source_url: string | null
          stage: string | null
          ticker: string | null
          total_raised: number | null
          trending_rank: number | null
          updated_at: string | null
          valuation: number | null
          website: string | null
        }
        Insert: {
          categories?: string[] | null
          city?: string | null
          company_type?: string | null
          country: string
          created_at?: string | null
          description?: string | null
          domain?: string | null
          employee_range?: string | null
          engagement_score?: number | null
          enriched_at?: string | null
          fda_approval_count?: number | null
          founded?: number | null
          fts?: unknown
          id?: string
          is_estimated?: boolean | null
          last_enhanced_at?: string | null
          logo_url?: string | null
          name: string
          profile_completeness?: number | null
          profile_level?: number | null
          profile_views?: number | null
          publication_count?: number | null
          quality_score?: number | null
          shares_outstanding?: number | null
          slug: string
          source?: string
          source_url?: string | null
          stage?: string | null
          ticker?: string | null
          total_raised?: number | null
          trending_rank?: number | null
          updated_at?: string | null
          valuation?: number | null
          website?: string | null
        }
        Update: {
          categories?: string[] | null
          city?: string | null
          company_type?: string | null
          country?: string
          created_at?: string | null
          description?: string | null
          domain?: string | null
          employee_range?: string | null
          engagement_score?: number | null
          enriched_at?: string | null
          fda_approval_count?: number | null
          founded?: number | null
          fts?: unknown
          id?: string
          is_estimated?: boolean | null
          last_enhanced_at?: string | null
          logo_url?: string | null
          name?: string
          profile_completeness?: number | null
          profile_level?: number | null
          profile_views?: number | null
          publication_count?: number | null
          quality_score?: number | null
          shares_outstanding?: number | null
          slug?: string
          source?: string
          source_url?: string | null
          stage?: string | null
          ticker?: string | null
          total_raised?: number | null
          trending_rank?: number | null
          updated_at?: string | null
          valuation?: number | null
          website?: string | null
        }
        Relationships: []
      }
      company_claims: {
        Row: {
          brand_color: string | null
          company_id: string
          contact_email: string | null
          created_at: string | null
          custom_sections: Json | null
          hero_tagline: string | null
          id: string
          investor_deck_url: string | null
          plan: string | null
          status: string | null
          user_id: string
          verification_method: string | null
          verified_at: string | null
          video_url: string | null
        }
        Insert: {
          brand_color?: string | null
          company_id: string
          contact_email?: string | null
          created_at?: string | null
          custom_sections?: Json | null
          hero_tagline?: string | null
          id?: string
          investor_deck_url?: string | null
          plan?: string | null
          status?: string | null
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
          video_url?: string | null
        }
        Update: {
          brand_color?: string | null
          company_id?: string
          contact_email?: string | null
          created_at?: string | null
          custom_sections?: Json | null
          hero_tagline?: string | null
          id?: string
          investor_deck_url?: string | null
          plan?: string | null
          status?: string | null
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_claims_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_inquiries: {
        Row: {
          company_id: string
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          read: boolean | null
          sender_company: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          read?: boolean | null
          sender_company?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean | null
          sender_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_inquiries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_jobs: {
        Row: {
          apply_url: string | null
          company_id: string
          department: string | null
          description: string | null
          id: string
          location: string | null
          posted_at: string | null
          status: string | null
          title: string
          type: string | null
        }
        Insert: {
          apply_url?: string | null
          company_id: string
          department?: string | null
          description?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          status?: string | null
          title: string
          type?: string | null
        }
        Update: {
          apply_url?: string | null
          company_id?: string
          department?: string | null
          description?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_news: {
        Row: {
          company_id: string
          content: string | null
          created_by: string | null
          id: string
          published_at: string | null
          title: string
        }
        Insert: {
          company_id: string
          content?: string | null
          created_by?: string | null
          id?: string
          published_at?: string | null
          title: string
        }
        Update: {
          company_id?: string
          content?: string | null
          created_by?: string | null
          id?: string
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_news_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_price_history: {
        Row: {
          adj_close: number | null
          change_pct: number | null
          close: number | null
          close_price: number | null
          company_id: string
          created_at: string | null
          currency: string | null
          date: string | null
          high: number | null
          high_price: number | null
          id: string
          low: number | null
          low_price: number | null
          market_cap: number | null
          market_cap_usd: number | null
          open: number | null
          open_price: number | null
          price_date: string | null
          ticker: string | null
          updated_at: string | null
          volume: number | null
        }
        Insert: {
          adj_close?: number | null
          change_pct?: number | null
          close?: number | null
          close_price?: number | null
          company_id: string
          created_at?: string | null
          currency?: string | null
          date?: string | null
          high?: number | null
          high_price?: number | null
          id?: string
          low?: number | null
          low_price?: number | null
          market_cap?: number | null
          market_cap_usd?: number | null
          open?: number | null
          open_price?: number | null
          price_date?: string | null
          ticker?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Update: {
          adj_close?: number | null
          change_pct?: number | null
          close?: number | null
          close_price?: number | null
          company_id?: string
          created_at?: string | null
          currency?: string | null
          date?: string | null
          high?: number | null
          high_price?: number | null
          id?: string
          low?: number | null
          low_price?: number | null
          market_cap?: number | null
          market_cap_usd?: number | null
          open?: number | null
          open_price?: number | null
          price_date?: string | null
          ticker?: string | null
          updated_at?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_price_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reports: {
        Row: {
          analyzed_at: string | null
          business_model: string | null
          company_id: string
          company_type: string | null
          competitive_landscape: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          deep_report: string | null
          employee_estimate: string | null
          exchange: string | null
          founded: number | null
          funding_mentions: string[] | null
          headquarters_city: string | null
          headquarters_country: string | null
          id: string
          investors: string[] | null
          key_people: Json | null
          opportunities: string | null
          pages_scraped: string[] | null
          partners: string[] | null
          pipeline_programs: Json | null
          report_slug: string
          revenue_status: string | null
          risks: string | null
          scraped_at: string | null
          stage: string | null
          summary: string | null
          technology_platform: string | null
          therapeutic_areas: string[] | null
          ticker: string | null
          total_raised_estimate: number | null
        }
        Insert: {
          analyzed_at?: string | null
          business_model?: string | null
          company_id: string
          company_type?: string | null
          competitive_landscape?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          deep_report?: string | null
          employee_estimate?: string | null
          exchange?: string | null
          founded?: number | null
          funding_mentions?: string[] | null
          headquarters_city?: string | null
          headquarters_country?: string | null
          id?: string
          investors?: string[] | null
          key_people?: Json | null
          opportunities?: string | null
          pages_scraped?: string[] | null
          partners?: string[] | null
          pipeline_programs?: Json | null
          report_slug: string
          revenue_status?: string | null
          risks?: string | null
          scraped_at?: string | null
          stage?: string | null
          summary?: string | null
          technology_platform?: string | null
          therapeutic_areas?: string[] | null
          ticker?: string | null
          total_raised_estimate?: number | null
        }
        Update: {
          analyzed_at?: string | null
          business_model?: string | null
          company_id?: string
          company_type?: string | null
          competitive_landscape?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          deep_report?: string | null
          employee_estimate?: string | null
          exchange?: string | null
          founded?: number | null
          funding_mentions?: string[] | null
          headquarters_city?: string | null
          headquarters_country?: string | null
          id?: string
          investors?: string[] | null
          key_people?: Json | null
          opportunities?: string | null
          pages_scraped?: string[] | null
          partners?: string[] | null
          pipeline_programs?: Json | null
          report_slug?: string
          revenue_status?: string | null
          risks?: string | null
          scraped_at?: string | null
          stage?: string | null
          summary?: string | null
          technology_platform?: string | null
          therapeutic_areas?: string[] | null
          ticker?: string | null
          total_raised_estimate?: number | null
        }
        Relationships: []
      }
      company_sectors: {
        Row: {
          assigned_by: string | null
          classified_at: string | null
          company_id: string
          confidence: number | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          relevance_score: number | null
          sector_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          classified_at?: string | null
          company_id: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          relevance_score?: number | null
          sector_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          classified_at?: string | null
          company_id?: string
          confidence?: number | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          relevance_score?: number | null
          sector_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_sectors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      company_seo: {
        Row: {
          company_id: string
          meta_description: string | null
          og_description: string | null
          og_title: string | null
          structured_data: Json | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          meta_description?: string | null
          og_description?: string | null
          og_title?: string | null
          structured_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          meta_description?: string | null
          og_description?: string | null
          og_title?: string | null
          structured_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_seo_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_team: {
        Row: {
          bio: string | null
          company_id: string
          created_at: string | null
          display_order: number | null
          id: string
          linkedin_url: string | null
          name: string
          photo_url: string | null
          title: string | null
        }
        Insert: {
          bio?: string | null
          company_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          linkedin_url?: string | null
          name: string
          photo_url?: string | null
          title?: string | null
        }
        Update: {
          bio?: string | null
          company_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          linkedin_url?: string | null
          name?: string
          photo_url?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_team_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_updates: {
        Row: {
          company_id: string
          field_name: string
          field_value: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_id: string
          field_name: string
          field_value?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_id?: string
          field_name?: string
          field_value?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_updates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_visuals: {
        Row: {
          ai_model_used: string | null
          ai_prompt_used: string | null
          chart_config: Json | null
          company_id: string
          created_at: string | null
          description: string | null
          display_order: number | null
          html_content: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_visible: boolean | null
          svg_content: string | null
          title: string | null
          updated_at: string | null
          version: number | null
          video_url: string | null
          visual_type: string
        }
        Insert: {
          ai_model_used?: string | null
          ai_prompt_used?: string | null
          chart_config?: Json | null
          company_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          svg_content?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
          video_url?: string | null
          visual_type: string
        }
        Update: {
          ai_model_used?: string | null
          ai_prompt_used?: string | null
          chart_config?: Json | null
          company_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          html_content?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_visible?: boolean | null
          svg_content?: string | null
          title?: string | null
          updated_at?: string | null
          version?: number | null
          video_url?: string | null
          visual_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_visuals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      country_market_data: {
        Row: {
          change_1d_pct: number | null
          change_30d_pct: number | null
          change_7d_pct: number | null
          combined_market_cap: number | null
          company_count: number | null
          country: string
          created_at: string | null
          funding_round_count_ytd: number | null
          funding_total_mtd: number | null
          funding_total_qtd: number | null
          funding_total_ytd: number | null
          id: string
          public_company_count: number | null
          sector_breakdown: Json | null
          snapshot_date: string
          total_volume: number | null
        }
        Insert: {
          change_1d_pct?: number | null
          change_30d_pct?: number | null
          change_7d_pct?: number | null
          combined_market_cap?: number | null
          company_count?: number | null
          country: string
          created_at?: string | null
          funding_round_count_ytd?: number | null
          funding_total_mtd?: number | null
          funding_total_qtd?: number | null
          funding_total_ytd?: number | null
          id?: string
          public_company_count?: number | null
          sector_breakdown?: Json | null
          snapshot_date: string
          total_volume?: number | null
        }
        Update: {
          change_1d_pct?: number | null
          change_30d_pct?: number | null
          change_7d_pct?: number | null
          combined_market_cap?: number | null
          company_count?: number | null
          country?: string
          created_at?: string | null
          funding_round_count_ytd?: number | null
          funding_total_mtd?: number | null
          funding_total_qtd?: number | null
          funding_total_ytd?: number | null
          id?: string
          public_company_count?: number | null
          sector_breakdown?: Json | null
          snapshot_date?: string
          total_volume?: number | null
        }
        Relationships: []
      }
      curated_watchlist_items: {
        Row: {
          added_at: string | null
          id: string
          pipeline_id: string
          rank: number | null
          reason: string | null
          watchlist_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          pipeline_id: string
          rank?: number | null
          reason?: string | null
          watchlist_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          pipeline_id?: string
          rank?: number | null
          reason?: string | null
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_watchlist_items_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "curated_watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      curated_watchlists: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          market_cap_max: number | null
          market_cap_min: number | null
          name: string
          slug: string
          therapeutic_filter: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          market_cap_max?: number | null
          market_cap_min?: number | null
          name: string
          slug: string
          therapeutic_filter?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          market_cap_max?: number | null
          market_cap_min?: number | null
          name?: string
          slug?: string
          therapeutic_filter?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      drug_mentions: {
        Row: {
          article_title: string | null
          article_url: string | null
          company_name: string | null
          created_at: string | null
          drug_name: string
          id: string
          mentioned_at: string
          pipeline_id: string | null
          source: string
        }
        Insert: {
          article_title?: string | null
          article_url?: string | null
          company_name?: string | null
          created_at?: string | null
          drug_name: string
          id?: string
          mentioned_at: string
          pipeline_id?: string | null
          source: string
        }
        Update: {
          article_title?: string | null
          article_url?: string | null
          company_name?: string | null
          created_at?: string | null
          drug_name?: string
          id?: string
          mentioned_at?: string
          pipeline_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_mentions_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      error_reports: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string
          id: string
          issue_type: string | null
          page_url: string | null
          reported_by: string | null
          reporter_email: string | null
          resolution_note: string | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          issue_type?: string | null
          page_url?: string | null
          reported_by?: string | null
          reporter_email?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          issue_type?: string | null
          page_url?: string | null
          reported_by?: string | null
          reporter_email?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fda_approvals: {
        Row: {
          active_ingredient: string | null
          application_number: string | null
          application_type: string | null
          approval_date: string | null
          company_id: string | null
          company_name: string
          created_at: string | null
          dosage_form: string | null
          drug_name: string
          id: string
          indication: string | null
          route: string | null
          source_name: string | null
        }
        Insert: {
          active_ingredient?: string | null
          application_number?: string | null
          application_type?: string | null
          approval_date?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string | null
          dosage_form?: string | null
          drug_name: string
          id?: string
          indication?: string | null
          route?: string | null
          source_name?: string | null
        }
        Update: {
          active_ingredient?: string | null
          application_number?: string | null
          application_type?: string | null
          approval_date?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          dosage_form?: string | null
          drug_name?: string
          id?: string
          indication?: string | null
          route?: string | null
          source_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fda_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      fda_calendar: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          decision_date: string
          decision_type: string | null
          drug_name: string
          id: string
          indication: string | null
          notes: string | null
          pipeline_id: string | null
          source_url: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          decision_date: string
          decision_type?: string | null
          drug_name: string
          id?: string
          indication?: string | null
          notes?: string | null
          pipeline_id?: string | null
          source_url?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          decision_date?: string
          decision_type?: string | null
          drug_name?: string
          id?: string
          indication?: string | null
          notes?: string | null
          pipeline_id?: string | null
          source_url?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fda_calendar_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fda_calendar_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      featured_pipelines: {
        Row: {
          ai_summary: string | null
          competitive_landscape: string | null
          created_at: string | null
          featured_month: string | null
          id: string
          investment_thesis: string | null
          key_facts: Json | null
          pipeline_id: string | null
          rank: number | null
          reason: string | null
          risk_factors: string | null
        }
        Insert: {
          ai_summary?: string | null
          competitive_landscape?: string | null
          created_at?: string | null
          featured_month?: string | null
          id?: string
          investment_thesis?: string | null
          key_facts?: Json | null
          pipeline_id?: string | null
          rank?: number | null
          reason?: string | null
          risk_factors?: string | null
        }
        Update: {
          ai_summary?: string | null
          competitive_landscape?: string | null
          created_at?: string | null
          featured_month?: string | null
          id?: string
          investment_thesis?: string | null
          key_facts?: Json | null
          pipeline_id?: string | null
          rank?: number | null
          reason?: string | null
          risk_factors?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_pipelines_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      funding_rounds: {
        Row: {
          amount: number | null
          amount_usd: number | null
          announced_date: string | null
          company_id: string | null
          company_name: string
          confidence: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          id: string
          investors: string[] | null
          lead_investor: string | null
          round_type: string | null
          sector: string | null
          source_name: string | null
          source_url: string | null
          stage_at_funding: string | null
        }
        Insert: {
          amount?: number | null
          amount_usd?: number | null
          announced_date?: string | null
          company_id?: string | null
          company_name: string
          confidence?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          investors?: string[] | null
          lead_investor?: string | null
          round_type?: string | null
          sector?: string | null
          source_name?: string | null
          source_url?: string | null
          stage_at_funding?: string | null
        }
        Update: {
          amount?: number | null
          amount_usd?: number | null
          announced_date?: string | null
          company_id?: string | null
          company_name?: string
          confidence?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          investors?: string[] | null
          lead_investor?: string | null
          round_type?: string | null
          sector?: string | null
          source_name?: string | null
          source_url?: string | null
          stage_at_funding?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      integrity_checks: {
        Row: {
          check_type: string
          created_at: string | null
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string | null
          id: string
          resolved_at: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          check_type: string
          created_at?: string | null
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string | null
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string | null
          id?: string
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: []
      }
      market_snapshots: {
        Row: {
          change_1d_pct: number | null
          change_30d_pct: number | null
          change_7d_pct: number | null
          change_ytd_pct: number | null
          created_at: string | null
          id: string
          public_companies_count: number | null
          snapshot_date: string
          top_gainer_id: string | null
          top_gainer_pct: number | null
          top_gainers: Json | null
          top_loser_id: string | null
          top_loser_pct: number | null
          top_losers: Json | null
          total_companies_tracked: number | null
          total_market_cap: number | null
          total_volume: number | null
        }
        Insert: {
          change_1d_pct?: number | null
          change_30d_pct?: number | null
          change_7d_pct?: number | null
          change_ytd_pct?: number | null
          created_at?: string | null
          id?: string
          public_companies_count?: number | null
          snapshot_date: string
          top_gainer_id?: string | null
          top_gainer_pct?: number | null
          top_gainers?: Json | null
          top_loser_id?: string | null
          top_loser_pct?: number | null
          top_losers?: Json | null
          total_companies_tracked?: number | null
          total_market_cap?: number | null
          total_volume?: number | null
        }
        Update: {
          change_1d_pct?: number | null
          change_30d_pct?: number | null
          change_7d_pct?: number | null
          change_ytd_pct?: number | null
          created_at?: string | null
          id?: string
          public_companies_count?: number | null
          snapshot_date?: string
          top_gainer_id?: string | null
          top_gainer_pct?: number | null
          top_gainers?: Json | null
          top_loser_id?: string | null
          top_loser_pct?: number | null
          top_losers?: Json | null
          total_companies_tracked?: number | null
          total_market_cap?: number | null
          total_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "market_snapshots_top_gainer_id_fkey"
            columns: ["top_gainer_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_snapshots_top_loser_id_fkey"
            columns: ["top_loser_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_devices: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string | null
          decision: string | null
          decision_date: string | null
          device_class: string | null
          device_name: string
          id: string
          medical_specialty: string | null
          product_code: string | null
          product_type: string | null
          review_panel: string | null
          slug: string | null
          source_url: string | null
          submission_number: string | null
          submission_type: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          device_class?: string | null
          device_name: string
          id?: string
          medical_specialty?: string | null
          product_code?: string | null
          product_type?: string | null
          review_panel?: string | null
          slug?: string | null
          source_url?: string | null
          submission_number?: string | null
          submission_type?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string | null
          decision?: string | null
          decision_date?: string | null
          device_class?: string | null
          device_name?: string
          id?: string
          medical_specialty?: string | null
          product_code?: string | null
          product_type?: string | null
          review_panel?: string | null
          slug?: string | null
          source_url?: string | null
          submission_number?: string | null
          submission_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      news_items: {
        Row: {
          category: string | null
          companies_mentioned: string[] | null
          id: string
          published_date: string | null
          scraped_at: string | null
          source_name: string
          source_url: string | null
          summary: string | null
          title: string
        }
        Insert: {
          category?: string | null
          companies_mentioned?: string[] | null
          id?: string
          published_date?: string | null
          scraped_at?: string | null
          source_name: string
          source_url?: string | null
          summary?: string | null
          title: string
        }
        Update: {
          category?: string | null
          companies_mentioned?: string[] | null
          id?: string
          published_date?: string | null
          scraped_at?: string | null
          source_name?: string
          source_url?: string | null
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          source: string | null
          subscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string | null
        }
        Relationships: []
      }
      patents: {
        Row: {
          abstract: string | null
          company_id: string | null
          company_name: string
          created_at: string | null
          filing_date: string | null
          grant_date: string | null
          id: string
          inventors: string[] | null
          patent_number: string
          source_name: string | null
          title: string | null
        }
        Insert: {
          abstract?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string | null
          filing_date?: string | null
          grant_date?: string | null
          id?: string
          inventors?: string[] | null
          patent_number: string
          source_name?: string | null
          title?: string | null
        }
        Update: {
          abstract?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          filing_date?: string | null
          grant_date?: string | null
          id?: string
          inventors?: string[] | null
          patent_number?: string
          source_name?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          company_id: string | null
          company_name: string
          completion_date: string | null
          conditions: string[] | null
          created_at: string | null
          id: string
          indication: string | null
          mechanism_of_action: string | null
          nct_id: string | null
          product_name: string
          slug: string | null
          source_name: string | null
          stage: string
          start_date: string | null
          trial_status: string | null
        }
        Insert: {
          company_id?: string | null
          company_name: string
          completion_date?: string | null
          conditions?: string[] | null
          created_at?: string | null
          id?: string
          indication?: string | null
          mechanism_of_action?: string | null
          nct_id?: string | null
          product_name: string
          slug?: string | null
          source_name?: string | null
          stage: string
          start_date?: string | null
          trial_status?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string
          completion_date?: string | null
          conditions?: string[] | null
          created_at?: string | null
          id?: string
          indication?: string | null
          mechanism_of_action?: string | null
          nct_id?: string | null
          product_name?: string
          slug?: string | null
          source_name?: string | null
          stage?: string
          start_date?: string | null
          trial_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_scores: {
        Row: {
          activity_score: number | null
          clinical_score: number | null
          community_score: number | null
          company_id: string | null
          company_score: number | null
          hype_score: number | null
          id: string
          last_calculated: string | null
          novelty_score: number | null
          pipeline_id: string | null
          product_name: string
          trending_direction: string | null
          view_count_30d: number | null
          view_count_7d: number | null
          watchlist_count: number | null
        }
        Insert: {
          activity_score?: number | null
          clinical_score?: number | null
          community_score?: number | null
          company_id?: string | null
          company_score?: number | null
          hype_score?: number | null
          id?: string
          last_calculated?: string | null
          novelty_score?: number | null
          pipeline_id?: string | null
          product_name: string
          trending_direction?: string | null
          view_count_30d?: number | null
          view_count_7d?: number | null
          watchlist_count?: number | null
        }
        Update: {
          activity_score?: number | null
          clinical_score?: number | null
          community_score?: number | null
          company_id?: string | null
          company_score?: number | null
          hype_score?: number | null
          id?: string
          last_calculated?: string | null
          novelty_score?: number | null
          pipeline_id?: string | null
          product_name?: string
          trending_direction?: string | null
          view_count_30d?: number | null
          view_count_7d?: number | null
          watchlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_scores_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: true
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sponsorships: {
        Row: {
          company_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          pipeline_id: string | null
          plan: string | null
          product_name: string
          starts_at: string | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pipeline_id?: string | null
          plan?: string | null
          product_name: string
          starts_at?: string | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          pipeline_id?: string | null
          plan?: string | null
          product_name?: string
          starts_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_sponsorships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_sponsorships_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          id: string
          pipeline_id: string | null
          source: string | null
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          pipeline_id?: string | null
          source?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          pipeline_id?: string | null
          source?: string | null
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_daily_stats: {
        Row: {
          avg_time_on_page_seconds: number | null
          bounce_rate: number | null
          claim_clicks: number | null
          company_id: string
          contact_clicks: number | null
          created_at: string | null
          deep_engagement_rate: number | null
          id: string
          match_clicks: number | null
          page_views: number | null
          report_downloads: number | null
          share_clicks: number | null
          stat_date: string
          top_orgs: Json | null
          unique_orgs: number | null
          unique_visitors: number | null
          video_plays: number | null
          watchlist_adds: number | null
          website_clicks: number | null
        }
        Insert: {
          avg_time_on_page_seconds?: number | null
          bounce_rate?: number | null
          claim_clicks?: number | null
          company_id: string
          contact_clicks?: number | null
          created_at?: string | null
          deep_engagement_rate?: number | null
          id?: string
          match_clicks?: number | null
          page_views?: number | null
          report_downloads?: number | null
          share_clicks?: number | null
          stat_date: string
          top_orgs?: Json | null
          unique_orgs?: number | null
          unique_visitors?: number | null
          video_plays?: number | null
          watchlist_adds?: number | null
          website_clicks?: number | null
        }
        Update: {
          avg_time_on_page_seconds?: number | null
          bounce_rate?: number | null
          claim_clicks?: number | null
          company_id?: string
          contact_clicks?: number | null
          created_at?: string | null
          deep_engagement_rate?: number | null
          id?: string
          match_clicks?: number | null
          page_views?: number | null
          report_downloads?: number | null
          share_clicks?: number | null
          stat_date?: string
          top_orgs?: Json | null
          unique_orgs?: number | null
          unique_visitors?: number | null
          video_plays?: number | null
          watchlist_adds?: number | null
          website_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_daily_stats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_enhancements: {
        Row: {
          attempts: number | null
          company_id: string
          completed_at: string | null
          error_message: string | null
          id: string
          input_data: Json | null
          max_attempts: number | null
          output_data: Json | null
          output_url: string | null
          priority: number | null
          queued_at: string | null
          started_at: string | null
          status: string | null
          task_type: string
        }
        Insert: {
          attempts?: number | null
          company_id: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          max_attempts?: number | null
          output_data?: Json | null
          output_url?: string | null
          priority?: number | null
          queued_at?: string | null
          started_at?: string | null
          status?: string | null
          task_type: string
        }
        Update: {
          attempts?: number | null
          company_id?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          input_data?: Json | null
          max_attempts?: number | null
          output_data?: Json | null
          output_url?: string | null
          priority?: number | null
          queued_at?: string | null
          started_at?: string | null
          status?: string | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_enhancements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_events: {
        Row: {
          company_id: string
          country: string | null
          created_at: string | null
          device_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          referrer: string | null
          section: string | null
          session_id: string | null
          time_on_page_seconds: number | null
          visitor_org: string | null
        }
        Insert: {
          company_id: string
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          section?: string | null
          session_id?: string | null
          time_on_page_seconds?: number | null
          visitor_org?: string | null
        }
        Update: {
          company_id?: string
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          section?: string | null
          session_id?: string | null
          time_on_page_seconds?: number | null
          visitor_org?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_quality: {
        Row: {
          changes_log: Json | null
          check_count: number | null
          company_id: string
          created_at: string | null
          description_source: string | null
          issues: string[] | null
          last_checked_at: string | null
          logo_verified: boolean | null
          next_check_at: string | null
          quality_score: number | null
          updated_at: string | null
          website_verified: boolean | null
        }
        Insert: {
          changes_log?: Json | null
          check_count?: number | null
          company_id: string
          created_at?: string | null
          description_source?: string | null
          issues?: string[] | null
          last_checked_at?: string | null
          logo_verified?: boolean | null
          next_check_at?: string | null
          quality_score?: number | null
          updated_at?: string | null
          website_verified?: boolean | null
        }
        Update: {
          changes_log?: Json | null
          check_count?: number | null
          company_id?: string
          created_at?: string | null
          description_source?: string | null
          issues?: string[] | null
          last_checked_at?: string | null
          logo_verified?: boolean | null
          next_check_at?: string | null
          quality_score?: number | null
          updated_at?: string | null
          website_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_quality_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_views: {
        Row: {
          company_id: string
          id: string
          source: string | null
          viewed_at: string | null
        }
        Insert: {
          company_id: string
          id?: string
          source?: string | null
          viewed_at?: string | null
        }
        Update: {
          company_id?: string
          id?: string
          source?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          onboarding_complete: boolean | null
          role: string | null
          stripe_customer_id: string | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          onboarding_complete?: boolean | null
          role?: string | null
          stripe_customer_id?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          onboarding_complete?: boolean | null
          role?: string | null
          stripe_customer_id?: string | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      publications: {
        Row: {
          authors: string[] | null
          citation_count: number | null
          company_id: string | null
          company_name: string
          created_at: string | null
          id: string
          journal: string | null
          pmid: string
          publication_date: string | null
          source_name: string | null
          title: string | null
        }
        Insert: {
          authors?: string[] | null
          citation_count?: number | null
          company_id?: string | null
          company_name: string
          created_at?: string | null
          id?: string
          journal?: string | null
          pmid: string
          publication_date?: string | null
          source_name?: string | null
          title?: string | null
        }
        Update: {
          authors?: string[] | null
          citation_count?: number | null
          company_id?: string | null
          company_name?: string
          created_at?: string | null
          id?: string
          journal?: string | null
          pmid?: string
          publication_date?: string | null
          source_name?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_log: {
        Row: {
          company_count: number | null
          completed_at: string | null
          error_message: string | null
          id: string
          source: string
          started_at: string | null
          status: string
          url: string
        }
        Insert: {
          company_count?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          source: string
          started_at?: string | null
          status?: string
          url: string
        }
        Update: {
          company_count?: number | null
          completed_at?: string | null
          error_message?: string | null
          id?: string
          source?: string
          started_at?: string | null
          status?: string
          url?: string
        }
        Relationships: []
      }
      sector_market_data: {
        Row: {
          avg_change_pct: number | null
          change_1d_pct: number | null
          change_30d_pct: number | null
          change_7d_pct: number | null
          combined_market_cap: number | null
          company_count: number | null
          created_at: string | null
          funding_round_count_mtd: number | null
          funding_total_mtd: number | null
          funding_total_qtd: number | null
          funding_total_ytd: number | null
          id: string
          public_company_count: number | null
          sector_id: string
          snapshot_date: string
          top_company_id: string | null
          top_gainers: Json | null
          top_losers: Json | null
          total_volume: number | null
        }
        Insert: {
          avg_change_pct?: number | null
          change_1d_pct?: number | null
          change_30d_pct?: number | null
          change_7d_pct?: number | null
          combined_market_cap?: number | null
          company_count?: number | null
          created_at?: string | null
          funding_round_count_mtd?: number | null
          funding_total_mtd?: number | null
          funding_total_qtd?: number | null
          funding_total_ytd?: number | null
          id?: string
          public_company_count?: number | null
          sector_id: string
          snapshot_date: string
          top_company_id?: string | null
          top_gainers?: Json | null
          top_losers?: Json | null
          total_volume?: number | null
        }
        Update: {
          avg_change_pct?: number | null
          change_1d_pct?: number | null
          change_30d_pct?: number | null
          change_7d_pct?: number | null
          combined_market_cap?: number | null
          company_count?: number | null
          created_at?: string | null
          funding_round_count_mtd?: number | null
          funding_total_mtd?: number | null
          funding_total_qtd?: number | null
          funding_total_ytd?: number | null
          id?: string
          public_company_count?: number | null
          sector_id?: string
          snapshot_date?: string
          top_company_id?: string | null
          top_gainers?: Json | null
          top_losers?: Json | null
          total_volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sector_market_data_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_market_data_top_company_id_fkey"
            columns: ["top_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_snapshots: {
        Row: {
          active_trials: number | null
          avg_momentum_score: number | null
          combined_market_cap: number | null
          company_count: number | null
          created_at: string | null
          id: string
          publication_count: number | null
          sector_id: string
          snapshot_date: string
          total_funding_period: number | null
        }
        Insert: {
          active_trials?: number | null
          avg_momentum_score?: number | null
          combined_market_cap?: number | null
          company_count?: number | null
          created_at?: string | null
          id?: string
          publication_count?: number | null
          sector_id: string
          snapshot_date: string
          total_funding_period?: number | null
        }
        Update: {
          active_trials?: number | null
          avg_momentum_score?: number | null
          combined_market_cap?: number | null
          company_count?: number | null
          created_at?: string | null
          id?: string
          publication_count?: number | null
          sector_id?: string
          snapshot_date?: string
          total_funding_period?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sector_snapshots_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          active_trials: number | null
          ai_key_trends: string | null
          ai_outlook: string | null
          ai_risks: string | null
          ai_summary: string | null
          combined_market_cap: number | null
          company_count: number | null
          created_at: string | null
          description: string | null
          funding_trend: string | null
          icon: string | null
          id: string
          last_calculated_at: string | null
          momentum_score: number | null
          name: string
          new_companies_ytd: number | null
          public_company_count: number | null
          publication_count_ytd: number | null
          short_name: string | null
          slug: string
          total_funding_last_year: number | null
          total_funding_ytd: number | null
          trial_trend: string | null
          updated_at: string | null
        }
        Insert: {
          active_trials?: number | null
          ai_key_trends?: string | null
          ai_outlook?: string | null
          ai_risks?: string | null
          ai_summary?: string | null
          combined_market_cap?: number | null
          company_count?: number | null
          created_at?: string | null
          description?: string | null
          funding_trend?: string | null
          icon?: string | null
          id?: string
          last_calculated_at?: string | null
          momentum_score?: number | null
          name: string
          new_companies_ytd?: number | null
          public_company_count?: number | null
          publication_count_ytd?: number | null
          short_name?: string | null
          slug: string
          total_funding_last_year?: number | null
          total_funding_ytd?: number | null
          trial_trend?: string | null
          updated_at?: string | null
        }
        Update: {
          active_trials?: number | null
          ai_key_trends?: string | null
          ai_outlook?: string | null
          ai_risks?: string | null
          ai_summary?: string | null
          combined_market_cap?: number | null
          company_count?: number | null
          created_at?: string | null
          description?: string | null
          funding_trend?: string | null
          icon?: string | null
          id?: string
          last_calculated_at?: string | null
          momentum_score?: number | null
          name?: string
          new_companies_ytd?: number | null
          public_company_count?: number | null
          publication_count_ytd?: number | null
          short_name?: string | null
          slug?: string
          total_funding_last_year?: number | null
          total_funding_ytd?: number | null
          trial_trend?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_pipeline_watchlist: {
        Row: {
          collection_id: string | null
          created_at: string | null
          id: string
          pipeline_id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          pipeline_id: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          pipeline_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pipeline_watchlist_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "watchlist_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_pipeline_watchlist_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      user_watchlist: {
        Row: {
          collection_id: string | null
          company_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          company_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          company_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_watchlist_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "watchlist_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_watchlist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          added_at: string | null
          company_id: string
          id: string
          watchlist_id: string
        }
        Insert: {
          added_at?: string | null
          company_id: string
          id?: string
          watchlist_id: string
        }
        Update: {
          added_at?: string | null
          company_id?: string
          id?: string
          watchlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_items_watchlist_id_fkey"
            columns: ["watchlist_id"]
            isOneToOne: false
            referencedRelation: "watchlists"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_product_scores: {
        Args: { batch_stage: string }
        Returns: number
      }
      execute_sql: { Args: { query: string }; Returns: Json }
      get_country_counts: {
        Args: never
        Returns: {
          count: number
          country: string
        }[]
      }
      get_distinct_price_dates: {
        Args: never
        Returns: {
          d: string
        }[]
      }
      get_funding_annual: {
        Args: never
        Returns: {
          rounds: number
          total: number
          year: number
        }[]
      }
      get_funding_monthly: {
        Args: never
        Returns: {
          month: number
          rounds: number
          total: number
          year: number
        }[]
      }
      get_funding_quarterly: {
        Args: never
        Returns: {
          quarter: number
          rounds: number
          total: number
          year: number
        }[]
      }
      get_funding_stats: {
        Args: never
        Returns: {
          largest_round: number
          largest_round_company: string
          total_companies: number
          total_rounds: number
          total_tracked: number
        }[]
      }
      get_investor_stats: {
        Args: never
        Returns: {
          avg_deal_size_all: number
          largest_investor_name: string
          largest_investor_total: number
          most_active_deals: number
          most_active_name: string
          unique_investors: number
        }[]
      }
      get_pipeline_stats: {
        Args: never
        Returns: {
          approved: number
          companies: number
          phase3: number
          recruiting: number
          total: number
        }[]
      }
      get_top_investors: {
        Args: { p_limit?: number }
        Returns: {
          avg_deal_size: number
          deal_count: number
          investor_name: string
          top_companies: string
          total_invested: number
        }[]
      }
      increment_profile_views: {
        Args: { company_slug: string }
        Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
