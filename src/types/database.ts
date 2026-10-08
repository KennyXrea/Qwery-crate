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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      level_position_history: {
        Row: {
          changed_at: string
          id: string
          level_id: string
          new_position: number | null
          old_position: number | null
          reason: string
          seq: number
        }
        Insert: {
          changed_at?: string
          id?: string
          level_id: string
          new_position?: number | null
          old_position?: number | null
          reason: string
          seq?: never
        }
        Update: {
          changed_at?: string
          id?: string
          level_id?: string
          new_position?: number | null
          old_position?: number | null
          reason?: string
          seq?: never
        }
        Relationships: [
          {
            foreignKeyName: "level_position_history_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_position_history_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels_view"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          creator: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["gd_difficulty"]
          difficulty_rating: number | null
          gd_level_id: number | null
          id: string
          length_seconds: number | null
          name: string
          notes: string | null
          points_override: number | null
          position: number
          showcase_video_url: string | null
          slug: string
          thumbnail_path: string | null
          updated_at: string
          verifier: string | null
        }
        Insert: {
          created_at?: string
          creator?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["gd_difficulty"]
          difficulty_rating?: number | null
          gd_level_id?: number | null
          id?: string
          length_seconds?: number | null
          name: string
          notes?: string | null
          points_override?: number | null
          position: number
          showcase_video_url?: string | null
          slug: string
          thumbnail_path?: string | null
          updated_at?: string
          verifier?: string | null
        }
        Update: {
          created_at?: string
          creator?: string | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["gd_difficulty"]
          difficulty_rating?: number | null
          gd_level_id?: number | null
          id?: string
          length_seconds?: number | null
          name?: string
          notes?: string | null
          points_override?: number | null
          position?: number
          showcase_video_url?: string | null
          slug?: string
          thumbnail_path?: string | null
          updated_at?: string
          verifier?: string | null
        }
        Relationships: []
      }
      players: {
        Row: {
          avatar_path: string | null
          bio: string | null
          channel_url: string | null
          country_code: string | null
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          channel_url?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          channel_url?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          attempts: number | null
          created_at: string
          date_beaten: string | null
          enjoyment: number | null
          id: string
          level_id: string
          notes: string | null
          player_id: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          date_beaten?: string | null
          enjoyment?: number | null
          id?: string
          level_id: string
          notes?: string | null
          player_id: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          date_beaten?: string | null
          enjoyment?: number | null
          id?: string
          level_id?: string
          notes?: string | null
          player_id?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "records_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_view"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          extended_list_size: number
          id: number
          main_list_size: number
          points_decay: number
          points_max: number
          points_min: number
          site_name: string
          updated_at: string
        }
        Insert: {
          extended_list_size?: number
          id?: number
          main_list_size?: number
          points_decay?: number
          points_max?: number
          points_min?: number
          site_name?: string
          updated_at?: string
        }
        Update: {
          extended_list_size?: number
          id?: number
          main_list_size?: number
          points_decay?: number
          points_max?: number
          points_min?: number
          site_name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      levels_view: {
        Row: {
          avg_attempts: number | null
          avg_enjoyment: number | null
          created_at: string | null
          creator: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["gd_difficulty"] | null
          difficulty_rating: number | null
          first_victor_id: string | null
          first_victor_name: string | null
          first_victor_slug: string | null
          first_victor_video_url: string | null
          first_victory_date: string | null
          gd_level_id: number | null
          id: string | null
          length_seconds: number | null
          name: string | null
          notes: string | null
          points: number | null
          points_override: number | null
          position: number | null
          section: string | null
          showcase_video_url: string | null
          slug: string | null
          thumbnail_path: string | null
          updated_at: string | null
          verifier: string | null
          victor_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "records_player_id_fkey"
            columns: ["first_victor_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_player_id_fkey"
            columns: ["first_victor_id"]
            isOneToOne: false
            referencedRelation: "players_view"
            referencedColumns: ["id"]
          },
        ]
      }
      players_view: {
        Row: {
          avatar_path: string | null
          avg_enjoyment: number | null
          bio: string | null
          channel_url: string | null
          completions: number | null
          country_code: string | null
          created_at: string | null
          first_victories: number | null
          hardest_level_id: string | null
          hardest_level_name: string | null
          hardest_level_position: number | null
          hardest_level_slug: string | null
          id: string | null
          name: string | null
          rank: number | null
          slug: string | null
          total_attempts: number | null
          total_points: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "records_level_id_fkey"
            columns: ["hardest_level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_level_id_fkey"
            columns: ["hardest_level_id"]
            isOneToOne: false
            referencedRelation: "levels_view"
            referencedColumns: ["id"]
          },
        ]
      }
      recent_changes_view: {
        Row: {
          attempts: number | null
          event_date: string | null
          happened_at: string | null
          id: string | null
          kind: string | null
          level_id: string | null
          level_name: string | null
          level_slug: string | null
          new_position: number | null
          old_position: number | null
          player_id: string | null
          player_name: string | null
          player_slug: string | null
          video_url: string | null
        }
        Relationships: []
      }
      records_view: {
        Row: {
          attempts: number | null
          created_at: string | null
          date_beaten: string | null
          enjoyment: number | null
          id: string | null
          is_first_victory: boolean | null
          level_difficulty: Database["public"]["Enums"]["gd_difficulty"] | null
          level_id: string | null
          level_name: string | null
          level_points: number | null
          level_position: number | null
          level_section: string | null
          level_slug: string | null
          notes: string | null
          player_country_code: string | null
          player_id: string | null
          player_name: string | null
          player_slug: string | null
          updated_at: string | null
          video_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "records_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "records_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_create_level: {
        Args: {
          p_creator?: string
          p_description?: string
          p_difficulty?: Database["public"]["Enums"]["gd_difficulty"]
          p_difficulty_rating?: number
          p_gd_level_id?: number
          p_length_seconds?: number
          p_name: string
          p_notes?: string
          p_points_override?: number
          p_position?: number
          p_showcase_video_url?: string
          p_slug: string
          p_thumbnail_path?: string
          p_verifier?: string
        }
        Returns: {
          created_at: string
          creator: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["gd_difficulty"]
          difficulty_rating: number | null
          gd_level_id: number | null
          id: string
          length_seconds: number | null
          name: string
          notes: string | null
          points_override: number | null
          position: number
          showcase_video_url: string | null
          slug: string
          thumbnail_path: string | null
          updated_at: string
          verifier: string | null
        }
        SetofOptions: {
          from: "*"
          to: "levels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_delete_level: { Args: { p_level_id: string }; Returns: boolean }
      admin_move_level: {
        Args: { p_level_id: string; p_new_position: number }
        Returns: {
          created_at: string
          creator: string | null
          description: string | null
          difficulty: Database["public"]["Enums"]["gd_difficulty"]
          difficulty_rating: number | null
          gd_level_id: number | null
          id: string
          length_seconds: number | null
          name: string
          notes: string | null
          points_override: number | null
          position: number
          showcase_video_url: string | null
          slug: string
          thumbnail_path: string | null
          updated_at: string
          verifier: string | null
        }
        SetofOptions: {
          from: "*"
          to: "levels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      level_points: { Args: { p_position: number }; Returns: number }
      level_section: { Args: { p_position: number }; Returns: string }
      search_site: {
        Args: { q: string }
        Returns: {
          id: string
          kind: string
          name: string
          position: number
          slug: string
        }[]
      }
    }
    Enums: {
      gd_difficulty:
        | "auto"
        | "easy"
        | "normal"
        | "hard"
        | "harder"
        | "insane"
        | "easy_demon"
        | "medium_demon"
        | "hard_demon"
        | "insane_demon"
        | "extreme_demon"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      gd_difficulty: [
        "auto",
        "easy",
        "normal",
        "hard",
        "harder",
        "insane",
        "easy_demon",
        "medium_demon",
        "hard_demon",
        "insane_demon",
        "extreme_demon",
      ],
    },
  },
} as const
