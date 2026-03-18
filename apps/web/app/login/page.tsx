'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabase } from '../../lib/supabase-browser';
import styles from './page.module.css';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserSupabase();

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (errorParam) {
      setError(errorDescription ?? 'Login failed. Please try again.');
      return;
    }

    const code = searchParams.get('code');
    if (code) {
      setLoading(true);
      supabase.auth.exchangeCodeForSession(code).then(({ error: authError }) => {
        if (authError) {
          setError(authError.message);
          setLoading(false);
        } else {
          router.push('/dashboard');
        }
      });
      return;
    }

    // Already logged in? Redirect to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard');
    });
  }, [searchParams, supabase, router]);

  const handleGitHubLogin = async () => {
    setLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/login`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
  };

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}

      <button
        className={styles.githubButton}
        onClick={handleGitHubLogin}
        disabled={loading}
      >
        <svg
          className={styles.githubIcon}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        {loading ? 'Redirecting...' : 'Continue with GitHub'}
      </button>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          preclaim<span className={styles.logoDot}>_</span>
        </div>
        <p className={styles.subtitle}>Sign in to your dashboard</p>

        <Suspense fallback={
          <button className={styles.githubButton} disabled>
            Loading...
          </button>
        }>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
