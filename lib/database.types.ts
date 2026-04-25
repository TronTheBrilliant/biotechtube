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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_ml_devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          article_style: string | null
          body: Json
          company_id: string | null
          company_ids: string[] | null
          confidence: string
          created_at: string | null
          edited_by: string | null
          headline: string
          hero_image_prompt: string | null
          hero_image_url: string | null
          hero_placeholder_style: Json | null
          id: string
          metadata: Json | null
          published_at: string | null
          reading_time_min: number | null
          sector: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sources: Json | null
          status: string
          subtitle: string | null
          summary: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          article_style?: string | null
          body?: Json
          company_id?: string | null
          company_ids?: string[] | null
          confidence?: string
          created_at?: string | null
          edited_by?: string | null
          headline: string
          hero_image_prompt?: string | null
          hero_image_url?: string | null
          hero_placeholder_style?: Json | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          reading_time_min?: number | null
          sector?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sources?: Json | null
          status?: string
          subtitle?: string | null
          summary?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          article_style?: string | null
          body?: Json
          company_id?: string | null
          company_ids?: string[] | null
          confidence?: string
          created_at?: string | null
          edited_by?: string | null
          headline?: string
          hero_image_prompt?: string | null
          hero_image_url?: string | null
          hero_placeholder_style?: Json | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          reading_time_min?: number | null
          sector?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sources?: Json | null
          status?: string
          subtitle?: string | null
          summary?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      atelier_generated_sites: {
        Row: {
          animation_level: string | null
          approved_at: string | null
          color_palette: Json | null
          company_id: string | null
          copy_density: string | null
          created_at: string | null
          file_manifest: Json | null
          generation_cost_usd: number | null
          generation_ms: number | null
          id: string
          image_style: string | null
          inspirations_used: string[] | null
          layout_archetype: string | null
          model_used: string | null
          plugins_used: string[] | null
          preview_url: string | null
          prompt_used: string | null
          queue_id: string | null
          sanity_schema: Json | null
          score: number | null
          stage: string
          storage_path: string | null
          typography_pair: string | null
          vercel_project_id: string | null
          version: number | null
        }
        Insert: {
          animation_level?: string | null
          approved_at?: string | null
          color_palette?: Json | null
          company_id?: string | null
          copy_density?: string | null
          created_at?: string | null
          file_manifest?: Json | null
          generation_cost_usd?: number | null
          generation_ms?: number | null
          id?: string
          image_style?: string | null
          inspirations_used?: string[] | null
          layout_archetype?: string | null
          model_used?: string | null
          plugins_used?: string[] | null
          preview_url?: string | null
          prompt_used?: string | null
          queue_id?: string | null
          sanity_schema?: Json | null
          score?: number | null
          stage: string
          storage_path?: string | null
          typography_pair?: string | null
          vercel_project_id?: string | null
          version?: number | null
        }
        Update: {
          animation_level?: string | null
          approved_at?: string | null
          color_palette?: Json | null
          company_id?: string | null
          copy_density?: string | null
          created_at?: string | null
          file_manifest?: Json | null
          generation_cost_usd?: number | null
          generation_ms?: number | null
          id?: string
          image_style?: string | null
          inspirations_used?: string[] | null
          layout_archetype?: string | null
          model_used?: string | null
          plugins_used?: string[] | null
          preview_url?: string | null
          prompt_used?: string | null
          queue_id?: string | null
          sanity_schema?: Json | null
          score?: number | null
          stage?: string
          storage_path?: string | null
          typography_pair?: string | null
          vercel_project_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "atelier_generated_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_generated_sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_generated_sites_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["queue_id"]
          },
          {
            foreignKeyName: "atelier_generated_sites_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "atelier_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      atelier_inspirations: {
        Row: {
          average_score_when_used: number | null
          content_tone: Json | null
          created_at: string | null
          id: string
          layout_grammar: Json | null
          motion_language: Json | null
          name: string | null
          screenshot_url: string | null
          style_archetypes: string[] | null
          tags: string[] | null
          times_used: number | null
          trust_signals: Json | null
          url: string
          verticals: string[] | null
          visual_language: Json | null
        }
        Insert: {
          average_score_when_used?: number | null
          content_tone?: Json | null
          created_at?: string | null
          id?: string
          layout_grammar?: Json | null
          motion_language?: Json | null
          name?: string | null
          screenshot_url?: string | null
          style_archetypes?: string[] | null
          tags?: string[] | null
          times_used?: number | null
          trust_signals?: Json | null
          url: string
          verticals?: string[] | null
          visual_language?: Json | null
        }
        Update: {
          average_score_when_used?: number | null
          content_tone?: Json | null
          created_at?: string | null
          id?: string
          layout_grammar?: Json | null
          motion_language?: Json | null
          name?: string | null
          screenshot_url?: string | null
          style_archetypes?: string[] | null
          tags?: string[] | null
          times_used?: number | null
          trust_signals?: Json | null
          url?: string
          verticals?: string[] | null
          visual_language?: Json | null
        }
        Relationships: []
      }
      atelier_queue: {
        Row: {
          animation_level: string | null
          approved_hero_id: string | null
          company_id: string
          created_at: string | null
          current_score: number | null
          design_direction: Json | null
          design_system: Json | null
          enriched_intelligence: Json | null
          error_message: string | null
          full_site_storage_path: string | null
          hero_variants: Json | null
          homepage_preview_url: string | null
          id: string
          image_style: string | null
          is_priority: boolean | null
          last_critique: Json | null
          outreach_email_id: string | null
          positioning_brief: Json | null
          preview_url: string | null
          prompt_version: string | null
          selected_inspiration_urls: string[] | null
          selected_plugin_ids: string[] | null
          status: Database["public"]["Enums"]["atelier_status"] | null
          taste_snapshot: Json | null
          updated_at: string | null
          vercel_project_id: string | null
        }
        Insert: {
          animation_level?: string | null
          approved_hero_id?: string | null
          company_id: string
          created_at?: string | null
          current_score?: number | null
          design_direction?: Json | null
          design_system?: Json | null
          enriched_intelligence?: Json | null
          error_message?: string | null
          full_site_storage_path?: string | null
          hero_variants?: Json | null
          homepage_preview_url?: string | null
          id?: string
          image_style?: string | null
          is_priority?: boolean | null
          last_critique?: Json | null
          outreach_email_id?: string | null
          positioning_brief?: Json | null
          preview_url?: string | null
          prompt_version?: string | null
          selected_inspiration_urls?: string[] | null
          selected_plugin_ids?: string[] | null
          status?: Database["public"]["Enums"]["atelier_status"] | null
          taste_snapshot?: Json | null
          updated_at?: string | null
          vercel_project_id?: string | null
        }
        Update: {
          animation_level?: string | null
          approved_hero_id?: string | null
          company_id?: string
          created_at?: string | null
          current_score?: number | null
          design_direction?: Json | null
          design_system?: Json | null
          enriched_intelligence?: Json | null
          error_message?: string | null
          full_site_storage_path?: string | null
          hero_variants?: Json | null
          homepage_preview_url?: string | null
          id?: string
          image_style?: string | null
          is_priority?: boolean | null
          last_critique?: Json | null
          outreach_email_id?: string | null
          positioning_brief?: Json | null
          preview_url?: string | null
          prompt_version?: string | null
          selected_inspiration_urls?: string[] | null
          selected_plugin_ids?: string[] | null
          status?: Database["public"]["Enums"]["atelier_status"] | null
          taste_snapshot?: Json | null
          updated_at?: string | null
          vercel_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atelier_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      atelier_ratings: {
        Row: {
          animation_level: string | null
          color_palette: Json | null
          company_id: string | null
          company_stage: string | null
          company_type: string | null
          created_at: string | null
          id: string
          image_style: string | null
          inspiration_urls: string[] | null
          layout_archetype: string | null
          led_to_approval: boolean | null
          led_to_outreach: boolean | null
          notes: string | null
          queue_id: string | null
          rating_stage: string
          score: number
          site_id: string | null
          therapeutic_areas: string[] | null
          typography_pair: string | null
        }
        Insert: {
          animation_level?: string | null
          color_palette?: Json | null
          company_id?: string | null
          company_stage?: string | null
          company_type?: string | null
          created_at?: string | null
          id?: string
          image_style?: string | null
          inspiration_urls?: string[] | null
          layout_archetype?: string | null
          led_to_approval?: boolean | null
          led_to_outreach?: boolean | null
          notes?: string | null
          queue_id?: string | null
          rating_stage: string
          score: number
          site_id?: string | null
          therapeutic_areas?: string[] | null
          typography_pair?: string | null
        }
        Update: {
          animation_level?: string | null
          color_palette?: Json | null
          company_id?: string | null
          company_stage?: string | null
          company_type?: string | null
          created_at?: string | null
          id?: string
          image_style?: string | null
          inspiration_urls?: string[] | null
          layout_archetype?: string | null
          led_to_approval?: boolean | null
          led_to_outreach?: boolean | null
          notes?: string | null
          queue_id?: string | null
          rating_stage?: string
          score?: number
          site_id?: string | null
          therapeutic_areas?: string[] | null
          typography_pair?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atelier_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_ratings_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["queue_id"]
          },
          {
            foreignKeyName: "atelier_ratings_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "atelier_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atelier_ratings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "atelier_generated_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      atelier_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      atelier_taste_profiles: {
        Row: {
          confidence_score: number | null
          generated_at: string | null
          id: string
          patterns: Json
          prompt_injections: Json | null
          ratings_analyzed: number | null
          version: number
        }
        Insert: {
          confidence_score?: number | null
          generated_at?: string | null
          id?: string
          patterns: Json
          prompt_injections?: Json | null
          ratings_analyzed?: number | null
          version?: number
        }
        Update: {
          confidence_score?: number | null
          generated_at?: string | null
          id?: string
          patterns?: Json
          prompt_injections?: Json | null
          ratings_analyzed?: number | null
          version?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          after_jsonb: Json | null
          before_jsonb: Json | null
          created_at: string
          id: string
          record_id: string
          source: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          after_jsonb?: Json | null
          before_jsonb?: Json | null
          created_at?: string
          id?: string
          record_id: string
          source?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          after_jsonb?: Json | null
          before_jsonb?: Json | null
          created_at?: string
          id?: string
          record_id?: string
          source?: string | null
          table_name?: string
        }
        Relationships: []
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
      chat_conversations: {
        Row: {
          context_slug: string | null
          context_type: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context_slug?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context_slug?: string | null
          context_type?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rate_limits: {
        Row: {
          count: number
          day: string
          ip: string
          updated_at: string
        }
        Insert: {
          count?: number
          day: string
          ip: string
          updated_at?: string
        }
        Update: {
          count?: number
          day?: string
          ip?: string
          updated_at?: string
        }
        Relationships: []
      }
      commercial_products: {
        Row: {
          active_ingredient: string | null
          brand_name: string
          commercial_status: string
          company_id: string | null
          company_name: string
          confidence: string | null
          created_at: string | null
          cumulative_revenue: number | null
          data_completeness: number | null
          description: string | null
          dosage_form: string | null
          enriched_at: string | null
          exclusivity_expiry_date: string | null
          first_approval_date: string | null
          generic_name: string | null
          has_biosimilar_competition: boolean | null
          has_generic_competition: boolean | null
          id: string
          indication_primary: string | null
          indications: string[] | null
          latest_annual_revenue: number | null
          latest_revenue_year: number | null
          launch_date: string | null
          marketing_partner: string | null
          mechanism_of_action: string | null
          molecule_type: string | null
          patent_expiry_date: string | null
          peak_annual_revenue: number | null
          peak_revenue_year: number | null
          product_type: string
          route: string | null
          slug: string
          source: string
          therapeutic_area: string | null
          updated_at: string | null
        }
        Insert: {
          active_ingredient?: string | null
          brand_name: string
          commercial_status?: string
          company_id?: string | null
          company_name: string
          confidence?: string | null
          created_at?: string | null
          cumulative_revenue?: number | null
          data_completeness?: number | null
          description?: string | null
          dosage_form?: string | null
          enriched_at?: string | null
          exclusivity_expiry_date?: string | null
          first_approval_date?: string | null
          generic_name?: string | null
          has_biosimilar_competition?: boolean | null
          has_generic_competition?: boolean | null
          id?: string
          indication_primary?: string | null
          indications?: string[] | null
          latest_annual_revenue?: number | null
          latest_revenue_year?: number | null
          launch_date?: string | null
          marketing_partner?: string | null
          mechanism_of_action?: string | null
          molecule_type?: string | null
          patent_expiry_date?: string | null
          peak_annual_revenue?: number | null
          peak_revenue_year?: number | null
          product_type?: string
          route?: string | null
          slug: string
          source?: string
          therapeutic_area?: string | null
          updated_at?: string | null
        }
        Update: {
          active_ingredient?: string | null
          brand_name?: string
          commercial_status?: string
          company_id?: string | null
          company_name?: string
          confidence?: string | null
          created_at?: string | null
          cumulative_revenue?: number | null
          data_completeness?: number | null
          description?: string | null
          dosage_form?: string | null
          enriched_at?: string | null
          exclusivity_expiry_date?: string | null
          first_approval_date?: string | null
          generic_name?: string | null
          has_biosimilar_competition?: boolean | null
          has_generic_competition?: boolean | null
          id?: string
          indication_primary?: string | null
          indications?: string[] | null
          latest_annual_revenue?: number | null
          latest_revenue_year?: number | null
          launch_date?: string | null
          marketing_partner?: string | null
          mechanism_of_action?: string | null
          molecule_type?: string | null
          patent_expiry_date?: string | null
          peak_annual_revenue?: number | null
          peak_revenue_year?: number | null
          product_type?: string
          route?: string | null
          slug?: string
          source?: string
          therapeutic_area?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          categories: string[] | null
          city: string | null
          commercial_product_count: number | null
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
          outreach_priority: number | null
          outreach_status: string | null
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
          website_score: number | null
          website_score_details: Json | null
          website_scored_at: string | null
        }
        Insert: {
          categories?: string[] | null
          city?: string | null
          commercial_product_count?: number | null
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
          outreach_priority?: number | null
          outreach_status?: string | null
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
          website_score?: number | null
          website_score_details?: Json | null
          website_scored_at?: string | null
        }
        Update: {
          categories?: string[] | null
          city?: string | null
          commercial_product_count?: number | null
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
          outreach_priority?: number | null
          outreach_status?: string | null
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
          website_score?: number | null
          website_score_details?: Json | null
          website_scored_at?: string | null
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
          template: string | null
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
          template?: string | null
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
          template?: string | null
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
      equity_report_chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          message_count: number
          messages: Json
          purchase_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          messages?: Json
          purchase_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          message_count?: number
          messages?: Json
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_report_chats_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "equity_report_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_report_events: {
        Row: {
          detected_at: string
          equity_report_id: string
          event_summary: string | null
          event_type: string
          id: string
          is_material: boolean
          source_url: string | null
        }
        Insert: {
          detected_at?: string
          equity_report_id: string
          event_summary?: string | null
          event_type: string
          id?: string
          is_material?: boolean
          source_url?: string | null
        }
        Update: {
          detected_at?: string
          equity_report_id?: string
          event_summary?: string | null
          event_type?: string
          id?: string
          is_material?: boolean
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_report_events_equity_report_id_fkey"
            columns: ["equity_report_id"]
            isOneToOne: false
            referencedRelation: "equity_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_report_purchases: {
        Row: {
          alerts_opted_in: boolean
          amount_cents: number
          angle: string
          buyer_email: string
          company_id: string
          day14_refresh_sent_at: string | null
          download_count: number
          equity_report_id: string | null
          generation_attempts: number
          generation_started_at: string | null
          id: string
          last_downloaded_at: string | null
          live_access_expires_at: string | null
          paid_at: string
          refunded_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          tier: string
          user_id: string | null
        }
        Insert: {
          alerts_opted_in?: boolean
          amount_cents: number
          angle?: string
          buyer_email: string
          company_id: string
          day14_refresh_sent_at?: string | null
          download_count?: number
          equity_report_id?: string | null
          generation_attempts?: number
          generation_started_at?: string | null
          id?: string
          last_downloaded_at?: string | null
          live_access_expires_at?: string | null
          paid_at?: string
          refunded_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          tier: string
          user_id?: string | null
        }
        Update: {
          alerts_opted_in?: boolean
          amount_cents?: number
          angle?: string
          buyer_email?: string
          company_id?: string
          day14_refresh_sent_at?: string | null
          download_count?: number
          equity_report_id?: string | null
          generation_attempts?: number
          generation_started_at?: string | null
          id?: string
          last_downloaded_at?: string | null
          live_access_expires_at?: string | null
          paid_at?: string
          refunded_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          tier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equity_report_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_report_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_report_purchases_equity_report_id_fkey"
            columns: ["equity_report_id"]
            isOneToOne: false
            referencedRelation: "equity_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      equity_reports: {
        Row: {
          audio_url: string | null
          company_id: string
          content_jsonb: Json
          cost_cents: number
          enrichment_jsonb: Json | null
          expires_at: string | null
          generated_at: string
          generation_seconds: number | null
          id: string
          mechanism_svg: string | null
          model_version: string
          pdf_url: string | null
          refreshed_at: string
        }
        Insert: {
          audio_url?: string | null
          company_id: string
          content_jsonb: Json
          cost_cents?: number
          enrichment_jsonb?: Json | null
          expires_at?: string | null
          generated_at?: string
          generation_seconds?: number | null
          id?: string
          mechanism_svg?: string | null
          model_version?: string
          pdf_url?: string | null
          refreshed_at?: string
        }
        Update: {
          audio_url?: string | null
          company_id?: string
          content_jsonb?: Json
          cost_cents?: number
          enrichment_jsonb?: Json | null
          expires_at?: string | null
          generated_at?: string
          generation_seconds?: number | null
          id?: string
          mechanism_svg?: string | null
          model_version?: string
          pdf_url?: string | null
          refreshed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equity_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equity_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          following_type: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          following_type?: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          following_type?: string
          id?: string
        }
        Relationships: []
      }
      funding_articles: {
        Row: {
          amount_usd: number | null
          article_type: string | null
          body: string
          company_id: string | null
          company_name: string
          company_slug: string | null
          country: string | null
          created_at: string | null
          deal_size_category: string | null
          funding_round_id: string | null
          headline: string
          id: string
          is_featured: boolean | null
          lead_investor: string | null
          published_at: string | null
          round_date: string | null
          round_type: string | null
          sector: string | null
          slug: string
          source_url: string | null
          subtitle: string | null
          updated_at: string | null
        }
        Insert: {
          amount_usd?: number | null
          article_type?: string | null
          body: string
          company_id?: string | null
          company_name: string
          company_slug?: string | null
          country?: string | null
          created_at?: string | null
          deal_size_category?: string | null
          funding_round_id?: string | null
          headline: string
          id?: string
          is_featured?: boolean | null
          lead_investor?: string | null
          published_at?: string | null
          round_date?: string | null
          round_type?: string | null
          sector?: string | null
          slug: string
          source_url?: string | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_usd?: number | null
          article_type?: string | null
          body?: string
          company_id?: string | null
          company_name?: string
          company_slug?: string | null
          country?: string | null
          created_at?: string | null
          deal_size_category?: string | null
          funding_round_id?: string | null
          headline?: string
          id?: string
          is_featured?: boolean | null
          lead_investor?: string | null
          published_at?: string | null
          round_date?: string | null
          round_type?: string | null
          sector?: string | null
          slug?: string
          source_url?: string | null
          subtitle?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funding_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_articles_funding_round_id_fkey"
            columns: ["funding_round_id"]
            isOneToOne: false
            referencedRelation: "funding_rounds"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funding_rounds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      index_constituents: {
        Row: {
          added_at: string
          company_id: string
          id: string
          is_active: boolean | null
          removed_at: string | null
        }
        Insert: {
          added_at?: string
          company_id: string
          id?: string
          is_active?: boolean | null
          removed_at?: string | null
        }
        Update: {
          added_at?: string
          company_id?: string
          id?: string
          is_active?: boolean | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "index_constituents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "index_constituents_company_id_fkey"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          post_id: string | null
          read: boolean | null
          recipient_id: string
          type: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean | null
          recipient_id: string
          type: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          post_id?: string | null
          read?: boolean | null
          recipient_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_contacts: {
        Row: {
          company_id: string
          created_at: string | null
          email: string | null
          id: string
          linkedin_url: string | null
          name: string | null
          role: string | null
          scraped_at: string | null
          source: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string | null
          role?: string | null
          scraped_at?: string | null
          source?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          linkedin_url?: string | null
          name?: string | null
          role?: string | null
          scraped_at?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_emails: {
        Row: {
          body: string
          clicked: boolean | null
          company_id: string
          contact_id: string | null
          conversion_outcome: string | null
          created_at: string | null
          deal_notes: string | null
          deal_stage: string | null
          experiment_vars: Json | null
          follow_up_count: number | null
          id: string
          next_follow_up_at: string | null
          opened: boolean | null
          personalization_notes: string | null
          playbook_version: number | null
          replied_at: string | null
          reply_sentiment: string | null
          reply_summary: string | null
          sent_at: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string | null
        }
        Insert: {
          body: string
          clicked?: boolean | null
          company_id: string
          contact_id?: string | null
          conversion_outcome?: string | null
          created_at?: string | null
          deal_notes?: string | null
          deal_stage?: string | null
          experiment_vars?: Json | null
          follow_up_count?: number | null
          id?: string
          next_follow_up_at?: string | null
          opened?: boolean | null
          personalization_notes?: string | null
          playbook_version?: number | null
          replied_at?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          clicked?: boolean | null
          company_id?: string
          contact_id?: string | null
          conversion_outcome?: string | null
          created_at?: string | null
          deal_notes?: string | null
          deal_stage?: string | null
          experiment_vars?: Json | null
          follow_up_count?: number | null
          id?: string
          next_follow_up_at?: string | null
          opened?: boolean | null
          personalization_notes?: string | null
          playbook_version?: number | null
          replied_at?: string | null
          reply_sentiment?: string | null
          reply_summary?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_emails_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_experiments: {
        Row: {
          confidence: number | null
          created_at: string | null
          ended_at: string | null
          hypothesis: string
          id: string
          incorporated_into_playbook: boolean | null
          name: string
          started_at: string | null
          variant_a: string
          variant_a_replies: number | null
          variant_a_sent: number | null
          variant_b: string
          variant_b_replies: number | null
          variant_b_sent: number | null
          winner: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          ended_at?: string | null
          hypothesis: string
          id?: string
          incorporated_into_playbook?: boolean | null
          name: string
          started_at?: string | null
          variant_a: string
          variant_a_replies?: number | null
          variant_a_sent?: number | null
          variant_b: string
          variant_b_replies?: number | null
          variant_b_sent?: number | null
          winner?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          ended_at?: string | null
          hypothesis?: string
          id?: string
          incorporated_into_playbook?: boolean | null
          name?: string
          started_at?: string | null
          variant_a?: string
          variant_a_replies?: number | null
          variant_a_sent?: number | null
          variant_b?: string
          variant_b_replies?: number | null
          variant_b_sent?: number | null
          winner?: string | null
        }
        Relationships: []
      }
      outreach_performance: {
        Row: {
          claims_paid: number | null
          claims_started: number | null
          conversion_rate: number | null
          created_at: string | null
          emails_sent: number | null
          id: string
          insights: string | null
          meetings_booked: number | null
          playbook_version: number | null
          positive_rate: number | null
          positive_replies: number | null
          replies_received: number | null
          reply_rate: number | null
          sponsor_leads: number | null
          top_performing_segment: string | null
          top_performing_subject: string | null
          week_start: string
        }
        Insert: {
          claims_paid?: number | null
          claims_started?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          emails_sent?: number | null
          id?: string
          insights?: string | null
          meetings_booked?: number | null
          playbook_version?: number | null
          positive_rate?: number | null
          positive_replies?: number | null
          replies_received?: number | null
          reply_rate?: number | null
          sponsor_leads?: number | null
          top_performing_segment?: string | null
          top_performing_subject?: string | null
          week_start: string
        }
        Update: {
          claims_paid?: number | null
          claims_started?: number | null
          conversion_rate?: number | null
          created_at?: string | null
          emails_sent?: number | null
          id?: string
          insights?: string | null
          meetings_booked?: number | null
          playbook_version?: number | null
          positive_rate?: number | null
          positive_replies?: number | null
          replies_received?: number | null
          reply_rate?: number | null
          sponsor_leads?: number | null
          top_performing_segment?: string | null
          top_performing_subject?: string | null
          week_start?: string
        }
        Relationships: []
      }
      outreach_playbook: {
        Row: {
          avg_positive_rate: number | null
          avg_reply_rate: number | null
          best_company_segments: string[] | null
          best_cta_style: string | null
          best_email_length_range: string | null
          best_personalization_approach: string | null
          best_subject_patterns: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          learnings: string
          total_experiments: number | null
          version: number
          worst_subject_patterns: string[] | null
        }
        Insert: {
          avg_positive_rate?: number | null
          avg_reply_rate?: number | null
          best_company_segments?: string[] | null
          best_cta_style?: string | null
          best_email_length_range?: string | null
          best_personalization_approach?: string | null
          best_subject_patterns?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          learnings: string
          total_experiments?: number | null
          version?: number
          worst_subject_patterns?: string[] | null
        }
        Update: {
          avg_positive_rate?: number | null
          avg_reply_rate?: number | null
          best_company_segments?: string[] | null
          best_cta_style?: string | null
          best_email_length_range?: string | null
          best_personalization_approach?: string | null
          best_subject_patterns?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          learnings?: string
          total_experiments?: number | null
          version?: number
          worst_subject_patterns?: string[] | null
        }
        Relationships: []
      }
      outreach_replies: {
        Row: {
          body: string
          created_at: string | null
          direction: string
          email_id: string
          from_email: string | null
          id: string
          needs_review: boolean | null
          sent_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          direction: string
          email_id: string
          from_email?: string | null
          id?: string
          needs_review?: boolean | null
          sent_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          direction?: string
          email_id?: string
          from_email?: string | null
          id?: string
          needs_review?: boolean | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_replies_email_id_fkey"
            columns: ["email_id"]
            isOneToOne: false
            referencedRelation: "outreach_emails"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_runs: {
        Row: {
          companies_scraped: number | null
          created_at: string | null
          deals_flagged: number | null
          emails_drafted: number | null
          emails_sent: number | null
          id: string
          notes: string | null
          replies_received: number | null
          run_date: string
        }
        Insert: {
          companies_scraped?: number | null
          created_at?: string | null
          deals_flagged?: number | null
          emails_drafted?: number | null
          emails_sent?: number | null
          id?: string
          notes?: string | null
          replies_received?: number | null
          run_date?: string
        }
        Update: {
          companies_scraped?: number | null
          created_at?: string | null
          deals_flagged?: number | null
          emails_drafted?: number | null
          emails_sent?: number | null
          id?: string
          notes?: string | null
          replies_received?: number | null
          run_date?: string
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipelines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      post_bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_bookmarks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          comment_count: number | null
          company_id: string | null
          created_at: string
          id: string
          image_url: string | null
          like_count: number | null
          post_type: string
          share_count: number | null
          shared_post_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          comment_count?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number | null
          post_type?: string
          share_count?: number | null
          shared_post_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_count?: number | null
          company_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          like_count?: number | null
          post_type?: string
          share_count?: number | null
          shared_post_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_shared_post_id_fkey"
            columns: ["shared_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      product_approvals: {
        Row: {
          application_number: string | null
          application_type: string | null
          approval_date: string | null
          approval_status: string | null
          commercial_product_id: string
          created_at: string | null
          fda_approval_id: string | null
          id: string
          indication: string | null
          region: string
          regulatory_agency: string
          source: string | null
        }
        Insert: {
          application_number?: string | null
          application_type?: string | null
          approval_date?: string | null
          approval_status?: string | null
          commercial_product_id: string
          created_at?: string | null
          fda_approval_id?: string | null
          id?: string
          indication?: string | null
          region: string
          regulatory_agency: string
          source?: string | null
        }
        Update: {
          application_number?: string | null
          application_type?: string | null
          approval_date?: string | null
          approval_status?: string | null
          commercial_product_id?: string
          created_at?: string | null
          fda_approval_id?: string | null
          id?: string
          indication?: string | null
          region?: string
          regulatory_agency?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_approvals_commercial_product_id_fkey"
            columns: ["commercial_product_id"]
            isOneToOne: false
            referencedRelation: "commercial_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_approvals_fda_approval_id_fkey"
            columns: ["fda_approval_id"]
            isOneToOne: false
            referencedRelation: "fda_approvals"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pipeline_links: {
        Row: {
          commercial_product_id: string
          confidence: number | null
          created_at: string | null
          link_type: string | null
          pipeline_id: string
        }
        Insert: {
          commercial_product_id: string
          confidence?: number | null
          created_at?: string | null
          link_type?: string | null
          pipeline_id: string
        }
        Update: {
          commercial_product_id?: string
          confidence?: number | null
          created_at?: string | null
          link_type?: string | null
          pipeline_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pipeline_links_commercial_product_id_fkey"
            columns: ["commercial_product_id"]
            isOneToOne: false
            referencedRelation: "commercial_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_pipeline_links_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      product_revenue: {
        Row: {
          commercial_product_id: string
          confidence: string | null
          created_at: string | null
          id: string
          market_share_pct: number | null
          quarter: number | null
          reporting_currency: string | null
          revenue_local: number | null
          revenue_usd: number
          source: string
          source_url: string | null
          updated_at: string | null
          year: number
          yoy_growth_pct: number | null
        }
        Insert: {
          commercial_product_id: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          market_share_pct?: number | null
          quarter?: number | null
          reporting_currency?: string | null
          revenue_local?: number | null
          revenue_usd: number
          source?: string
          source_url?: string | null
          updated_at?: string | null
          year: number
          yoy_growth_pct?: number | null
        }
        Update: {
          commercial_product_id?: string
          confidence?: string | null
          created_at?: string | null
          id?: string
          market_share_pct?: number | null
          quarter?: number | null
          reporting_currency?: string | null
          revenue_local?: number | null
          revenue_usd?: number
          source?: string
          source_url?: string | null
          updated_at?: string | null
          year?: number
          yoy_growth_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_revenue_commercial_product_id_fkey"
            columns: ["commercial_product_id"]
            isOneToOne: false
            referencedRelation: "commercial_products"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_daily_stats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_edit_queue: {
        Row: {
          applied_at: string | null
          company_id: string | null
          confidence: number
          created_at: string
          id: string
          proposed_changes: Json
          reasoning: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_id: string | null
          source_type: string
          status: string
        }
        Insert: {
          applied_at?: string | null
          company_id?: string | null
          confidence: number
          created_at?: string
          id?: string
          proposed_changes: Json
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type: string
          status?: string
        }
        Update: {
          applied_at?: string | null
          company_id?: string | null
          confidence?: number
          created_at?: string
          id?: string
          proposed_changes?: Json
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_edit_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_edit_queue_company_id_fkey"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pubmed_papers: {
        Row: {
          abstract: string | null
          authors: string[] | null
          citation_count: number | null
          doi: string | null
          fetched_at: string | null
          id: string
          journal: string | null
          keywords: string[] | null
          mesh_terms: string[] | null
          pmid: string
          published_date: string | null
          relevance_score: number | null
          title: string
          used_in_article: boolean | null
        }
        Insert: {
          abstract?: string | null
          authors?: string[] | null
          citation_count?: number | null
          doi?: string | null
          fetched_at?: string | null
          id?: string
          journal?: string | null
          keywords?: string[] | null
          mesh_terms?: string[] | null
          pmid: string
          published_date?: string | null
          relevance_score?: number | null
          title: string
          used_in_article?: boolean | null
        }
        Update: {
          abstract?: string | null
          authors?: string[] | null
          citation_count?: number | null
          doi?: string | null
          fetched_at?: string | null
          id?: string
          journal?: string | null
          keywords?: string[] | null
          mesh_terms?: string[] | null
          pmid?: string
          published_date?: string | null
          relevance_score?: number | null
          title?: string
          used_in_article?: boolean | null
        }
        Relationships: []
      }
      rss_items: {
        Row: {
          category: string | null
          company_names: string[] | null
          id: string
          processed_for_article: boolean | null
          published_at: string | null
          scraped_at: string | null
          source_name: string
          summary: string | null
          title: string
          url: string
        }
        Insert: {
          category?: string | null
          company_names?: string[] | null
          id?: string
          processed_for_article?: boolean | null
          published_at?: string | null
          scraped_at?: string | null
          source_name: string
          summary?: string | null
          title: string
          url: string
        }
        Update: {
          category?: string | null
          company_names?: string[] | null
          id?: string
          processed_for_article?: boolean | null
          published_at?: string | null
          scraped_at?: string | null
          source_name?: string
          summary?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      scrape_log: {
        Row: {
          companies_enriched: number | null
          companies_found: number | null
          companies_new: number | null
          company_count: number | null
          completed_at: string | null
          error: string | null
          error_message: string | null
          id: string
          scraped_at: string | null
          source: string
          source_id: string | null
          started_at: string | null
          status: string
          url: string
        }
        Insert: {
          companies_enriched?: number | null
          companies_found?: number | null
          companies_new?: number | null
          company_count?: number | null
          completed_at?: string | null
          error?: string | null
          error_message?: string | null
          id?: string
          scraped_at?: string | null
          source: string
          source_id?: string | null
          started_at?: string | null
          status?: string
          url: string
        }
        Update: {
          companies_enriched?: number | null
          companies_found?: number | null
          companies_new?: number | null
          company_count?: number | null
          completed_at?: string | null
          error?: string | null
          error_message?: string | null
          id?: string
          scraped_at?: string | null
          source?: string
          source_id?: string | null
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
            referencedRelation: "atelier_company_targets"
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
            referencedRelation: "atelier_company_targets"
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
            referencedRelation: "atelier_company_targets"
            referencedColumns: ["id"]
          },
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
      atelier_company_targets: {
        Row: {
          company_type: string | null
          contact_email: string | null
          domain: string | null
          id: string | null
          is_priority: boolean | null
          logo_url: string | null
          name: string | null
          quality_issues: string[] | null
          quality_score: number | null
          queue_id: string | null
          queue_preview_url: string | null
          queue_score: number | null
          queue_status: Database["public"]["Enums"]["atelier_status"] | null
          queue_updated_at: string | null
          slug: string | null
          stage: string | null
          summary: string | null
          website: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_product_scores: {
        Args: { batch_stage: string }
        Returns: number
      }
      execute_sql: { Args: { query: string }; Returns: Json }
      get_co_investors: {
        Args: { p_limit?: number }
        Returns: {
          investor_a: string
          investor_b: string
          shared_companies: number
        }[]
      }
      get_country_counts: {
        Args: never
        Returns: {
          count: number
          country: string
        }[]
      }
      get_deal_velocity: {
        Args: never
        Returns: {
          deal_count: number
          total_amount: number
          week_start: string
        }[]
      }
      get_distinct_price_dates: {
        Args: never
        Returns: {
          d: string
        }[]
      }
      get_ex_top50_market_cap: {
        Args: never
        Returns: {
          ex_top50_companies: number
          ex_top50_market_cap: number
          snapshot_date: string
          top50_market_cap: number
          total_market_cap: number
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
      get_funding_by_country: {
        Args: { p_limit?: number }
        Returns: {
          country: string
          rounds: number
          total: number
        }[]
      }
      get_funding_by_round_type: {
        Args: never
        Returns: {
          round_type: string
          rounds: number
          total: number
          year: number
        }[]
      }
      get_funding_by_sector: {
        Args: { p_limit?: number }
        Returns: {
          rounds: number
          sector: string
          total: number
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
      get_funding_pulse: {
        Args: never
        Returns: {
          avg_round_size: number
          hottest_sector: string
          latest_deal_amount: number
          latest_deal_company: string
          latest_deal_date: string
          latest_deal_slug: string
          latest_deal_type: string
          month_count: number
          month_total: number
          prev_avg_round_size: number
          prev_month_count: number
          prev_month_total: number
          prev_ytd_total: number
          ytd_total: number
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
      get_investor_details: {
        Args: { p_investor: string }
        Returns: {
          amount_usd: number
          announced_date: string
          company_name: string
          round_type: string
          sector: string
          sector_count: number
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
      get_recent_price_date_counts: {
        Args: never
        Returns: {
          cnt: number
          date: string
        }[]
      }
      get_top_companies: {
        Args: { limit_count?: number }
        Returns: {
          company_id: string
          company_name: string
          company_slug: string
          country: string
          daily_change_pct: number
          logo_url: string
          market_cap: number
          ticker: string
          website: string
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
      get_trending_companies: {
        Args: { limit_count?: number }
        Returns: {
          company_id: string
          company_name: string
          company_slug: string
          country: string
          current_date_used: string
          current_market_cap: number
          current_price: number
          logo_url: string
          old_date_used: string
          old_price: number
          price_change_pct: number
          ticker: string
          website: string
        }[]
      }
      increment_chat_rate_limit: { Args: { p_ip: string }; Returns: number }
      increment_profile_views: {
        Args: { company_slug: string }
        Returns: undefined
      }
      merge_company: {
        Args: { p_loser: string; p_winner: string }
        Returns: undefined
      }
    }
    Enums: {
      atelier_status:
        | "queued"
        | "enriching"
        | "generating_hero"
        | "hero_ready"
        | "generating_homepage"
        | "homepage_ready"
        | "deploying"
        | "deployed"
        | "approved"
        | "outreach_queued"
        | "outreach_sent"
        | "client_responded"
        | "converted"
        | "archived"
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
    Enums: {
      atelier_status: [
        "queued",
        "enriching",
        "generating_hero",
        "hero_ready",
        "generating_homepage",
        "homepage_ready",
        "deploying",
        "deployed",
        "approved",
        "outreach_queued",
        "outreach_sent",
        "client_responded",
        "converted",
        "archived",
      ],
    },
  },
} as const
