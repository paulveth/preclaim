// Generated Supabase types — will be auto-generated later via `supabase gen types`
// For now, manual type definitions matching our schema

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          org_id: string | null;
          role: 'admin' | 'member';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          org_id?: string | null;
          role?: 'admin' | 'member';
          created_at?: string;
        };
        Update: {
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          org_id?: string | null;
          role?: 'admin' | 'member';
        };
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          slug: string;
          repo_url: string | null;
          default_ttl: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          slug: string;
          repo_url?: string | null;
          default_ttl?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          repo_url?: string | null;
          default_ttl?: number;
        };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          provider: string;
          started_at: string;
          last_heartbeat: string;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id: string;
          user_id: string;
          project_id: string;
          provider?: string;
          started_at?: string;
          last_heartbeat?: string;
          metadata?: Record<string, unknown>;
        };
        Update: {
          last_heartbeat?: string;
          metadata?: Record<string, unknown>;
        };
      };
      locks: {
        Row: {
          id: string;
          project_id: string;
          file_path: string;
          session_id: string;
          user_id: string;
          acquired_at: string;
          expires_at: string;
          message: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_path: string;
          session_id: string;
          user_id: string;
          acquired_at?: string;
          expires_at: string;
          message?: string | null;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          acquired_at?: string;
          expires_at?: string;
          message?: string | null;
        };
      };
      lock_history: {
        Row: {
          id: string;
          project_id: string;
          file_path: string;
          user_id: string;
          session_id: string;
          provider: string;
          action: 'acquire' | 'release' | 'expire' | 'force_release';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_path: string;
          user_id: string;
          session_id: string;
          provider: string;
          action: 'acquire' | 'release' | 'expire' | 'force_release';
          created_at?: string;
        };
        Update: never;
      };
      file_interests: {
        Row: {
          id: string;
          project_id: string;
          file_path: string;
          session_id: string;
          user_id: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          file_path: string;
          session_id: string;
          user_id: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          expires_at?: string;
        };
      };
    };
    Functions: {
      claim_file: {
        Args: {
          p_project_id: string;
          p_file_path: string;
          p_session_id: string;
          p_user_id: string;
          p_ttl_minutes?: number;
        };
        Returns: {
          status: string;
          expires_at?: string;
          holder?: {
            user_id: string;
            session_id: string;
            acquired_at: string;
            expires_at: string;
          };
        };
      };
      cleanup_expired_locks: {
        Args: Record<string, never>;
        Returns: number;
      };
      register_file_interest: {
        Args: {
          p_project_id: string;
          p_file_path: string;
          p_session_id: string;
          p_user_id: string;
          p_ttl_seconds?: number;
        };
        Returns: undefined;
      };
    };
  };
}
