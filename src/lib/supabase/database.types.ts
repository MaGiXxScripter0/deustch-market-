export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string;
          description_de: string;
          filter_config: Json;
          id: string;
          image_path: string | null;
          is_active: boolean;
          name_de: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description_de?: string;
          filter_config?: Json;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name_de: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description_de?: string;
          filter_config?: Json;
          id?: string;
          image_path?: string | null;
          is_active?: boolean;
          name_de?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          available_qty: number;
          delivery_available: boolean;
          lead_time_de: string;
          location_id: string;
          pickup_available: boolean;
          product_id: string;
          updated_at: string;
        };
        Insert: {
          available_qty?: number;
          delivery_available?: boolean;
          lead_time_de?: string;
          location_id: string;
          pickup_available?: boolean;
          product_id: string;
          updated_at?: string;
        };
        Update: {
          available_qty?: number;
          delivery_available?: boolean;
          lead_time_de?: string;
          location_id?: string;
          pickup_available?: boolean;
          product_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address_de: string | null;
          id: string;
          is_active: boolean;
          location_type: string;
          name_de: string;
          slug: string;
        };
        Insert: {
          address_de?: string | null;
          id?: string;
          is_active?: boolean;
          location_type: string;
          name_de: string;
          slug: string;
        };
        Update: {
          address_de?: string | null;
          id?: string;
          is_active?: boolean;
          location_type?: string;
          name_de?: string;
          slug?: string;
        };
        Relationships: [];
      };
      product_images: {
        Row: {
          alt_de: string;
          id: string;
          product_id: string;
          sort_order: number;
          storage_path: string;
        };
        Insert: {
          alt_de: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          storage_path: string;
        };
        Update: {
          alt_de?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variant_links: {
        Row: {
          label_de: string;
          product_id: string;
          sibling_product_id: string;
        };
        Insert: {
          label_de: string;
          product_id: string;
          sibling_product_id: string;
        };
        Update: {
          label_de?: string;
          product_id?: string;
          sibling_product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variant_links_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_variant_links_sibling_product_id_fkey";
            columns: ["sibling_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          base_price: number;
          base_quantity: number;
          base_unit: string;
          brand: string;
          category_id: string | null;
          coverage_per_unit: number | null;
          created_at: string;
          description_de: string;
          id: string;
          is_active: boolean;
          is_featured: boolean;
          gtin: string | null;
          last_synced_at: string | null;
          name_de: string;
          price_gross: number;
          primary_image_url: string | null;
          sale_unit: string;
          search_aliases: string[];
          search_document: unknown;
          short_description_de: string;
          sku: string;
          slug: string;
          source_url: string | null;
          specs: Json;
          updated_at: string;
          variant_group: string | null;
          variant_label: string | null;
          vat_rate: number;
          weight_kg: number;
        };
        Insert: {
          base_price: number;
          base_quantity?: number;
          base_unit: string;
          brand: string;
          category_id: string | null;
          coverage_per_unit?: number | null;
          created_at?: string;
          description_de?: string;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          gtin?: string | null;
          last_synced_at?: string | null;
          name_de: string;
          price_gross: number;
          primary_image_url?: string | null;
          sale_unit: string;
          search_aliases?: string[];
          search_document?: unknown;
          short_description_de?: string;
          sku: string;
          slug: string;
          source_url?: string | null;
          specs?: Json;
          updated_at?: string;
          variant_group?: string | null;
          variant_label?: string | null;
          vat_rate?: number;
          weight_kg?: number;
        };
        Update: {
          base_price?: number;
          base_quantity?: number;
          base_unit?: string;
          brand?: string;
          category_id?: string | null;
          coverage_per_unit?: number | null;
          created_at?: string;
          description_de?: string;
          id?: string;
          is_active?: boolean;
          is_featured?: boolean;
          gtin?: string | null;
          last_synced_at?: string | null;
          name_de?: string;
          price_gross?: number;
          primary_image_url?: string | null;
          sale_unit?: string;
          search_aliases?: string[];
          search_document?: unknown;
          short_description_de?: string;
          sku?: string;
          slug?: string;
          source_url?: string | null;
          specs?: Json;
          updated_at?: string;
          variant_group?: string | null;
          variant_label?: string | null;
          vat_rate?: number;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["profile_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["profile_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      request_items: {
        Row: {
          id: string;
          line_total: number;
          name_snapshot: string;
          picked_qty: number;
          product_id: string | null;
          quantity: number;
          request_id: string;
          sale_unit_snapshot: string;
          sku_snapshot: string;
          unit_price: number;
        };
        Insert: {
          id?: string;
          line_total: number;
          name_snapshot: string;
          picked_qty?: number;
          product_id?: string | null;
          quantity: number;
          request_id: string;
          sale_unit_snapshot: string;
          sku_snapshot: string;
          unit_price: number;
        };
        Update: {
          id?: string;
          line_total?: number;
          name_snapshot?: string;
          picked_qty?: number;
          product_id?: string | null;
          quantity?: number;
          request_id?: string;
          sale_unit_snapshot?: string;
          sku_snapshot?: string;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "request_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_items_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      requests: {
        Row: {
          comment: string;
          consent_at: string;
          created_at: string;
          currency: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string;
          fulfillment: Database["public"]["Enums"]["fulfillment_type"];
          id: string;
          pickup_code: string;
          pickup_slot_start: string | null;
          postal_code: string | null;
          request_number: string;
          status: Database["public"]["Enums"]["request_status"];
          subtotal: number;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          comment?: string;
          consent_at?: string;
          created_at?: string;
          currency?: string;
          customer_email: string;
          customer_name: string;
          customer_phone: string;
          fulfillment: Database["public"]["Enums"]["fulfillment_type"];
          id?: string;
          pickup_code: string;
          pickup_slot_start?: string | null;
          postal_code?: string | null;
          request_number: string;
          status?: Database["public"]["Enums"]["request_status"];
          subtotal: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          comment?: string;
          consent_at?: string;
          created_at?: string;
          currency?: string;
          customer_email?: string;
          customer_name?: string;
          customer_phone?: string;
          fulfillment?: Database["public"]["Enums"]["fulfillment_type"];
          id?: string;
          pickup_code?: string;
          pickup_slot_start?: string | null;
          postal_code?: string | null;
          request_number?: string;
          status?: Database["public"]["Enums"]["request_status"];
          subtotal?: number;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      array_to_search_text: { Args: { value: string[] }; Returns: string };
      cancel_own_pickup_order: {
        Args: { p_request_id: string };
        Returns: undefined;
      };
      get_pickup_order_tracking: {
        Args: { p_pickup_code: string; p_request_number: string };
        Returns: Json;
      };
      place_request: {
        Args: {
          p_comment: string;
          p_consent: boolean;
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_fulfillment: Database["public"]["Enums"]["fulfillment_type"];
          p_items: Json;
          p_postal_code: string;
        };
        Returns: string;
      };
      place_pickup_order: {
        Args: {
          p_comment: string;
          p_consent: boolean;
          p_customer_email: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_items: Json;
          p_pickup_slot_start: string;
        };
        Returns: Json;
      };
      search_products: {
        Args: {
          category_slug?: string;
          filter_values?: Json;
          page_number?: number;
          search_query?: string;
          sort_order?: string;
        };
        Returns: Json;
      };
      search_suggestions: {
        Args: { search_query: string };
        Returns: {
          href: string;
          label: string;
          meta: string;
          suggestion_type: string;
        }[];
      };
      set_pickup_order_status: {
        Args: {
          p_request_id: string;
          p_status: Database["public"]["Enums"]["request_status"];
        };
        Returns: undefined;
      };
      set_pickup_item_picked: {
        Args: { p_picked: boolean; p_request_item_id: string };
        Returns: undefined;
      };
      reschedule_own_pickup_order: {
        Args: { p_pickup_slot_start: string; p_request_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      fulfillment_type: "pickup" | "delivery";
      profile_role: "customer" | "admin";
      request_status:
        "new" | "processing" | "quoted" | "completed" | "cancelled" | "ready_for_pickup";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
