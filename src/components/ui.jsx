import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
export function cn(...parts) {
    return parts.filter(Boolean).join(' ');
}
export function Card({ children, className, }) {
    return (<div className={cn('rounded-2xl border border-slate-200/90 bg-white shadow-card', className)}>
      {children}
    </div>);
}
export function CardHeader({ title, subtitle, action, }) {
    return (<div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="font-display text-base font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>);
}
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }) {
    const variants = {
        primary: 'bg-brand-800 text-white hover:bg-brand-900 shadow-sm hover:shadow-md active:translate-y-px',
        secondary: 'bg-white text-brand-800 border border-slate-200 hover:border-brand-300 hover:bg-brand-50',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-brand-800',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
        success: 'bg-verify-600 text-white hover:bg-verify-700 shadow-sm',
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-[13px]',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-[15px]',
    };
    return (<button className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold tracking-tight transition duration-200 disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="h-4 w-4 animate-spin"/>}
      {children}
    </button>);
}
export function LinkButton({ variant = 'primary', size = 'md', className, children, ...props }) {
    const variants = {
        primary: 'bg-brand-800 text-white hover:bg-brand-900 shadow-sm',
        secondary: 'bg-white text-brand-800 border border-slate-200 hover:bg-brand-50',
        ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
        'outline-light': 'border border-white/35 text-white hover:bg-white/10',
    };
    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-5 py-2.5 text-base',
    };
    return (<Link className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold transition', variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>);
}
export function Badge({ children, tone = 'neutral', }) {
    const tones = {
        neutral: 'bg-slate-100 text-slate-600',
        success: 'bg-verify-100 text-verify-700',
        warning: 'bg-orange-100 text-orange-700',
        danger: 'bg-red-100 text-red-700',
        info: 'bg-sky-100 text-sky-700',
        brand: 'bg-brand-100 text-brand-800',
    };
    return (<span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', tones[tone])}>
      {children}
    </span>);
}
export function statusTone(status) {
    const s = status.toUpperCase();
    if (s.includes('VERIFIED') || s.includes('CLOSED') || s.includes('MATCH') || s.includes('ACCEPTED'))
        return 'success';
    if (s.includes('DISCREPANCY') || s.includes('PENDING') || s.includes('EXPIRING') || s.includes('CLAIMED'))
        return 'warning';
    if (s.includes('RE_ENTRY') || s.includes('EXPIRED') || s.includes('CRITICAL') || s.includes('ALERT'))
        return 'danger';
    if (s.includes('QUARANTINE') || s.includes('REQUEST'))
        return 'brand';
    return 'info';
}
export function KpiCard({ label, value, hint, accent, }) {
    const accents = {
        default: 'text-brand-900',
        success: 'text-verify-700',
        warning: 'text-orange-600',
        danger: 'text-red-600',
    };
    return (<Card className="relative overflow-hidden p-5 transition hover:shadow-elevated">
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand-50"/>
      <p className="relative text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className={cn('relative mt-2 font-display text-[1.65rem] font-bold tracking-tight tabular-nums', accents[accent || 'default'])}>
        {value}
      </p>
      {hint && <p className="relative mt-1.5 text-xs text-slate-400">{hint}</p>}
    </Card>);
}
export function PageHeader({ title, subtitle, actions, }) {
    return (<div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[1.65rem] font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>);
}
export function EmptyState({ title, text }) {
    return (<div className="px-5 py-12 text-center">
      <p className="font-display font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>);
}
export function Input({ label, className, ...props }) {
    return (<label className="block space-y-1.5">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <input className={cn('w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none ring-brand-600/20 placeholder:text-slate-400 focus:border-brand-600 focus:ring-4', className)} {...props}/>
    </label>);
}
export function Select({ label, children, className, ...props }) {
    return (<label className="block space-y-1.5">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <select className={cn('w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/20', className)} {...props}>
        {children}
      </select>
    </label>);
}
export function Textarea({ label, className, ...props }) {
    return (<label className="block space-y-1.5">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <textarea className={cn('w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-600/20', className)} {...props}/>
    </label>);
}
export function TableWrap({ children }) {
    return <div className="overflow-x-auto">{children}</div>;
}
export function DataTable({ headers, children, }) {
    return (<TableWrap>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {headers.map((h) => (<th key={h} className="px-4 py-3 font-display text-xs font-semibold uppercase tracking-wide text-slate-500">
                {h}
              </th>))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </TableWrap>);
}
export function Timeline({ steps, }) {
    return (<ol className="space-y-0">
      {steps.map((s, i) => (<li key={`${s.label}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (<span className="absolute left-[9px] top-5 h-[calc(100%-8px)] w-0.5 bg-slate-200"/>)}
          <span className={cn('relative z-10 mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full border-2', s.done
                ? 'border-verify-600 bg-verify-600'
                : s.current
                    ? 'border-brand-600 bg-white'
                    : 'border-slate-300 bg-white')}/>
          <div>
            <p className={cn('font-display text-sm font-semibold', s.done ? 'text-verify-700' : s.current ? 'text-brand-800' : 'text-slate-600')}>
              {s.label}
            </p>
            {s.note && <p className="text-xs text-slate-500">{s.note}</p>}
          </div>
        </li>))}
    </ol>);
}
export function LoadingScreen({ label = 'Loading…' }) {
    return (<div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-brand-700"/>
      <span className="text-sm">{label}</span>
    </div>);
}
export function AlertBanner({ tone = 'warning', title, children, }) {
    const tones = {
        warning: 'border-orange-200 bg-orange-50 text-orange-800',
        danger: 'border-red-200 bg-red-50 text-red-800',
        success: 'border-teal-200 bg-verify-50 text-verify-700',
        info: 'border-sky-200 bg-sky-50 text-sky-800',
    };
    return (<div className={cn('rounded-xl border px-4 py-3', tones[tone])}>
      <p className="font-display text-sm font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm opacity-90">{children}</div>}
    </div>);
}
