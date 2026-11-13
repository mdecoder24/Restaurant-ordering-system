export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: { extensions?: Json; operationName?: string; query?: string; variables?: Json };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      addon_groups: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          max_select: number;
          min_select: number;
          name: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          max_select?: number;
          min_select?: number;
          name: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          max_select?: number;
          min_select?: number;
          name?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addon_groups_item_id_tenant_id_fkey";
            columns: ["item_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      addons: {
        Row: {
          available: boolean;
          created_at: string;
          group_id: string;
          id: string;
          name: string;
          price: number;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available?: boolean;
          created_at?: string;
          group_id: string;
          id?: string;
          name: string;
          price?: number;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          created_at?: string;
          group_id?: string;
          id?: string;
          name?: string;
          price?: number;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addons_group_id_tenant_id_fkey";
            columns: ["group_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "addon_groups";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      admin_audit: {
        Row: {
          action: string;
          admin_user_id: string;
          created_at: string;
          id: number;
          payload: NonNullable<Json>;
          tenant_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          admin_user_id: string;
          created_at?: string;
          id?: never;
          payload?: NonNullable<Json>;
          tenant_id?: string | null;
        };
        Update: {
          action?: string;
          admin_user_id?: string;
          created_at?: string;
          id?: never;
          payload?: NonNullable<Json>;
          tenant_id?: string | null;
        };
        Relationships: [];
      };
      daily_metrics: {
        Row: {
          aov: number;
          avg_prep_seconds: number | null;
          cancelled: number;
          created_at: string;
          date: string;
          hourly: NonNullable<Json>;
          id: string;
          orders: number;
          outlet_id: string;
          revenue: number;
          tenant_id: string;
          top_items: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          aov?: number;
          avg_prep_seconds?: number | null;
          cancelled?: number;
          created_at?: string;
          date: string;
          hourly?: NonNullable<Json>;
          id?: string;
          orders?: number;
          outlet_id: string;
          revenue?: number;
          tenant_id: string;
          top_items?: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          aov?: number;
          avg_prep_seconds?: number | null;
          cancelled?: number;
          created_at?: string;
          date?: string;
          hourly?: NonNullable<Json>;
          id?: string;
          orders?: number;
          outlet_id?: string;
          revenue?: number;
          tenant_id?: string;
          top_items?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_metrics_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      invoice_counters: {
        Row: {
          fiscal_year: string;
          last_no: number;
          tenant_id: string;
        };
        ComputedFields: never;
        Insert: {
          fiscal_year: string;
          last_no?: number;
          tenant_id: string;
        };
        Update: {
          fiscal_year?: string;
          last_no?: number;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_counters_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          created_at: string;
          id: string;
          invoice_no: string;
          outlet_id: string;
          pdf_path: string | null;
          session_id: string;
          tenant_id: string;
          totals: NonNullable<Json>;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          invoice_no: string;
          outlet_id: string;
          pdf_path?: string | null;
          session_id: string;
          tenant_id: string;
          totals: NonNullable<Json>;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invoice_no?: string;
          outlet_id?: string;
          pdf_path?: string | null;
          session_id?: string;
          tenant_id?: string;
          totals?: NonNullable<Json>;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "invoices_session_id_tenant_id_fkey";
            columns: ["session_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      item_variants: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          item_id: string;
          name: string;
          price_delta: number;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          item_id: string;
          name: string;
          price_delta?: number;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          item_id?: string;
          name?: string;
          price_delta?: number;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "item_variants_item_id_tenant_id_fkey";
            columns: ["item_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      members: {
        Row: {
          active: boolean;
          created_at: string;
          display_name: string;
          id: string;
          outlet_id: string | null;
          pin_hash: string | null;
          role: Database["public"]["Enums"]["member_role"];
          tenant_id: string;
          updated_at: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          display_name: string;
          id?: string;
          outlet_id?: string | null;
          pin_hash?: string | null;
          role: Database["public"]["Enums"]["member_role"];
          tenant_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          display_name?: string;
          id?: string;
          outlet_id?: string | null;
          pin_hash?: string | null;
          role?: Database["public"]["Enums"]["member_role"];
          tenant_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "members_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "members_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          name: string;
          outlet_id: string;
          sort_order: number;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          outlet_id: string;
          sort_order?: number;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          outlet_id?: string;
          sort_order?: number;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_categories_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      menu_items: {
        Row: {
          available: boolean;
          category_id: string;
          created_at: string;
          description: string | null;
          dietary_tags: string[];
          id: string;
          image_path: string | null;
          is_veg: boolean;
          name: string;
          outlet_id: string;
          prep_station: string | null;
          price: number;
          sort_order: number;
          tax_rate_bps: number | null;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          available?: boolean;
          category_id: string;
          created_at?: string;
          description?: string | null;
          dietary_tags?: string[];
          id?: string;
          image_path?: string | null;
          is_veg?: boolean;
          name: string;
          outlet_id: string;
          prep_station?: string | null;
          price: number;
          sort_order?: number;
          tax_rate_bps?: number | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          available?: boolean;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          dietary_tags?: string[];
          id?: string;
          image_path?: string | null;
          is_veg?: boolean;
          name?: string;
          outlet_id?: string;
          prep_station?: string | null;
          price?: number;
          sort_order?: number;
          tax_rate_bps?: number | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_outlet_id_fkey";
            columns: ["category_id", "outlet_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id", "outlet_id"];
          },
          {
            foreignKeyName: "menu_items_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      order_events: {
        Row: {
          actor_id: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"];
          created_at: string;
          id: number;
          order_id: string;
          outlet_id: string;
          payload: NonNullable<Json>;
          tenant_id: string;
          type: string;
        };
        ComputedFields: never;
        Insert: {
          actor_id?: string | null;
          actor_type: Database["public"]["Enums"]["actor_type"];
          created_at?: string;
          id?: never;
          order_id: string;
          outlet_id: string;
          payload?: NonNullable<Json>;
          tenant_id: string;
          type: string;
        };
        Update: {
          actor_id?: string | null;
          actor_type?: Database["public"]["Enums"]["actor_type"];
          created_at?: string;
          id?: never;
          order_id?: string;
          outlet_id?: string;
          payload?: NonNullable<Json>;
          tenant_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_tenant_id_fkey";
            columns: ["order_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      order_items: {
        Row: {
          addons_snapshot: NonNullable<Json>;
          created_at: string;
          id: string;
          item_id: string | null;
          line_total: number;
          name_snapshot: string;
          note: string | null;
          order_id: string;
          prep_station: string | null;
          qty: number;
          status: Database["public"]["Enums"]["order_item_status"];
          tax_rate_bps: number;
          tenant_id: string;
          unit_price: number;
          updated_at: string;
          variant_snapshot: Json | null;
        };
        ComputedFields: never;
        Insert: {
          addons_snapshot?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          item_id?: string | null;
          line_total: number;
          name_snapshot: string;
          note?: string | null;
          order_id: string;
          prep_station?: string | null;
          qty: number;
          status?: Database["public"]["Enums"]["order_item_status"];
          tax_rate_bps?: number;
          tenant_id: string;
          unit_price: number;
          updated_at?: string;
          variant_snapshot?: Json | null;
        };
        Update: {
          addons_snapshot?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          item_id?: string | null;
          line_total?: number;
          name_snapshot?: string;
          note?: string | null;
          order_id?: string;
          prep_station?: string | null;
          qty?: number;
          status?: Database["public"]["Enums"]["order_item_status"];
          tax_rate_bps?: number;
          tenant_id?: string;
          unit_price?: number;
          updated_at?: string;
          variant_snapshot?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_tenant_id_fkey";
            columns: ["order_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      orders: {
        Row: {
          accepted_at: string | null;
          cancelled_reason: string | null;
          created_at: string;
          id: string;
          idempotency_key: string;
          note: string | null;
          order_no: number;
          outlet_id: string;
          placed_at: string;
          ready_at: string | null;
          rounding: number;
          served_at: string | null;
          service_charge: number;
          session_id: string;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          tax: number;
          tenant_id: string;
          total: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key: string;
          note?: string | null;
          order_no: number;
          outlet_id: string;
          placed_at?: string;
          ready_at?: string | null;
          rounding?: number;
          served_at?: string | null;
          service_charge?: number;
          session_id: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          tax: number;
          tenant_id: string;
          total: number;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          cancelled_reason?: string | null;
          created_at?: string;
          id?: string;
          idempotency_key?: string;
          note?: string | null;
          order_no?: number;
          outlet_id?: string;
          placed_at?: string;
          ready_at?: string | null;
          rounding?: number;
          served_at?: string | null;
          service_charge?: number;
          session_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          tax?: number;
          tenant_id?: string;
          total?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "orders_session_id_tenant_id_fkey";
            columns: ["session_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      outlet_counters: {
        Row: {
          day: string;
          last_order_no: number;
          outlet_id: string;
        };
        ComputedFields: never;
        Insert: {
          day: string;
          last_order_no?: number;
          outlet_id: string;
        };
        Update: {
          day?: string;
          last_order_no?: number;
          outlet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outlet_counters_outlet_id_fkey";
            columns: ["outlet_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id"];
          },
        ];
      };
      outlets: {
        Row: {
          address: string | null;
          auto_accept: boolean;
          counter_qr_token: string | null;
          created_at: string;
          id: string;
          mode: Database["public"]["Enums"]["outlet_mode"];
          name: string;
          open_hours: NonNullable<Json>;
          payment_options: NonNullable<Json>;
          service_charge_bps: number;
          tax_config: NonNullable<Json>;
          tenant_id: string;
          ticket_overdue_minutes: number;
          ticket_warn_minutes: number;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          auto_accept?: boolean;
          counter_qr_token?: string | null;
          created_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["outlet_mode"];
          name: string;
          open_hours?: NonNullable<Json>;
          payment_options?: NonNullable<Json>;
          service_charge_bps?: number;
          tax_config?: NonNullable<Json>;
          tenant_id: string;
          ticket_overdue_minutes?: number;
          ticket_warn_minutes?: number;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          auto_accept?: boolean;
          counter_qr_token?: string | null;
          created_at?: string;
          id?: string;
          mode?: Database["public"]["Enums"]["outlet_mode"];
          name?: string;
          open_hours?: NonNullable<Json>;
          payment_options?: NonNullable<Json>;
          service_charge_bps?: number;
          tax_config?: NonNullable<Json>;
          tenant_id?: string;
          ticket_overdue_minutes?: number;
          ticket_warn_minutes?: number;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outlets_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          method: Database["public"]["Enums"]["payment_method"];
          outlet_id: string;
          provider: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          raw: NonNullable<Json>;
          recorded_by: string | null;
          refunded_amount: number;
          session_id: string;
          status: Database["public"]["Enums"]["payment_status"];
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          method: Database["public"]["Enums"]["payment_method"];
          outlet_id: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          raw?: NonNullable<Json>;
          recorded_by?: string | null;
          refunded_amount?: number;
          session_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          method?: Database["public"]["Enums"]["payment_method"];
          outlet_id?: string;
          provider?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          raw?: NonNullable<Json>;
          recorded_by?: string | null;
          refunded_amount?: number;
          session_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "payments_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_session_id_tenant_id_fkey";
            columns: ["session_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      refunds: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          id: string;
          payment_id: string;
          provider_refund_id: string | null;
          reason: string | null;
          status: string;
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          payment_id: string;
          provider_refund_id?: string | null;
          reason?: string | null;
          status?: string;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          payment_id?: string;
          provider_refund_id?: string | null;
          reason?: string | null;
          status?: string;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "refunds_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "refunds_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      service_requests: {
        Row: {
          created_at: string;
          id: string;
          outlet_id: string;
          session_id: string;
          status: Database["public"]["Enums"]["service_request_status"];
          table_id: string | null;
          tenant_id: string;
          type: Database["public"]["Enums"]["service_request_type"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          outlet_id: string;
          session_id: string;
          status?: Database["public"]["Enums"]["service_request_status"];
          table_id?: string | null;
          tenant_id: string;
          type: Database["public"]["Enums"]["service_request_type"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          outlet_id?: string;
          session_id?: string;
          status?: Database["public"]["Enums"]["service_request_status"];
          table_id?: string | null;
          tenant_id?: string;
          type?: Database["public"]["Enums"]["service_request_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "service_requests_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "service_requests_session_id_tenant_id_fkey";
            columns: ["session_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "service_requests_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      table_sessions: {
        Row: {
          closed_at: string | null;
          created_at: string;
          guest_phone: string | null;
          id: string;
          opened_at: string;
          outlet_id: string;
          secret_hash: string;
          status: Database["public"]["Enums"]["session_status"];
          table_id: string | null;
          tenant_id: string;
          token_no: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          guest_phone?: string | null;
          id?: string;
          opened_at?: string;
          outlet_id: string;
          secret_hash: string;
          status?: Database["public"]["Enums"]["session_status"];
          table_id?: string | null;
          tenant_id: string;
          token_no?: number | null;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          guest_phone?: string | null;
          id?: string;
          opened_at?: string;
          outlet_id?: string;
          secret_hash?: string;
          status?: Database["public"]["Enums"]["session_status"];
          table_id?: string | null;
          tenant_id?: string;
          token_no?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_sessions_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
        ];
      };
      tables: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          label: string;
          outlet_id: string;
          qr_token: string;
          seats: number;
          status: Database["public"]["Enums"]["table_status"];
          tenant_id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label: string;
          outlet_id: string;
          qr_token?: string;
          seats?: number;
          status?: Database["public"]["Enums"]["table_status"];
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          label?: string;
          outlet_id?: string;
          qr_token?: string;
          seats?: number;
          status?: Database["public"]["Enums"]["table_status"];
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tables_outlet_id_tenant_id_fkey";
            columns: ["outlet_id", "tenant_id"];
            isOneToOne: false;
            referencedRelation: "outlets";
            referencedColumns: ["id", "tenant_id"];
          },
        ];
      };
      tenants: {
        Row: {
          created_at: string;
          gstin: string | null;
          id: string;
          name: string;
          plan: string;
          slug: string;
          status: Database["public"]["Enums"]["tenant_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          gstin?: string | null;
          id?: string;
          name: string;
          plan?: string;
          slug: string;
          status?: Database["public"]["Enums"]["tenant_status"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          gstin?: string | null;
          id?: string;
          name?: string;
          plan?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["tenant_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      webhook_events: {
        Row: {
          event: string;
          id: string;
          provider: string;
          received_at: string;
        };
        ComputedFields: never;
        Insert: {
          event: string;
          id: string;
          provider: string;
          received_at?: string;
        };
        Update: {
          event?: string;
          id?: string;
          provider?: string;
          received_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_refund: { Args: { p_refund: string }; Returns: undefined };
      close_session: {
        Args: { p_invoice_no: string; p_session: string; p_totals: Json };
        Returns: string;
      };
      new_qr_token: { Args: Record<PropertyKey, never>; Returns: string };
      next_invoice_no: { Args: { p_tenant: string; p_timezone: string }; Returns: string };
      onboard_tenant: {
        Args: {
          p_display_name: string;
          p_mode: Database["public"]["Enums"]["outlet_mode"];
          p_outlet_name: string;
          p_slug: string;
          p_tenant_name: string;
        };
        Returns: string;
      };
      place_order: {
        Args: {
          p_idempotency_key: string;
          p_items: Json;
          p_note: string;
          p_session: string;
          p_totals: Json;
        };
        Returns: {
          created: boolean;
          order_id: string;
          order_no: number;
        }[];
      };
      rollup_all_outlets: { Args: { p_days_back: number }; Returns: undefined };
      rollup_daily_metrics: { Args: { p_day: string; p_outlet: string }; Returns: undefined };
      session_balance: {
        Args: { p_session: string };
        Returns: {
          billed: number;
          due: number;
          paid: number;
        }[];
      };
      set_items_availability: {
        Args: { is_available: boolean; item_ids: string[] };
        Returns: number;
      };
      transition_order: {
        Args: {
          p_actor_id: string;
          p_actor_type: Database["public"]["Enums"]["actor_type"];
          p_from: Database["public"]["Enums"]["order_status"];
          p_order: string;
          p_reason: string;
          p_to: Database["public"]["Enums"]["order_status"];
        };
        Returns: boolean;
      };
    };
    Enums: {
      actor_type: "guest" | "staff" | "system";
      member_role: "owner" | "manager" | "waiter" | "kitchen";
      order_item_status: "pending" | "done";
      order_status:
        "placed" | "accepted" | "preparing" | "ready" | "served" | "rejected" | "cancelled";
      outlet_mode: "dine_in" | "canteen";
      payment_method: "upi" | "card" | "online" | "cash";
      payment_status: "created" | "authorized" | "captured" | "failed" | "refunded";
      service_request_status: "open" | "acknowledged" | "resolved";
      service_request_type: "call_waiter" | "request_bill";
      session_status: "open" | "closed";
      table_status: "free" | "occupied" | "bill_requested";
      tenant_status: "active" | "suspended";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      actor_type: ["guest", "staff", "system"],
      member_role: ["owner", "manager", "waiter", "kitchen"],
      order_item_status: ["pending", "done"],
      order_status: ["placed", "accepted", "preparing", "ready", "served", "rejected", "cancelled"],
      outlet_mode: ["dine_in", "canteen"],
      payment_method: ["upi", "card", "online", "cash"],
      payment_status: ["created", "authorized", "captured", "failed", "refunded"],
      service_request_status: ["open", "acknowledged", "resolved"],
      service_request_type: ["call_waiter", "request_bill"],
      session_status: ["open", "closed"],
      table_status: ["free", "occupied", "bill_requested"],
      tenant_status: ["active", "suspended"],
    },
  },
} as const;
