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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          diff: Json | null
          id: number
          occurred_at: string
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          diff?: Json | null
          id?: number
          occurred_at?: string
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          diff?: Json | null
          id?: number
          occurred_at?: string
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      analytics_404: {
        Row: {
          first_hit_at: string
          hit_count: number
          id: number
          last_hit_at: string
          path: string
          referrer: string | null
          resolved: boolean
          user_agent: string | null
        }
        Insert: {
          first_hit_at?: string
          hit_count?: number
          id?: number
          last_hit_at?: string
          path: string
          referrer?: string | null
          resolved?: boolean
          user_agent?: string | null
        }
        Update: {
          first_hit_at?: string
          hit_count?: number
          id?: number
          last_hit_at?: string
          path?: string
          referrer?: string | null
          resolved?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          email: string | null
          id: number
          post_count: number
          slug: string
          social: Json
          updated_at: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id: number
          post_count?: number
          slug: string
          social?: Json
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: number
          post_count?: number
          slug?: string
          social?: Json
          updated_at?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: []
      }
      automations: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          id: number
          last_error: string | null
          last_run_at: string | null
          last_status: string | null
          name: string
          schedule: string | null
          trigger_type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name: string
          schedule?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: number
          last_error?: string | null
          last_run_at?: string | null
          last_status?: string | null
          name?: string
          schedule?: string | null
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          focus_keyword: string | null
          id: number
          name: string
          og_image: string | null
          parent_id: number | null
          post_count: number
          robots: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          focus_keyword?: string | null
          id: number
          name: string
          og_image?: string | null
          parent_id?: number | null
          post_count?: number
          robots?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          focus_keyword?: string | null
          id?: number
          name?: string
          og_image?: string | null
          parent_id?: number | null
          post_count?: number
          robots?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: number
          message: string
          name: string
          phone: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          message: string
          name: string
          phone?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          message?: string
          name?: string
          phone?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          download_media: boolean
          errors: Json
          id: string
          inserted: Json
          last_message: string | null
          page: number
          per_page: number
          phase: Database["public"]["Enums"]["import_job_phase"]
          skipped: Json
          status: Database["public"]["Enums"]["import_job_status"]
          totals: Json
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          download_media?: boolean
          errors?: Json
          id?: string
          inserted?: Json
          last_message?: string | null
          page?: number
          per_page?: number
          phase?: Database["public"]["Enums"]["import_job_phase"]
          skipped?: Json
          status?: Database["public"]["Enums"]["import_job_status"]
          totals?: Json
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          download_media?: boolean
          errors?: Json
          id?: string
          inserted?: Json
          last_message?: string | null
          page?: number
          per_page?: number
          phase?: Database["public"]["Enums"]["import_job_phase"]
          skipped?: Json
          status?: Database["public"]["Enums"]["import_job_status"]
          totals?: Json
          updated_at?: string
        }
        Relationships: []
      }
      internal_links: {
        Row: {
          anchor_text: string | null
          created_at: string
          id: number
          source_post_id: number
          target_post_id: number | null
          target_url: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string
          id?: never
          source_post_id: number
          target_post_id?: number | null
          target_url: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string
          id?: never
          source_post_id?: number
          target_post_id?: number | null
          target_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_links_source_post_id_fkey"
            columns: ["source_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_links_target_post_id_fkey"
            columns: ["target_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          filename: string | null
          filesize: number | null
          height: number | null
          id: number
          mime_type: string | null
          storage_path: string | null
          title: string | null
          updated_at: string
          uploaded_at: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          filename?: string | null
          filesize?: number | null
          height?: number | null
          id: number
          mime_type?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          filename?: string | null
          filesize?: number | null
          height?: number | null
          id?: number
          mime_type?: string | null
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          uploaded_at?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      media_backfill_queue: {
        Row: {
          attempts: number
          bytes: number | null
          created_at: string
          last_error: string | null
          status: string
          storage_key: string
          updated_at: string
          url: string
        }
        Insert: {
          attempts?: number
          bytes?: number | null
          created_at?: string
          last_error?: string | null
          status?: string
          storage_key: string
          updated_at?: string
          url: string
        }
        Update: {
          attempts?: number
          bytes?: number | null
          created_at?: string
          last_error?: string | null
          status?: string
          storage_key?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      media_variants: {
        Row: {
          created_at: string
          filesize: number | null
          height: number | null
          id: number
          kind: string
          media_id: number
          mime_type: string | null
          storage_path: string | null
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          filesize?: number | null
          height?: number | null
          id?: number
          kind: string
          media_id: number
          mime_type?: string | null
          storage_path?: string | null
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          filesize?: number | null
          height?: number | null
          id?: number
          kind?: string
          media_id?: number
          mime_type?: string | null
          storage_path?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          id: number
          label: string
          menu_id: number
          object_id: number | null
          object_type: string | null
          parent_id: number | null
          position: number
          rel: string | null
          target: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          id: number
          label: string
          menu_id: number
          object_id?: number | null
          object_type?: string | null
          parent_id?: number | null
          position?: number
          rel?: string | null
          target?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: number
          label?: string
          menu_id?: number
          object_id?: number | null
          object_type?: string | null
          parent_id?: number | null
          position?: number
          rel?: string | null
          target?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: number
          location: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: number
          location?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          location?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: number
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: number
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: number
          source?: string | null
        }
        Relationships: []
      }
      pillars: {
        Row: {
          body_html: string
          byline: string | null
          created_at: string
          faq: Json
          hero_image_url: string | null
          id: number
          published: boolean
          schema_jsonld: Json | null
          slug: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_html?: string
          byline?: string | null
          created_at?: string
          faq?: Json
          hero_image_url?: string | null
          id: number
          published?: boolean
          schema_jsonld?: Json | null
          slug: string
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_html?: string
          byline?: string | null
          created_at?: string
          faq?: Json
          hero_image_url?: string | null
          id?: number
          published?: boolean
          schema_jsonld?: Json | null
          slug?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_categories: {
        Row: {
          category_id: number
          post_id: number
        }
        Insert: {
          category_id: number
          post_id: number
        }
        Update: {
          category_id?: number
          post_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_revisions: {
        Row: {
          author_id: string | null
          content_html: string | null
          content_text: string | null
          created_at: string
          excerpt: string | null
          id: number
          kind: string
          post_id: number
          title: string | null
        }
        Insert: {
          author_id?: string | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          kind?: string
          post_id: number
          title?: string | null
        }
        Update: {
          author_id?: string | null
          content_html?: string | null
          content_text?: string | null
          created_at?: string
          excerpt?: string | null
          id?: number
          kind?: string
          post_id?: number
          title?: string | null
        }
        Relationships: []
      }
      post_tags: {
        Row: {
          post_id: number
          tag_id: number
        }
        Insert: {
          post_id: number
          tag_id: number
        }
        Update: {
          post_id?: number
          tag_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: number | null
          comment_status: string
          content_html: string
          content_text: string | null
          created_at: string
          excerpt: string | null
          featured_media_id: number | null
          first_inline_image: string | null
          id: number
          menu_order: number
          modified_at: string | null
          parent_id: number | null
          password: string | null
          published_at: string | null
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["post_status"]
          title: string
          type: Database["public"]["Enums"]["content_type"]
          updated_at: string
        }
        Insert: {
          author_id?: number | null
          comment_status?: string
          content_html?: string
          content_text?: string | null
          created_at?: string
          excerpt?: string | null
          featured_media_id?: number | null
          first_inline_image?: string | null
          id: number
          menu_order?: number
          modified_at?: string | null
          parent_id?: number | null
          password?: string | null
          published_at?: string | null
          search_vector?: unknown
          slug: string
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Update: {
          author_id?: number | null
          comment_status?: string
          content_html?: string
          content_text?: string | null
          created_at?: string
          excerpt?: string | null
          featured_media_id?: number | null
          first_inline_image?: string | null
          id?: number
          menu_order?: number
          modified_at?: string | null
          parent_id?: number | null
          password?: string | null
          published_at?: string | null
          search_vector?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          type?: Database["public"]["Enums"]["content_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_featured_media_id_fkey"
            columns: ["featured_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          created_at: string
          enabled: boolean
          hits: number
          id: number
          is_regex: boolean
          last_hit_at: string | null
          notes: string | null
          source_path: string
          status_code: number
          target_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          hits?: number
          id?: never
          is_regex?: boolean
          last_hit_at?: string | null
          notes?: string | null
          source_path: string
          status_code?: number
          target_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          hits?: number
          id?: never
          is_regex?: boolean
          last_hit_at?: string | null
          notes?: string | null
          source_path?: string
          status_code?: number
          target_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_meta: {
        Row: {
          breadcrumbs: Json | null
          canonical_url: string | null
          created_at: string
          description: string | null
          id: number
          object_id: number | null
          object_type: string
          og_description: string | null
          og_image: string | null
          og_title: string | null
          og_type: string | null
          raw: Json | null
          robots: string | null
          schema_jsonld: Json | null
          title: string | null
          twitter_card: string | null
          twitter_description: string | null
          twitter_image: string | null
          twitter_title: string | null
          updated_at: string
          url_path: string
        }
        Insert: {
          breadcrumbs?: Json | null
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: never
          object_id?: number | null
          object_type: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          raw?: Json | null
          robots?: string | null
          schema_jsonld?: Json | null
          title?: string | null
          twitter_card?: string | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
          url_path: string
        }
        Update: {
          breadcrumbs?: Json | null
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: never
          object_id?: number | null
          object_type?: string
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          og_type?: string | null
          raw?: Json | null
          robots?: string | null
          schema_jsonld?: Json | null
          title?: string | null
          twitter_card?: string | null
          twitter_description?: string | null
          twitter_image?: string | null
          twitter_title?: string | null
          updated_at?: string
          url_path?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tags: {
        Row: {
          canonical_url: string | null
          created_at: string
          description: string | null
          focus_keyword: string | null
          id: number
          name: string
          og_image: string | null
          post_count: number
          robots: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          focus_keyword?: string | null
          id: number
          name: string
          og_image?: string | null
          post_count?: number
          robots?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          focus_keyword?: string | null
          id?: number
          name?: string
          og_image?: string | null
          post_count?: number
          robots?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      build_media_backfill_queue: { Args: never; Returns: Json }
      claim_first_admin: { Args: never; Returns: Json }
      get_archive_list: {
        Args: {
          p_day?: number
          p_kind: string
          p_month?: number
          p_page?: number
          p_page_size?: number
          p_q?: string
          p_slug?: string
          p_year?: number
        }
        Returns: Json
      }
      get_article_full: { Args: { slug_param: string }; Returns: Json }
      get_homepage: { Args: { p_economy_slug?: string }; Returns: Json }
      get_homepage_data: {
        Args: {
          p_crisis_slug?: string
          p_economy_slug?: string
          p_section_slugs?: string[]
        }
        Returns: Json
      }
      get_pillar: {
        Args: { p_page?: number; p_page_size?: number; p_slug: string }
        Returns: Json
      }
      get_research_list: {
        Args: { p_page?: number; p_page_size?: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      legacy_to_supabase_url: { Args: { p_legacy: string }; Returns: string }
      rewrite_legacy_media_urls: { Args: never; Returns: Json }
      rewrite_posts_html_legacy_chunk: {
        Args: { p_limit?: number }
        Returns: Json
      }
      rewrite_posts_html_variants_chunk: {
        Args: { p_limit?: number }
        Returns: Json
      }
      rewrite_posts_inline_legacy: { Args: never; Returns: Json }
      rewrite_posts_inline_variants: { Args: never; Returns: Json }
      rewrite_seo_meta_legacy: { Args: never; Returns: Json }
      rewrite_seo_meta_variants: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "editor" | "author"
      content_type: "post" | "page"
      import_job_phase:
        | "authors"
        | "categories"
        | "tags"
        | "media"
        | "posts"
        | "pages"
        | "done"
      import_job_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "cancelled"
      post_status:
        | "publish"
        | "draft"
        | "pending"
        | "private"
        | "future"
        | "trash"
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
      app_role: ["admin", "editor", "author"],
      content_type: ["post", "page"],
      import_job_phase: [
        "authors",
        "categories",
        "tags",
        "media",
        "posts",
        "pages",
        "done",
      ],
      import_job_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "cancelled",
      ],
      post_status: [
        "publish",
        "draft",
        "pending",
        "private",
        "future",
        "trash",
      ],
    },
  },
} as const
