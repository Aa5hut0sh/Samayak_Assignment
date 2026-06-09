interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 16,
        marginBottom: 28,
      }}
      className="fade-up"
    >
      <div>
        <h1 style={{
          fontSize: 26, fontWeight: 800, letterSpacing: '-0.025em',
          color: 'var(--ink)', lineHeight: 1.1, margin: 0,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </div>
      )}
    </div>
  );
}