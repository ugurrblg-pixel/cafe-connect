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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cafes: {
        Row: {
          address: string
          created_at: string
          distance: string | null
          google_place_id: string | null
          id: string
          image_url: string | null
          is_open: boolean
          last_synced_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: string | null
          rating: number | null
        }
        Insert: {
          address?: string
          created_at?: string
          distance?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: string | null
          rating?: number | null
        }
        Update: {
          address?: string
          created_at?: string
          distance?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_hours?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          cafe_id: string
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_time: string
          created_at: string
          expiry_time: string
          id: string
          last_active_at: string | null
          user_id: string
        }
        Insert: {
          cafe_id: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string
          created_at?: string
          expiry_time?: string
          id?: string
          last_active_at?: string | null
          user_id: string
        }
        Update: {
          cafe_id?: string
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_time?: string
          created_at?: string
          expiry_time?: string
          id?: string
          last_active_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          cafe_id: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          cafe_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          cafe_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_chat_starts: {
        Row: {
          chat_count: number
          chat_date: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          chat_count?: number
          chat_date?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          chat_count?: number
          chat_date?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          cafe_id: string
          conversation_id: string | null
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          cafe_id: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          cafe_id?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      message_requests: {
        Row: {
          cafe_id: string
          created_at: string
          from_user_id: string
          id: string
          preset_message: string
          responded_at: string | null
          status: string
          to_user_id: string
        }
        Insert: {
          cafe_id: string
          created_at?: string
          from_user_id: string
          id?: string
          preset_message: string
          responded_at?: string | null
          status?: string
          to_user_id: string
        }
        Update: {
          cafe_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          preset_message?: string
          responded_at?: string | null
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_requests_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          client_id: string | null
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          client_id?: string | null
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          client_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          body: string
          clicked_at: string | null
          data: Json | null
          id: string
          sent_at: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          clicked_at?: string | null
          data?: Json | null
          id?: string
          sent_at?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          clicked_at?: string | null
          data?: Json | null
          id?: string
          sent_at?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          viewed_at: string
          viewed_profile_id: string
          viewer_id: string
        }
        Insert: {
          id?: string
          viewed_at?: string
          viewed_profile_id: string
          viewer_id: string
        }
        Update: {
          id?: string
          viewed_at?: string
          viewed_profile_id?: string
          viewer_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          allow_dms: boolean
          bio: string | null
          boosted_until: string | null
          created_at: string
          display_name: string | null
          hide_last_seen: boolean
          hobbies: string[] | null
          id: string
          is_visible: boolean | null
          name: string
          notifications_enabled: boolean
          photo_url: string | null
          photo_urls: string[] | null
          purpose: string
          show_read_receipts: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          allow_dms?: boolean
          bio?: string | null
          boosted_until?: string | null
          created_at?: string
          display_name?: string | null
          hide_last_seen?: boolean
          hobbies?: string[] | null
          id?: string
          is_visible?: boolean | null
          name?: string
          notifications_enabled?: boolean
          photo_url?: string | null
          photo_urls?: string[] | null
          purpose?: string
          show_read_receipts?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          allow_dms?: boolean
          bio?: string | null
          boosted_until?: string | null
          created_at?: string
          display_name?: string | null
          hide_last_seen?: boolean
          hobbies?: string[] | null
          id?: string
          is_visible?: boolean | null
          name?: string
          notifications_enabled?: boolean
          photo_url?: string | null
          photo_urls?: string[] | null
          purpose?: string
          show_read_receipts?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          platform?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          google_play_product_id: string | null
          google_play_purchase_token: string | null
          id: string
          plan_type: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          google_play_product_id?: string | null
          google_play_purchase_token?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          google_play_product_id?: string | null
          google_play_purchase_token?: string | null
          id?: string
          plan_type?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      unread_counts: {
        Row: {
          messages: number
          updated_at: string
          user_id: string
          waves: number
        }
        Insert: {
          messages?: number
          updated_at?: string
          user_id: string
          waves?: number
        }
        Update: {
          messages?: number
          updated_at?: string
          user_id?: string
          waves?: number
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      waves: {
        Row: {
          cafe_id: string
          created_at: string
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          cafe_id: string
          created_at?: string
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          cafe_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waves_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_mutual_wave: {
        Args: { target_cafe_id: string; user_a: string; user_b: string }
        Returns: boolean
      }
      count_recent_message_requests: {
        Args: { user_id: string }
        Returns: number
      }
      get_daily_chat_starts: {
        Args: { target_user_id: string }
        Returns: number
      }
      increment_chat_starts: {
        Args: { target_user_id: string }
        Returns: number
      }
      increment_unread_count: {
        Args: { count_type: string; target_user_id: string }
        Returns: undefined
      }
      is_blocked: {
        Args: { checker_id: string; target_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { conv_id: string; user_id: string }
        Returns: boolean
      }
      is_premium: { Args: { target_user_id: string }; Returns: boolean }
      match_exists: {
        Args: { target_cafe_id: string; user_a: string; user_b: string }
        Returns: boolean
      }
      reset_unread_count: {
        Args: { count_type: string; target_user_id: string }
        Returns: undefined
      }
      users_in_same_cafe: {
        Args: { target_cafe_id: string; user1: string; user2: string }
        Returns: boolean
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
