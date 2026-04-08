type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'purple';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  danger: 'bg-red-50 text-red-600 border border-red-200',
  warning: 'bg-amber-50 text-amber-600 border border-amber-200',
  info: 'bg-blue-50 text-blue-600 border border-blue-200',
  purple: 'bg-purple-50 text-purple-600 border border-purple-200',
};

export default function Badge({ variant, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
