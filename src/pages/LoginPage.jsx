import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill } from 'lucide-react';
import { useAuth, roleHome } from '../context/AuthContext';
import { AlertBanner, Button, Card, Input, Select } from '../components/ui';
const ROLES = ['Pharmacy', 'Distributor', 'Manufacturer', 'Admin'];
const DEMO_ACCOUNTS = [
    { email: 'pharmacy@pharmaloop.com', role: 'Pharmacy', label: 'Pharmacy' },
    { email: 'distributor@pharmaloop.com', role: 'Distributor', label: 'Distributor' },
    { email: 'manufacturer@pharmaloop.com', role: 'Manufacturer', label: 'Manufacturer' },
    { email: 'admin@pharmaloop.com', role: 'Admin', label: 'Admin' },
];
const DEMO_PASSWORD = 'demo123';
export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const signupState = location.state;
    const [email, setEmail] = useState(signupState?.signupEmail || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('Pharmacy');
    const [error, setError] = useState(null);
    const [info] = useState(signupState?.message || null);
    const [loading, setLoading] = useState(false);
    function applyDemo(account) {
        setEmail(account.email);
        setRole(account.role);
        setPassword(DEMO_PASSWORD);
        setError(null);
    }
    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const user = await login(email.trim(), password, role);
            navigate(roleHome(user.role), { replace: true });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed. Check credentials and try again.');
        }
        finally {
            setLoading(false);
        }
    }
    return (<div className="fixed inset-0 overflow-hidden bg-[#f4f7fb]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-brand-100),_transparent_55%)]"/>

      <Link to="/" className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-brand-800 transition hover:bg-white/80 sm:left-6 sm:top-5">
        <ArrowLeft className="h-4 w-4"/>
        Back to home
      </Link>

      <div className="relative flex h-full items-center justify-center px-4">
        <Card className="w-full max-w-[400px] overflow-hidden border-brand-100 shadow-elevated">
          <div className="border-b border-slate-100 bg-gradient-to-br from-brand-900 to-brand-800 px-5 py-5 text-center text-white">
            <span className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
              <Pill className="h-4 w-4" strokeWidth={2.25}/>
            </span>
            <p className="mt-2.5 font-display text-lg font-extrabold tracking-tight text-white">
              PharmaLoop
            </p>
            <h1 className="mt-1 font-display text-xl font-bold text-white/85">Welcome back</h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-3 p-5">
            {info && (<AlertBanner tone="success" title="Account ready">
                {info}
              </AlertBanner>)}
            {error && (<AlertBanner tone="danger" title="Unable to sign in">
                {error}
              </AlertBanner>)}

            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => (<option key={r} value={r}>
                  {r}
                </option>))}
            </Select>

            <Input label="Email" type="email" autoComplete="email" required placeholder="you@organization.com" value={email} onChange={(e) => setEmail(e.target.value)}/>

            <Input label="Password" type="password" autoComplete="current-password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>

            <div className="pt-0.5">
              <a href="#" className="text-xs font-medium text-brand-700 hover:text-brand-900">
                Forgot Password?
              </a>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              Login
            </Button>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have a pharmacy account?{' '}
              <Link to="/signup" className="font-semibold text-brand-800 hover:text-brand-950">
                Sign up
              </Link>
            </p>
          </form>

          <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-[11px] text-slate-500">
              Demo logins — password{' '}
              <span className="font-semibold text-brand-800">{DEMO_PASSWORD}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (<button key={account.email} type="button" onClick={() => applyDemo(account)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50">
                  {account.label}
                </button>))}
            </div>
          </div>
        </Card>
      </div>
    </div>);
}
