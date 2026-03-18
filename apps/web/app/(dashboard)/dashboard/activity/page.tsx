'use client';

import { useState } from 'react';
import { useAuth } from '../../providers';
import { ActivityFeed } from '../../components/activity-feed';
import styles from './page.module.css';

const filters = [
  { value: '', label: 'All' },
  { value: 'acquire', label: 'Acquired' },
  { value: 'release', label: 'Released' },
  { value: 'expire', label: 'Expired' },
  { value: 'force_release', label: 'Force Released' },
];

export default function ActivityPage() {
  const { project } = useAuth();
  const [activeFilter, setActiveFilter] = useState('');

  return (
    <div>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Activity</h1>
          <p className={styles.subtitle}>Lock history timeline</p>
        </div>
        {project && (
          <div className={styles.projectBadge}>
            <span className={styles.projectDot} />
            {project.slug}
          </div>
        )}
      </header>

      <div className={styles.filters}>
        {filters.map((f) => (
          <button
            key={f.value}
            className={`${styles.filterButton} ${activeFilter === f.value ? styles.filterActive : ''}`}
            onClick={() => setActiveFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className={styles.panel}>
        <ActivityFeed
          filter={activeFilter || undefined}
          pageSize={30}
        />
      </section>
    </div>
  );
}
