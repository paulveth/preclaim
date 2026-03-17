import styles from './page.module.css';

const stats = [
  { label: 'Active Locks', value: '3', accent: true },
  { label: 'Active Agents', value: '2', accent: false },
  { label: 'Conflicts Blocked', value: '12', accent: true, sub: 'today' },
  { label: 'Files Coordinated', value: '47', accent: false, sub: 'today' },
];

const locks = [
  {
    file: 'src/api/auth.ts',
    session: 'claude_a8f3',
    user: 'paul@preclaim.dev',
    expires: '25m',
  },
  {
    file: 'src/lib/database.ts',
    session: 'claude_a8f3',
    user: 'paul@preclaim.dev',
    expires: '27m',
  },
  {
    file: 'src/hooks/useUser.ts',
    session: 'claude_b2d1',
    user: 'team@preclaim.dev',
    expires: '18m',
  },
  {
    file: 'packages/core/src/client.ts',
    session: 'claude_c9e7',
    user: 'dev@preclaim.dev',
    expires: '29m',
  },
];

const activity = [
  {
    type: 'conflict',
    icon: '\u2717',
    label: 'Conflict blocked',
    file: 'src/api/auth.ts',
    time: '2m ago',
  },
  {
    type: 'acquired',
    icon: '\u2713',
    label: 'Lock acquired',
    file: 'packages/core/src/client.ts',
    time: '3m ago',
  },
  {
    type: 'released',
    icon: '\u21A9',
    label: 'Lock released',
    file: 'src/components/Header.tsx',
    time: '8m ago',
  },
  {
    type: 'expired',
    icon: '\u23F1',
    label: 'Lock expired',
    file: 'src/utils/format.ts',
    time: '15m ago',
  },
  {
    type: 'acquired',
    icon: '\u2713',
    label: 'Lock acquired',
    file: 'src/api/auth.ts',
    time: '20m ago',
  },
  {
    type: 'session',
    icon: '\u2192',
    label: 'Session started',
    file: null,
    time: '25m ago',
  },
];

export default function DashboardOverview() {
  return (
    <div>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          <p className={styles.subtitle}>Real-time coordination status</p>
        </div>
        <div className={styles.projectBadge}>
          <span className={styles.projectDot} />
          acme-app
        </div>
      </header>

      {/* Stats */}
      <div className={styles.stats}>
        {stats.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <p className={styles.statLabel}>
              {stat.label}
              {stat.sub && <span className={styles.statSub}> &middot; {stat.sub}</span>}
            </p>
            <p
              className={`${styles.statValue} ${stat.accent ? styles.statAccent : ''}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Active Locks */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Active Locks</h2>
          <span className={styles.panelCount}>{locks.length}</span>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>File</th>
              <th className={styles.th}>Session</th>
              <th className={styles.th}>User</th>
              <th className={styles.th}>Expires</th>
            </tr>
          </thead>
          <tbody>
            {locks.map((lock) => (
              <tr key={lock.file} className={styles.tr}>
                <td className={styles.td}>
                  <code className={styles.filePath}>{lock.file}</code>
                </td>
                <td className={styles.td}>
                  <code className={styles.sessionId}>{lock.session}</code>
                </td>
                <td className={styles.td}>
                  <span className={styles.user}>{lock.user}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.expires}>{lock.expires}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Recent Activity */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Recent Activity</h2>
        </div>
        <div>
          {activity.map((item, i) => (
            <div key={i} className={styles.activityItem}>
              <span
                className={`${styles.activityIcon} ${styles[`activity_${item.type}` as keyof typeof styles] ?? ''}`}
              >
                {item.icon}
              </span>
              <div className={styles.activityContent}>
                <span className={styles.activityLabel}>{item.label}</span>
                {item.file && (
                  <code className={styles.activityFile}>{item.file}</code>
                )}
              </div>
              <span className={styles.activityTime}>{item.time}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
