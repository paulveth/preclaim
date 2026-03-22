'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createBrowserSupabase } from '../../../lib/supabase-browser';
import { useAuth } from '../providers';
import styles from './activity-feed.module.css';

interface ActivityEntry {
  id: string;
  file_path: string;
  action: 'acquire' | 'release' | 'expire' | 'force_release';
  created_at: string;
  session_id: string;
  profiles: { name: string | null; email: string } | null;
}

interface ActivityFeedProps {
  compact?: boolean;
  filter?: string;
  pageSize?: number;
}

const actionConfig: Record<
  string,
  { icon: string; label: string; className: string }
> = {
  acquire: { icon: '\u2713', label: 'Lock acquired', className: 'acquired' },
  release: { icon: '\u21A9', label: 'Lock released', className: 'released' },
  expire: { icon: '\u23F1', label: 'Lock expired', className: 'expired' },
  force_release: {
    icon: '\u2717',
    label: 'Force released',
    className: 'forceRelease',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({
  compact = false,
  filter,
  pageSize = 20,
}: ActivityFeedProps) {
  const { project, fetchWithAuth } = useAuth();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const supabase = createBrowserSupabase();

  const fetchActivity = useCallback(
    async (offset = 0, append = false) => {
      if (!project) return;

      try {
        const params = new URLSearchParams({
          project_id: project.id,
          limit: String(pageSize),
          offset: String(offset),
        });
        if (filter) params.set('action', filter);

        const res = await fetchWithAuth(`/api/v1/activity?${params}`);
        if (!res.ok) {
          setError('Failed to load activity');
          return;
        }

        const { data } = await res.json();
        if (append) {
          setEntries((prev) => [...prev, ...(data ?? [])]);
        } else {
          setEntries(data ?? []);
        }
        setHasMore((data ?? []).length === pageSize);
        setError(null);
      } catch {
        setError('Failed to load activity');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [project, filter, pageSize, fetchWithAuth],
  );

  useEffect(() => {
    setLoading(true);
    fetchActivity();

    // Polling fallback (10s) naast realtime
    intervalRef.current = setInterval(() => fetchActivity(), 10000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivity]);

  // Realtime subscription op lock_history
  useEffect(() => {
    if (!project) return;

    const channel = supabase
      .channel(`activity-realtime-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lock_history',
          filter: `project_id=eq.${project.id}`,
        },
        () => {
          fetchActivity();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [project, supabase, fetchActivity]);

  const loadMore = () => {
    setLoadingMore(true);
    fetchActivity(entries.length, true);
  };

  const displayEntries = compact ? entries.slice(0, 6) : entries;

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.skeletonRow} />
        ))}
      </div>
    );
  }

  if (error && entries.length === 0) {
    return <div className={styles.error}>{error}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No activity yet</p>
        <p className={styles.emptyHint}>
          Activity appears here when locks are acquired or released
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && entries.length > 0 && (
        <div className={styles.staleWarning}>
          Connection issue — showing cached data
        </div>
      )}
      {displayEntries.map((entry) => {
        const config = actionConfig[entry.action] ?? actionConfig.acquire;
        return (
          <div key={entry.id} className={styles.activityItem}>
            <span
              className={`${styles.activityIcon} ${styles[config.className] ?? ''}`}
            >
              {config.icon}
            </span>
            <div className={styles.activityContent}>
              <span className={styles.activityLabel}>{config.label}</span>
              <code className={styles.activityFile}>{entry.file_path}</code>
            </div>
            <span className={styles.activityTime}>
              {timeAgo(entry.created_at)}
            </span>
          </div>
        );
      })}
      {!compact && hasMore && (
        <button
          className={styles.loadMore}
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
