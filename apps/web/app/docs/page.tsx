import { cliCommands, mcpTools, hooks, configEntries } from '@preclaim/core';
import type { DocCommand, DocTool, DocHook, DocConfigEntry } from '@preclaim/core';
import styles from './page.module.css';

export const metadata = {
  title: 'Docs — Preclaim',
  description: 'CLI commands, MCP tools, hooks, and configuration reference for Preclaim.',
};

function CommandCard({ cmd }: { cmd: DocCommand }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <code className={styles.cardName}>{cmd.name}</code>
      </div>
      <p className={styles.cardDesc}>{cmd.description}</p>
      <div className={styles.cardMeta}>
        <code className={styles.usage}>{cmd.usage}</code>
      </div>
      {cmd.options && cmd.options.length > 0 && (
        <div className={styles.optionsBlock}>
          <span className={styles.optionsLabel}>Options</span>
          {cmd.options.map((opt) => (
            <div key={opt.flags} className={styles.option}>
              <code className={styles.optionFlags}>{opt.flags}</code>
              <span className={styles.optionDesc}>
                {opt.description}
                {opt.default && (
                  <span className={styles.optionDefault}> (default: {opt.default})</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {cmd.example && (
        <div className={styles.exampleBlock}>
          <code className={styles.example}>
            <span className={styles.prompt}>$</span> {cmd.example}
          </code>
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool }: { tool: DocTool }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <code className={styles.cardName}>{tool.name}</code>
      </div>
      <p className={styles.cardDesc}>{tool.description}</p>
      {tool.args.length > 0 && (
        <div className={styles.optionsBlock}>
          <span className={styles.optionsLabel}>Arguments</span>
          {tool.args.map((arg) => (
            <div key={arg.name} className={styles.option}>
              <code className={styles.optionFlags}>
                {arg.name}
                <span className={styles.argType}>{arg.type}</span>
                {!arg.required && <span className={styles.argOptional}>optional</span>}
              </code>
              <span className={styles.optionDesc}>{arg.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HookCard({ hook }: { hook: DocHook }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <code className={styles.cardName}>{hook.name}</code>
        <span className={styles.hookEvent}>{hook.event}</span>
      </div>
      <p className={styles.cardDesc}>{hook.description}</p>
    </div>
  );
}

function ConfigRow({ entry }: { entry: DocConfigEntry }) {
  return (
    <div className={styles.configRow}>
      <code className={styles.configKey}>{entry.key}</code>
      <span className={styles.configDesc}>
        {entry.description}
        {entry.default && (
          <span className={styles.optionDefault}> (default: {entry.default})</span>
        )}
      </span>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div>
      {/* ─── NAV ─── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.logo}>
            preclaim<span className={styles.logoDot}>_</span>
          </a>
          <div className={styles.navLinks}>
            <a href="/docs" className={styles.navLinkActive}>
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
            <a href="/#get-started" className={styles.navCta}>
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>Reference</p>
          <h1 className={styles.heroTitle}>
            Documentation
          </h1>
          <p className={styles.heroSubtitle}>
            CLI commands, MCP tools, hooks, and configuration — generated from
            the same source code that powers the tools.
          </p>
        </div>
      </section>

      {/* ─── TOC ─── */}
      <div className={styles.tocWrapper}>
        <nav className={styles.toc}>
          <a href="#cli" className={styles.tocLink}>CLI Commands</a>
          <a href="#mcp" className={styles.tocLink}>MCP Tools</a>
          <a href="#hooks" className={styles.tocLink}>Hook Setup</a>
          <a href="#config" className={styles.tocLink}>Configuration</a>
        </nav>
      </div>

      {/* ─── CLI COMMANDS ─── */}
      <section id="cli" className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>CLI</p>
          <h2 className={styles.sectionTitle}>
            Commands
          </h2>
          <p className={styles.sectionSubtitle}>
            Install globally with <code className={styles.inlineCode}>npm i -g preclaim</code>, then
            run any command below.
          </p>
          <div className={styles.cardGrid}>
            {cliCommands.map((cmd) => (
              <CommandCard key={cmd.name} cmd={cmd} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── MCP TOOLS ─── */}
      <section id="mcp" className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>MCP Server</p>
          <h2 className={styles.sectionTitle}>
            Tools
          </h2>
          <p className={styles.sectionSubtitle}>
            Add <code className={styles.inlineCode}>preclaim-mcp</code> as an MCP server
            in any compatible agent. These tools are exposed automatically.
          </p>
          <div className={styles.cardGrid}>
            {mcpTools.map((tool) => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOOKS ─── */}
      <section id="hooks" className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>Claude Code</p>
          <h2 className={styles.sectionTitle}>
            Hook Setup
          </h2>
          <p className={styles.sectionSubtitle}>
            Run <code className={styles.inlineCode}>preclaim install-hooks</code> to
            auto-configure these in <code className={styles.inlineCode}>.claude/settings.json</code>.
          </p>
          <div className={styles.cardGrid}>
            {hooks.map((hook) => (
              <HookCard key={hook.name} hook={hook} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONFIGURATION ─── */}
      <section id="config" className={styles.section}>
        <div className={styles.container}>
          <p className={styles.sectionLabel}>Config</p>
          <h2 className={styles.sectionTitle}>
            .preclaim.json
          </h2>
          <p className={styles.sectionSubtitle}>
            Created by <code className={styles.inlineCode}>preclaim init</code>. Modify
            with <code className={styles.inlineCode}>preclaim config --set key=value</code>.
          </p>
          <div className={styles.configTable}>
            <div className={styles.configHeader}>
              <span>Key</span>
              <span>Description</span>
            </div>
            {configEntries.map((entry) => (
              <ConfigRow key={entry.key} entry={entry} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>
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
