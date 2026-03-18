'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../providers';
import styles from './page.module.css';

export default function SettingsPage() {
  const { project, organization, profile, fetchWithAuth, refreshProject } = useAuth();
  const [copied, setCopied] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [ttl, setTtl] = useState(30);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const isAdmin = profile?.role === 'admin';
  const hasChanges =
    project &&
    (name !== project.name || slug !== project.slug || ttl !== project.default_ttl);

  // Sync form with current project
  useEffect(() => {
    if (project) {
      setName(project.name);
      setSlug(project.slug);
      setTtl(project.default_ttl);
      setSaveMessage(null);
    }
  }, [project]);

  const handleSave = async () => {
    if (!project || !hasChanges) return;

    setSaving(true);
    setSaveMessage(null);

    const res = await fetchWithAuth('/api/v1/projects', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: project.id,
        name: name.trim(),
        slug: slug.trim(),
        default_ttl: ttl,
      }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: 'Failed to save' }));
      setSaveMessage(error ?? 'Failed to save');
      setSaving(false);
      return;
    }

    await refreshProject();
    setSaveMessage('Saved');
    setSaving(false);
    setTimeout(() => setSaveMessage(null), 2000);
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
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
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Project</h2>
          {isAdmin && hasChanges && (
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          )}
          {saveMessage && (
            <span
              className={
                saveMessage === 'Saved' ? styles.saveSuccess : styles.saveError
              }
            >
              {saveMessage}
            </span>
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="projectName">Name</label>
            {isAdmin ? (
              <input
                id="projectName"
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            ) : (
              <div className={styles.value}>{project?.name ?? '—'}</div>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="projectSlug">Slug</label>
            {isAdmin ? (
              <input
                id="projectSlug"
                type="text"
                className={styles.inputMono}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                maxLength={100}
                pattern="[a-z0-9\-]+"
              />
            ) : (
              <div className={styles.value}>
                <code className={styles.mono}>{project?.slug ?? '—'}</code>
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="projectTtl">Default TTL</label>
            {isAdmin ? (
              <div className={styles.ttlRow}>
                <input
                  id="projectTtl"
                  type="number"
                  className={styles.inputSmall}
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  min={1}
                  max={1440}
                />
                <span className={styles.ttlUnit}>minutes</span>
              </div>
            ) : (
              <div className={styles.value}>
                {project?.default_ttl ?? 30} minutes
              </div>
            )}
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
