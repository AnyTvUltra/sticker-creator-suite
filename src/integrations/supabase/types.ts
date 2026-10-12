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
      label_products: {
        Row: {
          data: Json
          id: string
          inventory_item_id: string | null
          layout: Json
          name: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          data?: Json
          id?: string
          inventory_item_id?: string | null
          layout?: Json
          name: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          data?: Json
          id?: string
          inventory_item_id?: string | null
          layout?: Json
          name?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          is_admin: boolean
          active: boolean
          permissions: string[]
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          is_admin?: boolean
          active?: boolean
          permissions?: string[]
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          display_name?: string
          is_admin?: boolean
          active?: boolean
          permissions?: string[]
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          barcode: string
          category: string
          color: string
          cost: number
          created_at: string
          created_by: string | null
          id: string
          image: string
          location: string
          min_quantity: number
          model: string
          name: string
          notes: string
          price: number
          quantity: number
          size: string
          sku: string
          specs: string
          updated_at: string
          warranty: string
        }
        Insert: {
          barcode?: string
          category?: string
          color?: string
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          image?: string
          location?: string
          min_quantity?: number
          model?: string
          name: string
          notes?: string
          price?: number
          quantity?: number
          size?: string
          sku?: string
          specs?: string
          updated_at?: string
          warranty?: string
        }
        Update: {
          barcode?: string
          category?: string
          color?: string
          cost?: number
          created_at?: string
          created_by?: string | null
          id?: string
          image?: string
          location?: string
          min_quantity?: number
          model?: string
          name?: string
          notes?: string
          price?: number
          quantity?: number
          size?: string
          sku?: string
          specs?: string
          updated_at?: string
          warranty?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          item_id: string
          note: string
          quantity_after: number
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          item_id: string
          note?: string
          quantity_after: number
          user_id?: string | null
          username?: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          item_id?: string
          note?: string
          quantity_after?: number
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          username: string
          display_name: string
          is_admin: boolean
          active: boolean
          permissions: string[]
          created_at: string
          last_sign_in_at: string | null
        }[]
      }
      admin_create_user: {
        Args: { p_username: string; p_password: string; p_display_name: string; p_is_admin: boolean; p_permissions: string[] }
        Returns: string
      }
      admin_update_user: {
        Args: { p_user_id: string; p_display_name: string; p_is_admin: boolean; p_active: boolean; p_permissions: string[] }
        Returns: undefined
      }
      admin_set_password: {
        Args: { p_user_id: string; p_password: string }
        Returns: undefined
      }
      admin_delete_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      adjust_stock: {
        Args: { p_item: string; p_delta: number; p_note?: string }
        Returns: number
      }
      has_permission: {
        Args: { perm: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
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
    Enums: {},
  },
} as const
