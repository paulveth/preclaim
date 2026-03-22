'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
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
  const { profile, project, projects, organization, loading, signOut, switchProject } = useAuth();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.name ?? profile?.email ?? '...';
  const initials = displayName.charAt(0).toUpperCase();
  const orgName = organization?.slug ?? '...';

  // Close switcher on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    };
    if (switcherOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [switcherOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleSwitchProject = (projectId: string) => {
    switchProject(projectId);
    setSwitcherOpen(false);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Link href="/">
          <img src="/logo-mark.svg" alt="" className={styles.logoMark} />
          preclaim<span className={styles.logoDot}>_</span>
        </Link>
      </div>

      {/* Project Switcher */}
      {!loading && projects.length > 0 && (
        <div className={styles.switcher} ref={switcherRef}>
          <button
            className={styles.switcherButton}
            onClick={() => setSwitcherOpen(!switcherOpen)}
          >
            <span className={styles.switcherDot} />
            <span className={styles.switcherName}>{project?.name ?? '...'}</span>
            <span className={styles.switcherArrow}>{switcherOpen ? '\u25B4' : '\u25BE'}</span>
          </button>
          {switcherOpen && (
            <div className={styles.switcherDropdown}>
              {projects.map((p) => (
                <button
                  key={p.id}
                  className={`${styles.switcherItem} ${p.id === project?.id ? styles.switcherItemActive : ''}`}
                  onClick={() => handleSwitchProject(p.id)}
                >
                  <span className={styles.switcherItemDot} />
                  <span>{p.name}</span>
                  <code className={styles.switcherItemSlug}>{p.slug}</code>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
