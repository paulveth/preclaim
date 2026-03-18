'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabase } from '../../../lib/supabase-browser';
import { useAuth } from '../providers';
import styles from './locks-table.module.css';

interface Lock {
  id: string;
  project_id: string;
  file_path: string;
  session_id: string;
  user_id: string;
  acquired_at: string;
  expires_at: string;
  message: string | null;
}

interface LocksTableProps {
  compact?: boolean;
  showSearch?: boolean;
  showForceRelease?: boolean;
}

function formatExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'expired';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export function LocksTable({
  compact = false,
  showSearch = false,
  showForceRelease = false,
}: LocksTableProps) {
  const { project, profile, fetchWithAuth } = useAuth();
  const [locks, setLocks] = useState<Lock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserSupabase();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchLocks = useCallback(async () => {
    if (!project) return;

    const { data, error: fetchError } = await supabase
      .from('locks')
      .select('*')
      .eq('project_id', project.id)
      .order('acquired_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    setLocks(data ?? []);
    setError(null);
    setLoading(false);
  }, [project, supabase]);

  useEffect(() => {
    fetchLocks();

    // Polling fallback (5s) — conform CLAUDE.md regels
    intervalRef.current = setInterval(fetchLocks, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLocks]);

  // Realtime subscription
  useEffect(() => {
    if (!project) return;

    const channel = supabase
      .channel(`locks-realtime-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locks',
          filter: `project_id=eq.${project.id}`,
        },
        () => {
          fetchLocks();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [project, supabase, fetchLocks]);

  // Countdown timer — update expiry display every 30s
  useEffect(() => {
    const timer = setInterval(() => setLocks((prev) => [...prev]), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleForceRelease = async (lock: Lock) => {
    const res = await fetchWithAuth('/api/v1/locks/force-release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lock_id: lock.id }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: 'Failed to release lock' }));
      setError(msg ?? 'Failed to release lock');
      return;
    }

    await fetchLocks();
  };

  const filteredLocks = search
    ? locks.filter((l) =>
        l.file_path.toLowerCase().includes(search.toLowerCase()),
      )
    : locks;

  const displayLocks = compact ? filteredLocks.slice(0, 5) : filteredLocks;
  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className={styles.error}>Failed to load locks: {error}</div>;
  }

  if (locks.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>&#x1F512;</span>
        <p>No active locks</p>
        <p className={styles.emptyHint}>
          Locks appear here when AI agents claim files
        </p>
      </div>
    );
  }

  return (
    <div>
      {showSearch && (
        <div className={styles.searchBar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Filter by file path..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th}>File</th>
            <th className={styles.th}>Session</th>
            {!compact && <th className={styles.th}>User</th>}
            <th className={styles.th}>Expires</th>
            {showForceRelease && isAdmin && (
              <th className={styles.th}></th>
            )}
          </tr>
        </thead>
        <tbody>
          {displayLocks.map((lock) => (
            <tr key={lock.id} className={styles.tr}>
              <td className={styles.td}>
                <code className={styles.filePath}>{lock.file_path}</code>
              </td>
              <td className={styles.td}>
                <code className={styles.sessionId}>
                  {lock.session_id.slice(0, 12)}
                </code>
              </td>
              {!compact && (
                <td className={styles.td}>
                  <span className={styles.userId}>
                    {lock.user_id.slice(0, 8)}
                  </span>
                </td>
              )}
              <td className={styles.td}>
                <span className={styles.expires}>
                  {formatExpiry(lock.expires_at)}
                </span>
              </td>
              {showForceRelease && isAdmin && (
                <td className={styles.td}>
                  <button
                    className={styles.releaseButton}
                    onClick={() => handleForceRelease(lock)}
                  >
                    Release
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
