import { createClient } from '@supabase/supabase-js';

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          project_id: string;
          name: string;
          description: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          project_id?: string;
          name: string;
          description?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          project_id?: string;
          name?: string;
          description?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      threads: {
        Row: {
          thread_id: string;
          user_id: string | null;
          project_id?: string | null;
          messages: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          thread_id?: string;
          user_id?: string | null;
          project_id?: string | null;
          messages?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          thread_id?: string;
          user_id?: string | null;
          project_id?: string | null;
          messages?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      agent_runs: {
        Row: {
          id: string;
          thread_id: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          responses: string;
          error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          responses?: string;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          responses?: string;
          error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility function to get a fresh token
export const getAuthToken = async (): Promise<string | null> => {
  try {
    // Check if we need to refresh the token
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    // If session exists but token is about to expire, refresh it
    if (data.session) {
      const expiresAt = data.session.expires_at;
      const currentTime = Math.floor(Date.now() / 1000);
      
      // If token expires in less than 5 minutes, refresh it
      if (expiresAt && expiresAt - currentTime < 300) {
        console.log('Token about to expire, refreshing...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return data.session.access_token;
        }
        
        return refreshData.session?.access_token || null;
      }
      
      return data.session.access_token;
    }
    
    return null;
  } catch (error) {
    console.error('Unexpected error getting auth token:', error);
    return null;
  }
};

export const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/';
  // Make sure to include `https://` when not localhost.
  url = url.includes('http') ? url : `https://${url}`;
  // Make sure to including trailing `/`.
  url = url.charAt(url.length - 1) === '/' ? url : `${url}/`;
  return url;
}; 