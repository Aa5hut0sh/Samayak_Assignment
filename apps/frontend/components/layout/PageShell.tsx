'use client';
import Sidebar from './Sidebar';

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',        /* viewport-locked — no page scroll from sidebar */
      overflow: 'hidden',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        height: '100vh',
        overflowY: 'auto',    /* only the content area scrolls */
        padding: '32px 36px',
        minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  );
}