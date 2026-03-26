import { Sidebar } from './components/sidebar';
import { AuthProvider } from './providers';
import styles from './layout.module.css';

// Never statically prerender dashboard pages — they require auth + live data
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className={styles.layout}>
        <Sidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </AuthProvider>
  );
}
