'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '../../lib/supabase-browser';
import styles from './page.module.css';

export default function OnboardPage() {
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserSupabase();

  // Check auth state — redirect if not logged in or already onboarded
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUserName(
        session.user.user_metadata?.full_name ??
        session.user.email ??
        null,
      );

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', session.user.id)
        .single();

      if (profile?.org_id) {
        router.push('/dashboard');
        return;
      }

      setChecking(false);
    };

    check();
  }, [supabase, router]);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    setProjectName(name);
    setProjectSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectSlug.trim()) return;

    setLoading(true);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Session expired. Please log in again.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/v1/onboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        project_name: projectName.trim(),
        project_slug: projectSlug.trim(),
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Something went wrong' }));
      setError(msg ?? 'Something went wrong');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  if (checking) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logo}>
            preclaim<span className={styles.logoDot}>_</span>
          </div>
          <p className={styles.subtitle}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          preclaim<span className={styles.logoDot}>_</span>
        </div>
        <h1 className={styles.title}>Welcome{userName ? `, ${userName}` : ''}!</h1>
        <p className={styles.subtitle}>
          Create your first project to start coordinating AI agents.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="projectName">
              Project name
            </label>
            <input
              id="projectName"
              type="text"
              className={styles.input}
              placeholder="My App"
              value={projectName}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="projectSlug">
              Slug
            </label>
            <input
              id="projectSlug"
              type="text"
              className={styles.input}
              placeholder="my-app"
              value={projectSlug}
              onChange={(e) => setProjectSlug(e.target.value)}
              required
              maxLength={100}
              pattern="[a-z0-9\-]+"
              title="Lowercase letters, numbers, and hyphens only"
            />
            <p className={styles.hint}>Used in CLI config and URLs</p>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading || !projectName.trim() || !projectSlug.trim()}
          >
            {loading ? 'Creating...' : 'Create project'}
          </button>
        </form>
      </div>
    </div>
  );
}
