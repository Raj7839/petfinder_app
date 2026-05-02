import './Badge.css';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'amber' | 'emerald' | 'red' | 'purple' | 'cyan';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
}

export function Badge({ children, variant = 'default', size = 'sm', dot = false, pulse = false }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} badge-${size} ${pulse ? 'badge-pulse' : ''}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: BadgeProps['variant']; label: string; dot: boolean; pulse: boolean }> = {
    active: { variant: 'blue', label: 'Active', dot: true, pulse: true },
    pending: { variant: 'amber', label: 'Pending', dot: true, pulse: false },
    matched: { variant: 'emerald', label: 'Matched', dot: true, pulse: true },
    resolved: { variant: 'default', label: 'Resolved', dot: false, pulse: false },
    confirmed: { variant: 'emerald', label: 'Confirmed', dot: true, pulse: false },
    dismissed: { variant: 'red', label: 'Dismissed', dot: false, pulse: false },
  };
  const c = config[status] || { variant: 'default' as const, label: status, dot: false, pulse: false };
  return <Badge variant={c.variant} dot={c.dot} pulse={c.pulse}>{c.label}</Badge>;
}
