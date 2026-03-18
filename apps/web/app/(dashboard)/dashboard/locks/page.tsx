'use client';

import { useAuth } from '../../providers';
import { LocksTable } from '../../components/locks-table';
import styles from './page.module.css';

export default function LocksPage() {
  const { project } = useAuth();

  return (
    <div>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Active Locks</h1>
          <p className={styles.subtitle}>All currently held file locks</p>
        </div>
        {project && (
          <div className={styles.projectBadge}>
            <span className={styles.projectDot} />
            {project.slug}
          </div>
        )}
      </header>

      <section className={styles.panel}>
        <LocksTable showSearch showForceRelease />
      </section>
    </div>
  );
}
