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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      boosts: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          platform: string
          remaining_boosts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          platform?: string
          remaining_boosts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          platform?: string
          remaining_boosts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cafes: {
        Row: {
          address: string
          category: string
          created_at: string
          distance: string | null
          google_place_id: string | null
          id: string
          image_url: string | null
          is_open: boolean | null
          last_synced_at: string | null
          latitude: number | null
          longitude: number | null
          name: string
          opening_hours: string | null
          rating: number | null
        }
        Insert: {
          address?: string
          category?: string
          created_at?: string
          distance?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean | null
          last_synced_at?: string | null
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_hours?: string | null
          rating?: number | null
        }
        Update: {
          address?: string
          category?: string
          created_at?: string
          distance?: string | null
          google_place_id?: string | null
          id?: string
          image_url?: string | null
          is_open?: boolean | null
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
      daily_random_matches: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          match_date: string
          matched_user_id: string
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          match_date?: string
          matched_user_id: string
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          match_date?: string
          matched_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_random_matches_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          payment_type: string
          product_name: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_type?: string
          product_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          payment_type?: string
          product_name?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          cafe_id: string | null
          id: string
          viewed_at: string
          viewed_profile_id: string
          viewer_id: string
        }
        Insert: {
          cafe_id?: string | null
          id?: string
          viewed_at?: string
          viewed_profile_id: string
          viewer_id: string
        }
        Update: {
          cafe_id?: string | null
          id?: string
          viewed_at?: string
          viewed_profile_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          allow_dms: boolean
          bio: string | null
          boosted_until: string | null
          coffee_preference: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          gender: string | null
          hide_last_seen: boolean
          hobbies: string[] | null
          id: string
          is_verified: boolean
          is_visible: boolean | null
          name: string
          notifications_enabled: boolean
          phone: string | null
          photo_moderation_status: string
          photo_url: string | null
          photo_urls: string[] | null
          purpose: string
          show_read_receipts: boolean
          social_energy: string | null
          updated_at: string
          user_id: string
          verification_requested_at: string | null
          verification_selfie_url: string | null
          verification_status: string
        }
        Insert: {
          age?: number | null
          allow_dms?: boolean
          bio?: string | null
          boosted_until?: string | null
          coffee_preference?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          hide_last_seen?: boolean
          hobbies?: string[] | null
          id?: string
          is_verified?: boolean
          is_visible?: boolean | null
          name?: string
          notifications_enabled?: boolean
          phone?: string | null
          photo_moderation_status?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          purpose?: string
          show_read_receipts?: boolean
          social_energy?: string | null
          updated_at?: string
          user_id: string
          verification_requested_at?: string | null
          verification_selfie_url?: string | null
          verification_status?: string
        }
        Update: {
          age?: number | null
          allow_dms?: boolean
          bio?: string | null
          boosted_until?: string | null
          coffee_preference?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          gender?: string | null
          hide_last_seen?: boolean
          hobbies?: string[] | null
          id?: string
          is_verified?: boolean
          is_visible?: boolean | null
          name?: string
          notifications_enabled?: boolean
          phone?: string | null
          photo_moderation_status?: string
          photo_url?: string | null
          photo_urls?: string[] | null
          purpose?: string
          show_read_receipts?: boolean
          social_energy?: string | null
          updated_at?: string
          user_id?: string
          verification_requested_at?: string | null
          verification_selfie_url?: string | null
          verification_status?: string
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
      sparks: {
        Row: {
          cafe_id: string
          created_at: string
          expires_at: string
          from_user_id: string
          id: string
          responded_at: string | null
          status: string
          to_user_id: string
        }
        Insert: {
          cafe_id: string
          created_at?: string
          expires_at?: string
          from_user_id: string
          id?: string
          responded_at?: string | null
          status?: string
          to_user_id: string
        }
        Update: {
          cafe_id?: string
          created_at?: string
          expires_at?: string
          from_user_id?: string
          id?: string
          responded_at?: string | null
          status?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sparks_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          google_play_product_id: string | null
          google_play_purchase_token: string | null
          id: string
          last_receipt: string | null
          plan_type: string
          platform: string
          product_id: string | null
          started_at: string | null
          status: string
          store: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          google_play_product_id?: string | null
          google_play_purchase_token?: string | null
          id?: string
          last_receipt?: string | null
          plan_type?: string
          platform?: string
          product_id?: string | null
          started_at?: string | null
          status?: string
          store?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          google_play_product_id?: string | null
          google_play_purchase_token?: string | null
          id?: string
          last_receipt?: string | null
          plan_type?: string
          platform?: string
          product_id?: string | null
          started_at?: string | null
          status?: string
          store?: string
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
      user_bans: {
        Row: {
          ban_type: string
          banned_at: string
          banned_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          unbanned_at: string | null
          unbanned_by: string | null
          user_id: string
        }
        Insert: {
          ban_type?: string
          banned_at?: string
          banned_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_id: string
        }
        Update: {
          ban_type?: string
          banned_at?: string
          banned_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          unbanned_at?: string | null
          unbanned_by?: string | null
          user_id?: string
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
      user_favorite_venues: {
        Row: {
          created_at: string
          id: string
          user_id: string
          venue_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          venue_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorite_venues_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
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
      user_warnings: {
        Row: {
          created_at: string
          id: string
          reason: string
          user_id: string
          warned_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          user_id: string
          warned_by: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
          warned_by?: string
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
      can_send_spark: { Args: { target_user_id: string }; Returns: boolean }
      check_mutual_wave: {
        Args: { target_cafe_id: string; user_a: string; user_b: string }
        Returns: boolean
      }
      count_recent_message_requests: {
        Args: { user_id: string }
        Returns: number
      }
      expire_stale_sparks: { Args: never; Returns: undefined }
      get_daily_chat_starts: {
        Args: { target_user_id: string }
        Returns: number
      }
      get_daily_spark_count: {
        Args: { target_user_id: string }
        Returns: number
      }
      has_match_between: {
        Args: { user_a: string; user_b: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_chat_starts: {
        Args: { target_user_id: string }
        Returns: number
      }
      increment_unread_count: {
        Args: { count_type: string; target_user_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_blocked: {
        Args: { checker_id: string; target_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { conv_id: string; user_id: string }
        Returns: boolean
      }
      is_premium: { Args: { target_user_id: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
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
      app_role: "super_admin" | "moderator" | "support"
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
      app_role: ["super_admin", "moderator", "support"],
    },
  },
} as const
