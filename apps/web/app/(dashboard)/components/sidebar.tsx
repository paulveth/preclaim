'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './sidebar.module.css';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/locks', label: 'Active Locks' },
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Link href="/">
          preclaim<span className={styles.logoDot}>_</span>
        </Link>
      </div>
      <nav className={styles.nav}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.userSection}>
        <div className={styles.userAvatar}>P</div>
        <div>
          <div className={styles.userName}>Paul Veth</div>
          <div className={styles.userOrg}>acme-app</div>
        </div>
      </div>
    </aside>
  );
}
