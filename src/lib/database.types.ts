// 仮の型（0103・0105 の列定義から手書き）。Supabase CLI が入ったら次で生成し直して置き換える:
//   supabase gen types typescript --schema slideapp

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  slideapp: {
    Tables: {
      decks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          subtitle: string;
          sections: Json;
          sources: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          subtitle?: string;
          sections?: Json;
          sources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          subtitle?: string;
          sections?: Json;
          sources?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          headings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          headings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          headings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          accent_color: string | null;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          accent_color?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          accent_color?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
