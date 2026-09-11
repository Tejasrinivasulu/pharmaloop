import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill } from 'lucide-react';
import { api } from '../lib/api';
import { AlertBanner, Button, Card, Input } from '../components/ui';
export default function SignupPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [org, setOrg] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    async function onSubmit(e) {
        e.preventDefault();
        setError(null);
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setLoading(true);
        try {
            await api('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim(),
                    password,
                    org: org.trim(),
                }),
            });
            navigate('/login', {
                replace: true,
                state: {
                    signupEmail: email.trim(),
                    message: 'Pharmacy account created. Sign in with role Pharmacy.',
                },
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create account. Please try again.');
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
            <h1 className="mt-1 font-display text-xl font-bold text-white/85">Create account</h1>
          </div>

          <form onSubmit={onSubmit} className="space-y-2.5 p-5">
            {error && (<AlertBanner tone="danger" title="Unable to sign up">
                {error}
              </AlertBanner>)}

            <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-900">
              Pharmacy signup only. Distributor and Manufacturer accounts are added by Admin.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <Input label="Full name" required placeholder="Priya Sharma" value={name} onChange={(e) => setName(e.target.value)}/>
              <Input label="Pharmacy name" required placeholder="City Care Pharmacy" value={org} onChange={(e) => setOrg(e.target.value)}/>
            </div>

            <Input label="Email" type="email" autoComplete="email" required placeholder="you@pharmacy.com" value={email} onChange={(e) => setEmail(e.target.value)}/>

            <Input label="Role" value="Pharmacy" readOnly className="bg-slate-50 text-slate-700"/>

            <div className="grid grid-cols-2 gap-2.5">
              <Input label="Password" type="password" autoComplete="new-password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
              <Input label="Confirm" type="password" autoComplete="new-password" required placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)}/>
            </div>

            <Button type="submit" className="mt-1 w-full" loading={loading}>
              Sign up
            </Button>

            <p className="pt-0.5 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-brand-800 hover:text-brand-950">
                Login
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>);
}
