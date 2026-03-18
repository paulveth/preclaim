import { Sidebar } from './components/sidebar';
import { AuthProvider } from './providers';
import styles from './layout.module.css';

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
