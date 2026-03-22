import styles from './page.module.css';
import { MatrixRain } from './components/matrix-rain';

const features = [
  {
    detail: 'claim_file()',
    title: 'Atomic Locking',
    description:
      'Database-level file locking via Supabase RPC. One file, one agent, guaranteed.',
  },
  {
    detail: 'failOpen: true',
    title: 'Fail-Open',
    description:
      'Network down? Development continues. Preclaim never blocks your workflow.',
  },
  {
    detail: 'git commit →',
    title: 'Auto-Release',
    description:
      'Commit triggers unlock. Crashed sessions expire gracefully via TTL.',
  },
  {
    detail: 'subscribe()',
    title: 'Real-time',
    description:
      'See active locks across all sessions. Live updates via Supabase Realtime.',
  },
  {
    detail: 'PreToolUse',
    title: 'Claude Code Native',
    description:
      'First-class hooks integration. Installs in one command, works invisibly.',
  },
  {
    detail: 'preclaim init',
    title: 'Self-Service',
    description:
      'One command creates your org, project, and auth. No forms, no waiting.',
  },
];

export default function Home() {
  return (
    <div>
      {/* ─── NAV ─── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.logo}>
            <img src="/logo-mark.svg" alt="" className={styles.logoMark} />
            preclaim<span className={styles.logoDot}>_</span>
          </a>
          <div className={styles.navLinks}>
            <a href="#how-it-works" className={styles.navLink}>
              How it works
            </a>
            <a href="#features" className={styles.navLink}>
              Features
            </a>
            <a href="/docs" className={styles.navLink}>
              Docs
            </a>
            <a
              href="https://github.com/paulveth/preclaim"
              className={styles.navLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a href="#get-started" className={styles.navCta}>
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className={styles.hero}>
        <MatrixRain />
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            Works with Claude Code
          </div>
          <h1 className={styles.heroTitle}>
            One file. One agent.
            <br />
            <span className={styles.green}>Zero conflicts.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            The coordination layer for AI coding agents. Predictive file locking
            that prevents merge conflicts before they happen.
          </p>
          <div className={styles.heroCtas}>
            <a href="#get-started" className={styles.buttonPrimary}>
              Get Started
              <span className={styles.buttonArrow}>&rarr;</span>
            </a>
            <a
              href="https://github.com/paulveth/preclaim"
              className={styles.buttonSecondary}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
          <div className={styles.heroInstall}>
            <code className={styles.installCode}>
              <span className={styles.installPrompt}>$</span>
              npm i -g preclaim
            </code>
          </div>
        </div>
        <div className={styles.heroFade} />
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>How it works</p>
          <h2 className={styles.sectionTitle}>
            Three steps to
            <br />
            <span className={styles.green}>coordination</span>
          </h2>
          <div className={styles.steps}>
            <div>
              <span className={styles.stepNumber}>01</span>
              <div className={styles.stepLine} />
              <h3 className={styles.stepTitle}>Install &amp; init</h3>
              <div className={styles.stepCode}>
                <code>npm i -g preclaim</code>
                <code>preclaim init</code>
              </div>
              <p className={styles.stepDesc}>
                One command sets up auth, creates your project, and installs
                Claude Code hooks.
              </p>
            </div>
            <div>
              <span className={styles.stepNumber}>02</span>
              <div className={styles.stepLine} />
              <h3 className={styles.stepTitle}>Code as usual</h3>
              <p className={styles.stepDesc}>
                Your AI agent edits files normally. Preclaim intercepts writes
                and atomically locks each file — invisible until it matters.
              </p>
            </div>
            <div>
              <span className={styles.stepNumber}>03</span>
              <div className={styles.stepLine} />
              <h3 className={styles.stepTitle}>Collaborate safely</h3>
              <p className={styles.stepDesc}>
                Multiple agents, one codebase. Conflicts are prevented at the
                source — not resolved after the fact.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>Features</p>
          <h2 className={styles.sectionTitle}>
            Built for the
            <br />
            <span className={styles.green}>AI-native</span> workflow
          </h2>
          <div className={styles.features}>
            {features.map((feature) => (
              <div key={feature.title} className={styles.featureCard}>
                <code className={styles.featureDetail}>{feature.detail}</code>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TERMINAL DEMO ─── */}
      <section className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>In action</p>
          <h2 className={styles.sectionTitle}>
            Conflicts stopped
            <br />
            <span className={styles.green}>before they start</span>
          </h2>
          <div className={styles.terminalWrapper}>
            <div className={styles.terminal}>
              <div className={styles.terminalHeader}>
                <div className={styles.terminalDots}>
                  <span className={styles.terminalDot} />
                  <span className={styles.terminalDot} />
                  <span className={styles.terminalDot} />
                </div>
                <span className={styles.terminalTitle}>preclaim — zsh</span>
              </div>
              <div className={styles.terminalBody}>
                <div>
                  <span className={styles.tPrompt}>$</span> preclaim status
                </div>
                <div> </div>
                <div>
                  {'  '}
                  <span className={styles.tDim}>project</span>
                  {'   acme-app'}
                </div>
                <div>
                  {'  '}
                  <span className={styles.tDim}>session</span>
                  {'   claude_a8f3c2'}
                </div>
                <div> </div>
                <div>
                  {'  '}
                  <span className={styles.tGreen}>ACTIVE LOCKS</span>
                </div>
                <div>
                  {'  '}
                  <span className={styles.tDim}>
                    ────────────────────────────────────────
                  </span>
                </div>
                <div>
                  {'  '}
                  <span className={styles.tGreen}>✓</span>
                  {' src/api/auth.ts'}
                  <span className={styles.tDim}>
                    {'        you     28m'}
                  </span>
                </div>
                <div>
                  {'  '}
                  <span className={styles.tGreen}>✓</span>
                  {' src/lib/database.ts'}
                  <span className={styles.tDim}>
                    {'    you     25m'}
                  </span>
                </div>
                <div>
                  {'  '}
                  <span className={styles.tRed}>✗</span>
                  {' src/hooks/useUser.ts'}
                  <span className={styles.tRed}>
                    {'   claude_b  conflict'}
                  </span>
                </div>
                <div> </div>
                <div>
                  <span className={styles.tPrompt}>$</span>
                  <span className={styles.tCursor}> █</span>
                </div>
              </div>
            </div>
            <div className={styles.terminalGlow} />
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section id="get-started" className={styles.ctaSection}>
        <div className={styles.container}>
          <h2 className={styles.ctaTitle}>
            Start coordinating
            <br />
            <span className={styles.green}>in 30 seconds</span>
          </h2>
          <div className={styles.ctaInstall}>
            <code className={styles.ctaCode}>
              <span className={styles.installPrompt}>$</span> npm i -g preclaim
              && preclaim init
            </code>
          </div>
          <div className={styles.ctaButtons}>
            <a
              href="/docs"
              className={styles.buttonPrimary}
            >
              View Documentation
              <span className={styles.buttonArrow}>&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>
            <img src="/logo-mark.svg" alt="" className={styles.logoMark} />
            preclaim<span className={styles.logoDot}>_</span>
          </span>
          <span className={styles.footerText}>
            Open source &middot; Built for AI agents
          </span>
          <a
            href="https://github.com/paulveth/preclaim"
            className={styles.footerLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
