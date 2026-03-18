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
  projects: Project[];
  organization: Organization | null;
  loading: boolean;
  signOut: () => Promise<void>;
  switchProject: (projectId: string) => void;
  refreshProject: () => Promise<void>;
  fetchWithAuth: (url: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  project: null,
  projects: [],
  organization: null,
  loading: true,
  signOut: async () => {},
  switchProject: () => {},
  refreshProject: async () => {},
  fetchWithAuth: () => Promise.resolve(new Response()),
});

export function useAuth() {
  return useContext(AuthContext);
}

const PROJECT_STORAGE_KEY = 'preclaim_selected_project';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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

      if (!profileData.org_id) {
        router.push('/onboard');
        return;
      }

      const [orgResult, projectsResult] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .eq('id', profileData.org_id)
          .single(),
        supabase
          .from('projects')
          .select('*')
          .eq('org_id', profileData.org_id)
          .order('created_at', { ascending: true }),
      ]);

      if (orgResult.error) {
        console.error('Failed to fetch org:', orgResult.error.message);
      } else if (orgResult.data) {
        setOrganization(orgResult.data);
      }

      if (projectsResult.error) {
        console.error('Failed to fetch projects:', projectsResult.error.message);
      } else if (projectsResult.data && projectsResult.data.length > 0) {
        const allProjects = projectsResult.data as Project[];
        setProjects(allProjects);

        // Restore saved selection or default to first
        const savedId =
          typeof window !== 'undefined'
            ? localStorage.getItem(PROJECT_STORAGE_KEY)
            : null;
        const saved = savedId
          ? allProjects.find((p) => p.id === savedId)
          : null;
        setProject(saved ?? allProjects[0]);
      }
    },
    [supabase, router],
  );

  const switchProject = useCallback(
    (projectId: string) => {
      const found = projects.find((p) => p.id === projectId);
      if (found) {
        setProject(found);
        localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
      }
    },
    [projects],
  );

  const refreshProject = useCallback(async () => {
    if (!project || !profile?.org_id) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const allProjects = data as Project[];
      setProjects(allProjects);
      const updated = allProjects.find((p) => p.id === project.id);
      if (updated) setProject(updated);
    }
  }, [project, profile, supabase]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await fetchUserData(session.user.id);
      } else {
        router.push('/login');
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
        setProjects([]);
        setOrganization(null);
        setLoading(false);
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchUserData, router]);

  const signOut = useCallback(async () => {
    localStorage.removeItem(PROJECT_STORAGE_KEY);
    await supabase.auth.signOut();
  }, [supabase]);

  const fetchWithAuth = useCallback(
    async (url: string, init?: RequestInit) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
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
      value={{
        user,
        profile,
        project,
        projects,
        organization,
        loading,
        signOut,
        switchProject,
        refreshProject,
        fetchWithAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
