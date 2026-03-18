'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../providers';
import styles from './sidebar.module.css';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/locks', label: 'Active Locks' },
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, organization, loading, signOut } = useAuth();

  const displayName = profile?.name ?? profile?.email ?? '...';
  const initials = displayName.charAt(0).toUpperCase();
  const orgName = organization?.slug ?? '...';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

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
        {loading ? (
          <div className={styles.userSkeleton} />
        ) : (
          <>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userOrg}>{orgName}</div>
            </div>
            <button
              className={styles.signOutButton}
              onClick={handleSignOut}
              title="Sign out"
            >
              &#x2192;
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
