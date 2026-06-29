// Tipos gerados manualmente para o schema do Story OS.
// Em produção, usar: supabase gen types typescript --project-id <id>

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_color: string
          plan: 'free' | 'pro' | 'team'
          daily_word_goal: number
          editor_font: string
          theme: 'light' | 'dark'
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          title: string
          subtitle: string | null
          description: string | null
          category: 'Livros' | 'Acadêmico' | 'Outros'
          project_type: 'book' | 'academic' | 'other'
          cover_emoji: string
          cover_gradient: string
          cover_image_url: string | null
          genre: string | null
          subgenres: string[] | null
          language: string
          status: 'active' | 'archived' | 'completed'
          target_word_count: number | null
          total_chapters_planned: number | null
          sort_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['projects']['Row']>
        Relationships: []
      }
      acts: {
        Row: {
          id: string
          project_id: string
          title: string
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['acts']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['acts']['Row']>
        Relationships: []
      }
      chapters: {
        Row: {
          id: string
          project_id: string
          act_id: string | null
          chapter_number: number
          title: string
          content: string
          word_count: number
          status: 'draft' | 'review' | 'done' | 'outline'
          pov_character_id: string | null
          location_id: string | null
          synopsis: string | null
          notes: string | null
          sort_order: number
          created_at: string
          updated_at: string
          last_edited_at: string
        }
        Insert: Omit<Database['public']['Tables']['chapters']['Row'], 'id' | 'created_at' | 'updated_at' | 'last_edited_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['chapters']['Row']>
        Relationships: []
      }
      characters: {
        Row: {
          id: string
          project_id: string
          name: string
          short_name: string | null
          initials: string | null
          role: string | null
          role_type: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'pov' | null
          is_pov: boolean
          status: 'alive' | 'dead' | 'unknown' | 'missing'
          age: number | null
          nationality: string | null
          occupation: string | null
          languages: string[] | null
          description: string | null
          physical_desc: string | null
          personality: string | null
          goals: string | null
          fears: string | null
          virtues: string | null
          flaws: string | null
          arc_notes: string | null
          notes: string | null
          avatar_color: string
          sort_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['characters']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['characters']['Row']>
        Relationships: []
      }
      character_arc_stages: {
        Row: {
          id: string
          character_id: string
          act_id: string | null
          stage_label: string
          description: string | null
          status: 'planned' | 'in_progress' | 'written'
          accent_color: string | null
          sort_order: number
        }
        Insert: Omit<Database['public']['Tables']['character_arc_stages']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['character_arc_stages']['Row']>
        Relationships: []
      }
      character_arc_points: {
        Row: {
          id: string
          character_id: string
          chapter_id: string | null
          chapter_number: number | null
          emotional_value: number
          label: string | null
          sort_order: number
        }
        Insert: Omit<Database['public']['Tables']['character_arc_points']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['character_arc_points']['Row']>
        Relationships: []
      }
      character_relationships: {
        Row: {
          id: string
          project_id: string
          character_a_id: string
          character_b_id: string
          relationship_type: string
          relationship_label: string | null
          description: string | null
          strength: 'weak' | 'medium' | 'strong' | null
          sentiment: 'positive' | 'negative' | 'neutral' | 'complex' | null
          style_color: string | null
          style_dashed: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['character_relationships']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['character_relationships']['Row']>
        Relationships: []
      }
      chapter_characters: {
        Row: { chapter_id: string; character_id: string; is_pov: boolean }
        Insert: Database['public']['Tables']['chapter_characters']['Row']
        Update: Partial<Database['public']['Tables']['chapter_characters']['Row']>
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          thumb_emoji: string
          thumb_gradient: string
          notes: string | null
          sort_order: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['locations']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['locations']['Row']>
        Relationships: []
      }
      location_characters: {
        Row: { location_id: string; character_id: string }
        Insert: Database['public']['Tables']['location_characters']['Row']
        Update: Partial<Database['public']['Tables']['location_characters']['Row']>
        Relationships: []
      }
      timeline_events: {
        Row: {
          id: string
          project_id: string
          chapter_id: string | null
          title: string
          description: string | null
          in_world_date: string | null
          sort_order: number
          is_future: boolean
          is_highlight: boolean
          accent_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['timeline_events']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['timeline_events']['Row']>
        Relationships: []
      }
      timeline_event_characters: {
        Row: { event_id: string; character_id: string }
        Insert: Database['public']['Tables']['timeline_event_characters']['Row']
        Update: Partial<Database['public']['Tables']['timeline_event_characters']['Row']>
        Relationships: []
      }
      ideas: {
        Row: {
          id: string
          project_id: string
          content: string
          category: string | null
          emoji: string
          is_archived: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ideas']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['ideas']['Row']>
        Relationships: []
      }
      research: {
        Row: {
          id: string
          project_id: string
          title: string
          source_type: 'pdf' | 'link' | 'video' | 'image' | 'note' | 'book'
          url: string | null
          source_label: string | null
          emoji: string
          notes: string | null
          is_archived: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['research']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['research']['Row']>
        Relationships: []
      }
      universe_categories: {
        Row: {
          id: string
          project_id: string
          name: string
          emoji: string
          description: string | null
          sort_order: number
        }
        Insert: Omit<Database['public']['Tables']['universe_categories']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['universe_categories']['Row']>
        Relationships: []
      }
      universe_entries: {
        Row: {
          id: string
          project_id: string
          category_id: string | null
          title: string
          content: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['universe_entries']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['universe_entries']['Row']>
        Relationships: []
      }
      glossary: {
        Row: {
          id: string
          project_id: string
          term: string
          definition: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['glossary']['Row'], 'id' | 'created_at' | 'updated_at'>
          & { id?: string }
        Update: Partial<Database['public']['Tables']['glossary']['Row']>
        Relationships: []
      }
      tags: {
        Row: { id: string; project_id: string; name: string; color: string }
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id'> & { id?: string }
        Update: Partial<Database['public']['Tables']['tags']['Row']>
        Relationships: []
      }
      tag_assignments: {
        Row: {
          tag_id: string
          entity_type: 'chapter' | 'character' | 'location' | 'idea' | 'research' | 'universe_entry'
          entity_id: string
        }
        Insert: Database['public']['Tables']['tag_assignments']['Row']
        Update: Partial<Database['public']['Tables']['tag_assignments']['Row']>
        Relationships: []
      }
      writing_sessions: {
        Row: {
          id: string
          project_id: string
          user_id: string
          chapter_id: string | null
          words_written: number
          session_date: string
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['writing_sessions']['Row'], 'id' | 'created_at'> & { id?: string }
        Update: Partial<Database['public']['Tables']['writing_sessions']['Row']>
        Relationships: []
      }
      user_project_settings: {
        Row: {
          user_id: string
          project_id: string
          last_viewed_chapter_id: string | null
          last_active_view: string | null
        }
        Insert: Database['public']['Tables']['user_project_settings']['Row']
        Update: Partial<Database['public']['Tables']['user_project_settings']['Row']>
        Relationships: []
      }
    }
    Views: {
      project_stats: {
        Row: {
          project_id: string
          owner_id: string
          title: string
          total_chapters_planned: number | null
          target_word_count: number | null
          total_chapters: number
          total_words: number
          done_chapters: number
          draft_chapters: number
          review_chapters: number
          total_characters: number
          pov_characters: number
          total_locations: number
          total_ideas: number
          completion_pct: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      seed_demo_project: { Args: { p_user_id: string }; Returns: string }
      get_writing_streak: {
        Args: { p_user_id: string; p_project_id?: string }
        Returns: number
      }
      user_owns_project: { Args: { p_id: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience type aliases
export type Profile   = Database['public']['Tables']['profiles']['Row']
export type Project   = Database['public']['Tables']['projects']['Row']
export type Act       = Database['public']['Tables']['acts']['Row']
export type Chapter   = Database['public']['Tables']['chapters']['Row']
export type Character = Database['public']['Tables']['characters']['Row']
export type CharacterArcStage = Database['public']['Tables']['character_arc_stages']['Row']
export type CharacterRelationship = Database['public']['Tables']['character_relationships']['Row']
export type Location  = Database['public']['Tables']['locations']['Row']
export type TimelineEvent = Database['public']['Tables']['timeline_events']['Row']
export type Idea      = Database['public']['Tables']['ideas']['Row']
export type Research  = Database['public']['Tables']['research']['Row']
export type UniverseCategory = Database['public']['Tables']['universe_categories']['Row']
export type UniverseEntry = Database['public']['Tables']['universe_entries']['Row']
export type GlossaryEntry = Database['public']['Tables']['glossary']['Row']
export type WritingSession = Database['public']['Tables']['writing_sessions']['Row']
export type ProjectStats = Database['public']['Views']['project_stats']['Row']
