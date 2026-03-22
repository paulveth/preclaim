'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../providers';
import { LocksTable } from '../components/locks-table';
import { ActivityFeed } from '../components/activity-feed';
import styles from './page.module.css';

interface Stats {
  active_locks: number;
  active_sessions: number;
  activity_today: number;
  files_today: number;
}

export default function DashboardOverview() {
  const { project, loading: authLoading, fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchStats = useCallback(async () => {
    if (!project) return;

    try {
      const res = await fetchWithAuth(`/api/v1/stats?project_id=${project.id}`);
      if (!res.ok) {
        setStatsError(true);
        setStatsLoading(false);
        return;
      }

      const { data } = await res.json();
      setStats(data);
      setStatsError(false);
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, [project, fetchWithAuth]);

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStats]);

  const statCards = [
    {
      label: 'Active Locks',
      value: stats?.active_locks ?? 0,
      accent: true,
    },
    {
      label: 'Active Agents',
      value: stats?.active_sessions ?? 0,
      accent: false,
    },
    {
      label: 'Activity',
      value: stats?.activity_today ?? 0,
      accent: true,
      sub: 'today',
    },
    {
      label: 'Files Coordinated',
      value: stats?.files_today ?? 0,
      accent: false,
      sub: 'today',
    },
  ];

  return (
    <div>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Real-time coordination status</p>
        </div>
        {project && (
          <div className={styles.projectBadge}>
            <span className={styles.projectDot} />
            {project.slug}
          </div>
        )}
      </header>

      {/* Stats */}
      <div className={styles.stats}>
        {statCards.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>
              {stat.label}
              {stat.sub && (
                <span className={styles.statSub}> &middot; {stat.sub}</span>
              )}
            </p>
            {statsLoading || authLoading ? (
              <div className={styles.statSkeleton} />
            ) : statsError ? (
              <p className={styles.statValue}>—</p>
            ) : (
              <p
                className={`${styles.statValue} ${stat.accent ? styles.statAccent : ''}`}
              >
                {stat.value}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Active Locks */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Active Locks</h2>
        </div>
        <LocksTable compact />
      </section>

      {/* Recent Activity */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Recent Activity</h2>
        </div>
        <ActivityFeed compact />
      </section>
    </div>
  );
}
