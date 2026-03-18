'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../../lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  org_id: string | null;
  role: 'admin' | 'member';
}

interface Project {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  repo_url: string | null;
  default_ttl: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  project: Project | null;
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  project: null,
  organization: null,
  loading: true,
  signOut: async () => {},
  fetchWithAuth: () => Promise.resolve(new Response()),
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserSupabase();

  const fetchUserData = useCallback(
    async (userId: string) => {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        console.error('Failed to fetch profile:', profileError?.message);
        return;
      }

      setProfile(profileData);

      if (profileData.org_id) {
        const [orgResult, projectResult] = await Promise.all([
          supabase
            .from('organizations')
            .select('*')
            .eq('id', profileData.org_id)
            .single(),
          supabase
            .from('projects')
            .select('*')
            .eq('org_id', profileData.org_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single(),
        ]);

        if (orgResult.error) {
          console.error('Failed to fetch org:', orgResult.error.message);
        } else if (orgResult.data) {
          setOrganization(orgResult.data);
        }

        if (projectResult.error) {
          console.error('Failed to fetch project:', projectResult.error.message);
        } else if (projectResult.data) {
          setProject(projectResult.data);
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setProject(null);
        setOrganization(null);
        setLoading(false);
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData, router]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const fetchWithAuth = useCallback(
    async (url: string, init?: RequestInit) => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    [supabase],
  );

  return (
    <AuthContext.Provider
      value={{ user, profile, project, organization, loading, signOut, fetchWithAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
