export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          phone: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          phone?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          phone?: string | null
          bio?: string | null
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          slug: string
          description: string
          body: string | null
          location: string
          address: string | null
          start_date: string
          end_date: string | null
          is_free: boolean
          ticket_price: number | null
          ticket_url: string | null
          category: string
          tags: string[]
          flyer_url: string | null
          organizer_name: string
          organizer_email: string | null
          organizer_phone: string | null
          status: string
          is_featured: boolean
          submitted_by: string | null
          approved_by: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['events']['Row']> & {
          title: string
          slug: string
          description: string
          location: string
          start_date: string
          category: string
          organizer_name: string
        }
        Update: Partial<Database['public']['Tables']['events']['Row']>
      }
      announcements: {
        Row: {
          id: string
          title: string
          slug: string
          summary: string
          body: string
          category: string
          tags: string[]
          image_url: string | null
          author_name: string
          author_id: string | null
          status: string
          is_featured: boolean
          is_pinned: boolean
          submitted_by: string | null
          approved_by: string | null
          published_at: string | null
          include_in_calendar: boolean
          linked_event_id: string | null
          calendar_start_date: string | null
          calendar_end_date: string | null
          calendar_start_time: string | null
          calendar_end_time: string | null
          calendar_location: string | null
          calendar_address: string | null
          calendar_flyer_url: string | null
          calendar_registration_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['announcements']['Row']> & {
          title: string
          slug: string
          summary: string
          body: string
          category: string
          author_name: string
        }
        Update: Partial<Database['public']['Tables']['announcements']['Row']>
      }
      businesses: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          long_description: string | null
          category: string
          subcategory: string | null
          tags: string[]
          logo_url: string | null
          cover_url: string | null
          website: string | null
          phone: string | null
          email: string | null
          address: string | null
          city: string
          state: string
          zip: string | null
          hours: Json | null
          social_links: Json | null
          tier: string
          status: string
          is_featured: boolean
          owner_name: string
          owner_email: string
          submitted_by: string | null
          approved_by: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['businesses']['Row']> & {
          name: string
          slug: string
          description: string
          category: string
          city: string
          state: string
          owner_name: string
          owner_email: string
        }
        Update: Partial<Database['public']['Tables']['businesses']['Row']>
      }
      fundraisers: {
        Row: {
          id: string
          title: string
          slug: string
          summary: string
          body: string
          category: string
          tags: string[]
          image_url: string | null
          goal_amount: number | null
          raised_amount: number
          currency: string
          beneficiary_name: string
          beneficiary_relationship: string | null
          payment_info: string | null
          organizer_name: string
          organizer_email: string
          organizer_phone: string | null
          verification_status: string
          verification_notes: string | null
          status: string
          is_featured: boolean
          deadline: string | null
          submitted_by: string | null
          approved_by: string | null
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['fundraisers']['Row']> & {
          title: string
          slug: string
          summary: string
          body: string
          category: string
          beneficiary_name: string
          organizer_name: string
          organizer_email: string
        }
        Update: Partial<Database['public']['Tables']['fundraisers']['Row']>
      }
      sports_posts: {
        Row: {
          id: string
          title: string
          slug: string
          summary: string
          body: string
          category: string
          tags: string[]
          image_url: string | null
          sport: string | null
          team_name: string | null
          age_group: string | null
          author_name: string
          author_id: string | null
          status: string
          is_featured: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['sports_posts']['Row']> & {
          title: string
          slug: string
          summary: string
          body: string
          category: string
          author_name: string
        }
        Update: Partial<Database['public']['Tables']['sports_posts']['Row']>
      }
      gallery_albums: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          cover_url: string | null
          created_at: string
          community_id: string | null
        }
        Insert: Partial<Database['public']['Tables']['gallery_albums']['Row']> & {
          name: string
          slug: string
        }
        Update: Partial<Database['public']['Tables']['gallery_albums']['Row']>
      }
      gallery_images: {
        Row: {
          id: string
          album_id: string | null
          image_url: string
          caption: string | null
          taken_at: string | null
          status: string
          created_at: string
          community_id: string | null
        }
        Insert: Partial<Database['public']['Tables']['gallery_images']['Row']> & {
          image_url: string
        }
        Update: Partial<Database['public']['Tables']['gallery_images']['Row']>
      }
      chat_threads: {
        Row: {
          id: string
          user_id: string
          title: string
          category: string
          status: string
          priority: string
          assigned_admin_id: string | null
          closed_at: string | null
          closed_by: string | null
          close_reason: string | null
          last_message_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title: string
          category?: string
          status?: string
          priority?: string
          assigned_admin_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['chat_threads']['Row']>
      }
      chat_messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          sender_role: string
          body: string
          is_internal_note: boolean
          created_at: string
        }
        Insert: {
          thread_id: string
          sender_id: string
          sender_role?: string
          body: string
          is_internal_note?: boolean
        }
        Update: Partial<Database['public']['Tables']['chat_messages']['Row']>
      }
      event_comments: {
        Row: {
          id: string
          event_id: string
          user_id: string
          body: string
          status: string
          parent_comment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          event_id: string
          user_id: string
          body: string
          status?: string
          parent_comment_id?: string | null
        }
        Update: Partial<Database['public']['Tables']['event_comments']['Row']>
      }
      contact_submissions: {
        Row: {
          id: string
          name: string
          email: string
          phone: string | null
          subject: string
          message: string
          category: string
          status: string
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          name: string
          email: string
          phone?: string | null
          subject: string
          message: string
          category: string
          status?: string
        }
        Update: Partial<Database['public']['Tables']['contact_submissions']['Row']>
      }
      public_submissions: {
        Row: {
          id: string
          type: string
          title: string
          submitter_name: string
          submitter_email: string
          submitter_phone: string | null
          data: Json
          status: string
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          type: string
          title: string
          submitter_name: string
          submitter_email: string
          submitter_phone?: string | null
          data: Json
          status?: string
        }
        Update: Partial<Database['public']['Tables']['public_submissions']['Row']>
      }
      site_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          label: string
          description: string | null
          type: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          key: string
          value?: string | null
          label: string
          description?: string | null
          type?: string
        }
        Update: Partial<Database['public']['Tables']['site_settings']['Row']>
      }
      admin_activity_log: {
        Row: {
          id: string
          admin_id: string
          action: string
          resource_type: string
          resource_id: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          admin_id: string
          action: string
          resource_type: string
          resource_id?: string | null
          details?: Json | null
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      has_role: {
        Args: { check_role: string }
        Returns: boolean
      }
      create_chat_request: {
        Args: { p_title: string; p_category: string; p_body: string }
        Returns: string
      }
      close_chat_request: {
        Args: { p_thread_id: string; p_close_reason?: string | null }
        Returns: null
      }
    }
    Enums: {
      user_role: 'super_admin' | 'community_admin' | 'business_admin' | 'support_admin' | 'moderator' | 'viewer'
      content_status: 'draft' | 'pending_review' | 'approved' | 'published' | 'unpublished' | 'archived' | 'rejected'
      business_tier: 'free' | 'verified' | 'featured' | 'sponsor'
      fundraiser_verification_status: 'unverified' | 'under_review' | 'verified' | 'flagged'
    }
  }
}
