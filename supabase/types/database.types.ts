export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    "private": {
        Tables: {
            "platform_admins": {
                Row: {
                    "created_at": string;
                    "user_id": string;
                };
                Insert: {
                    "created_at"?: string;
                    "user_id": string;
                };
                Update: {
                    "created_at"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "is_business_admin": {
                Args: {
                    "target_business_id": string;
                };
                Returns: boolean;
            };
            "is_platform_admin": {
                Args: Record<PropertyKey, never>;
                Returns: boolean;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
    "public": {
        Tables: {
            "business_memberships": {
                Row: {
                    "business_id": string;
                    "created_at": string;
                    "role": string;
                    "user_id": string;
                };
                Insert: {
                    "business_id": string;
                    "created_at"?: string;
                    "role": string;
                    "user_id": string;
                };
                Update: {
                    "business_id"?: string;
                    "created_at"?: string;
                    "role"?: string;
                    "user_id"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "business_memberships_business_fkey";
                        columns: [
                            "business_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "businesses";
                        referencedColumns: [
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "business_memberships_profile_fkey";
                        columns: [
                            "user_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "profiles";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "businesses": {
                Row: {
                    "created_at": string;
                    "currency_code": string;
                    "id": string;
                    "is_active": boolean;
                    "name": string;
                    "slug": string;
                    "timezone": string;
                    "updated_at": string;
                };
                Insert: {
                    "created_at"?: string;
                    "currency_code"?: string;
                    "id"?: string;
                    "is_active"?: boolean;
                    "name": string;
                    "slug": string;
                    "timezone": string;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "currency_code"?: string;
                    "id"?: string;
                    "is_active"?: boolean;
                    "name"?: string;
                    "slug"?: string;
                    "timezone"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                ];
            };
            "loyalty_settings": {
                Row: {
                    "business_id": string;
                    "created_at": string;
                    "currency_per_point": number;
                    "points_enabled": boolean;
                    "updated_at": string;
                };
                Insert: {
                    "business_id": string;
                    "created_at"?: string;
                    "currency_per_point"?: number;
                    "points_enabled"?: boolean;
                    "updated_at"?: string;
                };
                Update: {
                    "business_id"?: string;
                    "created_at"?: string;
                    "currency_per_point"?: number;
                    "points_enabled"?: boolean;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "loyalty_settings_business_fkey";
                        columns: [
                            "business_id"
                        ];
                        isOneToOne: true;
                        referencedRelation: "businesses";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "menu_categories": {
                Row: {
                    "business_id": string;
                    "created_at": string;
                    "display_order": number;
                    "id": string;
                    "is_active": boolean;
                    "name": string;
                    "slug": string;
                    "updated_at": string;
                };
                Insert: {
                    "business_id": string;
                    "created_at"?: string;
                    "display_order"?: number;
                    "id"?: string;
                    "is_active"?: boolean;
                    "name": string;
                    "slug": string;
                    "updated_at"?: string;
                };
                Update: {
                    "business_id"?: string;
                    "created_at"?: string;
                    "display_order"?: number;
                    "id"?: string;
                    "is_active"?: boolean;
                    "name"?: string;
                    "slug"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "menu_categories_business_fkey";
                        columns: [
                            "business_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "businesses";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "menu_items": {
                Row: {
                    "business_id": string;
                    "category_id": string;
                    "created_at": string;
                    "description": string | null;
                    "display_order": number;
                    "id": string;
                    "image_alt": string | null;
                    "image_path": string | null;
                    "image_presentation": string;
                    "is_active": boolean;
                    "is_available": boolean;
                    "is_featured": boolean;
                    "name": string;
                    "price_amount": number;
                    "updated_at": string;
                };
                Insert: {
                    "business_id": string;
                    "category_id": string;
                    "created_at"?: string;
                    "description"?: string | null;
                    "display_order"?: number;
                    "id"?: string;
                    "image_alt"?: string | null;
                    "image_path"?: string | null;
                    "image_presentation"?: string;
                    "is_active"?: boolean;
                    "is_available"?: boolean;
                    "is_featured"?: boolean;
                    "name": string;
                    "price_amount": number;
                    "updated_at"?: string;
                };
                Update: {
                    "business_id"?: string;
                    "category_id"?: string;
                    "created_at"?: string;
                    "description"?: string | null;
                    "display_order"?: number;
                    "id"?: string;
                    "image_alt"?: string | null;
                    "image_path"?: string | null;
                    "image_presentation"?: string;
                    "is_active"?: boolean;
                    "is_available"?: boolean;
                    "is_featured"?: boolean;
                    "name"?: string;
                    "price_amount"?: number;
                    "updated_at"?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "menu_items_business_category_fkey";
                        columns: [
                            "business_id",
                            "category_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "menu_categories";
                        referencedColumns: [
                            "business_id",
                            "id"
                        ];
                    },
                    {
                        foreignKeyName: "menu_items_business_fkey";
                        columns: [
                            "business_id"
                        ];
                        isOneToOne: false;
                        referencedRelation: "businesses";
                        referencedColumns: [
                            "id"
                        ];
                    }
                ];
            };
            "profiles": {
                Row: {
                    "created_at": string;
                    "display_name": string | null;
                    "id": string;
                    "updated_at": string;
                };
                Insert: {
                    "created_at"?: string;
                    "display_name"?: string | null;
                    "id": string;
                    "updated_at"?: string;
                };
                Update: {
                    "created_at"?: string;
                    "display_name"?: string | null;
                    "id"?: string;
                    "updated_at"?: string;
                };
                Relationships: [
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            "is_current_user_platform_admin": {
                Args: Record<PropertyKey, never>;
                Returns: boolean;
            };
        };
        Enums: {
            [_ in never]: never;
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];
export type Tables<DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]) : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] & DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
    Row: infer R;
} ? R : never : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"]) ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
    Row: infer R;
} ? R : never : never;
export type TablesInsert<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I;
} ? I : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I;
} ? I : never : never;
export type TablesUpdate<DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | {
    schema: keyof DatabaseWithoutInternals;
}, TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] : never = never> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U;
} ? U : never : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U;
} ? U : never : never;
export type Enums<DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | {
    schema: keyof DatabaseWithoutInternals;
}, EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"] : never = never> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName] : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions] : never;
export type CompositeTypes<PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] | {
    schema: keyof DatabaseWithoutInternals;
}, CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"] : never = never> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
} ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName] : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"] ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions] : never;
export const Constants = {
    "private": {
        Enums: {}
    }, "public": {
        Enums: {}
    }
} as const;
