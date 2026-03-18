'use client';

import { useState } from 'react';
import { useAuth } from '../../providers';
import styles from './page.module.css';

export default function SettingsPage() {
  const { project, organization, profile } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback: select text for manual copy
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  return (
    <div>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Project configuration</p>
      </header>

      {/* Project Info */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Project</h2>
        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <div className={styles.value}>{project?.name ?? '—'}</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Slug</label>
            <div className={styles.value}>
              <code className={styles.mono}>{project?.slug ?? '—'}</code>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Default TTL</label>
            <div className={styles.value}>
              {project?.default_ttl ?? 30} minutes
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Project ID</label>
            <div className={styles.copyRow}>
              <code className={styles.mono}>{project?.id ?? '—'}</code>
              {project && (
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(project.id, 'project_id')}
                >
                  {copied === 'project_id' ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Organization */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Organization</h2>
        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>Name</label>
            <div className={styles.value}>{organization?.name ?? '—'}</div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Slug</label>
            <div className={styles.value}>
              <code className={styles.mono}>
                {organization?.slug ?? '—'}
              </code>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Your Role</label>
            <div className={styles.value}>
              <span className={styles.roleBadge}>{profile?.role ?? '—'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Setup */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Setup</h2>
        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label}>CLI Config</label>
            <p className={styles.hint}>
              Add this to your <code className={styles.inlineCode}>.preclaim.json</code>:
            </p>
            {project && (
              <div className={styles.codeBlock}>
                <pre className={styles.pre}>
                  {JSON.stringify(
                    {
                      projectId: project.id,
                      backend: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1`,
                      ttl: project.default_ttl,
                    },
                    null,
                    2,
                  )}
                </pre>
                <button
                  className={styles.copyButton}
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          projectId: project.id,
                          backend: `${window.location.origin}/api/v1`,
                          ttl: project.default_ttl,
                        },
                        null,
                        2,
                      ),
                      'config',
                    )
                  }
                >
                  {copied === 'config' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
