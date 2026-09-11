import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Boxes, Building2, CheckCircle2, ClipboardList, FileCheck2, FlaskConical, Lock, Menu, Package, Pill, Recycle, Scale, Search, Shield, ShieldAlert, Store, Truck, Wallet, X, } from 'lucide-react';
import { LinkButton, cn } from '../components/ui';
const NAV = [
    { href: '#home', label: 'Home' },
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#compliance', label: 'Compliance' },
    { href: '#benefits', label: 'Benefits' },
];
const PROBLEMS = [
    {
        title: 'Fragmented Records',
        text: 'Pharmacies, distributors, and manufacturers keep separate trails of the same return.',
    },
    {
        title: 'Quantity Disputes',
        text: 'Declared quantity and physically received quantity can diverge at every handoff.',
    },
    {
        title: 'Settlement Delays',
        text: 'Credits, replacements, and adjustments stall when evidence is incomplete.',
    },
    {
        title: 'Unverified Disposal',
        text: 'A disposal claim without certificates and reconciliation is not proof.',
    },
];
const STEPS = [
    {
        n: '01',
        title: 'Detect',
        text: 'Surface near-expiry and expired stock before it leaves pharmacy shelves.',
        icon: Search,
    },
    {
        n: '02',
        title: 'Return',
        text: 'Create a structured return with batch, quantity, and supporting evidence.',
        icon: Package,
    },
    {
        n: '03',
        title: 'Verify',
        text: 'Distributor confirms received quantity against the pharmacy declaration.',
        icon: BadgeCheck,
    },
    {
        n: '04',
        title: 'Reconcile',
        text: 'Compare expected, received, and disposed quantities at each stage.',
        icon: Scale,
    },
    {
        n: '05',
        title: 'Quarantine',
        text: 'Keep returned stock clearly separated from saleable inventory.',
        icon: Lock,
    },
    {
        n: '06',
        title: 'Dispose',
        text: 'Record disposal activity and attach certificates to the return.',
        icon: Recycle,
    },
    {
        n: '07',
        title: 'Verify & Close',
        text: 'Close only after evidence, reconciliation, and destruction verification.',
        icon: FileCheck2,
    },
];
const FEATURES = [
    {
        icon: ClipboardList,
        title: 'Digital Batch Passport',
        text: 'Continuous history of a batch and every returned quantity movement across the reverse chain.',
        tag: 'Traceability',
    },
    {
        icon: Boxes,
        title: 'Smart Return Management',
        text: 'Coordinate pharmacy → distributor → manufacturer returns in one structured workflow.',
        tag: 'Operations',
    },
    {
        icon: Scale,
        title: 'Quantity Reconciliation',
        text: 'Compare expected, received, and disposed quantities — catch mismatches before settlement.',
        tag: 'Accuracy',
    },
    {
        icon: Lock,
        title: 'Quarantine Control',
        text: 'Keep expired stock clearly marked NOT FOR SALE until the reverse loop is closed.',
        tag: 'Control',
    },
    {
        icon: Recycle,
        title: 'Verified Disposal',
        text: 'Require evidence and certificates before final close — claimed disposal is never enough.',
        tag: 'Proof',
    },
    {
        icon: Wallet,
        title: 'Settlement Tracking',
        text: 'Track credits, replacements, refunds, and account adjustments against verified returns.',
        tag: 'Finance',
    },
    {
        icon: ShieldAlert,
        title: 'Re-entry Detection',
        text: 'Flag later scans of previously disposed stock and route them to investigation.',
        tag: 'Integrity',
    },
    {
        icon: FlaskConical,
        title: 'Compliance Intelligence',
        text: 'Surface high-risk cases, exceptions, and audit-ready trails for regulatory review.',
        tag: 'Oversight',
    },
];
const BENEFITS = [
    {
        icon: Store,
        role: 'Pharmacy',
        line: 'Recover eligible value and simplify expiry returns with live status.',
    },
    {
        icon: Truck,
        role: 'Distributor',
        line: 'Cut manual verification work and reduce quantity disputes.',
    },
    {
        icon: Building2,
        role: 'Manufacturer',
        line: 'See the full reverse chain through quarantine and verified disposal.',
    },
    {
        icon: Shield,
        role: 'Admin / Regulator',
        line: 'Monitor exceptions, search batches, and support investigations.',
    },
];
function LogoMark({ className }) {
    return (<span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-white', className)}>
      <Pill className="h-5 w-5" strokeWidth={2.25}/>
    </span>);
}
export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 16);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (<div className="min-h-screen bg-white text-slate-700">
      {/* Sticky nav */}
      <header className={cn('fixed inset-x-0 top-0 z-50 border-b transition duration-300', scrolled || menuOpen
            ? 'border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl'
            : 'border-transparent bg-white/80 backdrop-blur-md')}>
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#home" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-[1.15rem] font-extrabold tracking-tight text-brand-900">
              PharmaLoop
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (<a key={item.href} href={item.href} className="rounded-lg px-3.5 py-2 text-[13.5px] font-semibold tracking-tight text-slate-600 transition hover:bg-brand-50 hover:text-brand-800">
                {item.label}
              </a>))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/login" className="rounded-xl px-4 py-2 font-display text-sm font-semibold text-brand-800 transition hover:bg-brand-50">
              Login
            </Link>
            <Link to="/signup" className="rounded-xl bg-brand-800 px-4 py-2.5 font-display text-sm font-semibold text-white transition hover:bg-brand-900">
              Get Started
            </Link>
          </div>

          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-900 lg:hidden" aria-label="Toggle menu" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}
          </button>
        </div>

        {menuOpen && (<div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (<a key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-50" onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>))}
              <div className="mt-3 flex gap-2">
                <LinkButton to="/login" variant="secondary" className="flex-1" onClick={() => setMenuOpen(false)}>
                  Login
                </LinkButton>
                <LinkButton to="/login" className="flex-1" onClick={() => setMenuOpen(false)}>
                  Get Started
                </LinkButton>
              </div>
            </div>
          </div>)}
      </header>

      {/* HERO — text left, disposal image right */}
      <section id="home" className="relative overflow-hidden bg-[#f4f7fb] pt-[4.5rem]">
        <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col justify-center px-4 py-12 sm:px-6 lg:py-16 lg:pr-6 xl:pr-10">
            <p className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-brand-600">
              PharmaLoop
            </p>
            <h1 className="mt-4 font-display text-[2.35rem] font-extrabold leading-[1.1] tracking-[-0.035em] text-brand-950 sm:text-5xl lg:text-[3.05rem]">
              From Expired Medicine to Verified Disposal.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Track every returned batch from pharmacy to verified destruction — with quantity proof,
              settlement visibility, and a complete compliance trail.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl bg-brand-800 px-6 py-3.5 font-display text-[15px] font-bold text-white shadow-md transition hover:bg-brand-900">
                Get Started <ArrowRight className="h-4 w-4"/>
              </Link>
              <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 font-display text-[15px] font-semibold text-brand-800 transition hover:border-brand-300 hover:bg-brand-50">
                See How It Works
              </a>
            </div>
          </div>

          <div className="relative mx-4 mb-10 h-[220px] overflow-hidden rounded-2xl sm:mx-6 sm:h-[280px] lg:mx-0 lg:mb-0 lg:mr-6 lg:h-[340px] xl:mr-0">
            <img src="/images/disposal-hero.png" alt="Organized pharmacy shelves next to expired medicine quarantine bin" className="absolute inset-0 h-full w-full object-cover object-center"/>
          </div>
        </div>
      </section>

      {/* PROBLEM — numbered editorial strip, not card grid */}
      <section id="problem" className="border-b border-slate-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
                The gap
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
                Expired medicine shouldn&apos;t disappear from the supply chain.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-slate-600">
                After stock leaves a pharmacy, information fragments across organizations. Without a
                shared reverse chain, proving what was returned, received, disposed, and settled becomes
                guesswork.
              </p>
            </div>
            <ol className="divide-y divide-slate-200 border-y border-slate-200">
              {PROBLEMS.map((p, i) => (<li key={p.title} className="grid grid-cols-[auto_1fr] gap-5 py-5 sm:gap-8">
                  <span className="font-display text-2xl font-extrabold tabular-nums text-brand-200">
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-brand-950">{p.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-slate-500">{p.text}</p>
                  </div>
                </li>))}
            </ol>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — vertical spine timeline */}
      <section id="how-it-works" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
              One digital chain. From return to proof.
            </h2>
            <p className="mt-3 text-slate-600">
              Seven connected stages — closing only when disposal is verified, not merely claimed.
            </p>
          </div>

          <div className="relative mx-auto mt-14 max-w-3xl">
            <div className="absolute bottom-4 left-[1.15rem] top-4 w-px bg-gradient-to-b from-brand-300 via-brand-500 to-verify-500 sm:left-1/2 sm:-translate-x-px"/>
            <ul className="space-y-8">
              {STEPS.map((s, i) => {
            const Icon = s.icon;
            const left = i % 2 === 0;
            return (<li key={s.n} className={cn('relative grid items-center gap-4 sm:grid-cols-2 sm:gap-10')}>
                    <div className={cn('pl-12 sm:pl-0', left ? 'sm:text-right sm:pr-10' : 'sm:col-start-2 sm:pl-10')}>
                      <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                        {s.n} · {s.title}
                      </p>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">{s.text}</p>
                    </div>
                    <div className={cn('absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-white shadow-md ring-4 ring-white sm:left-1/2 sm:-translate-x-1/2', !left && 'sm:bg-verify-600')}>
                      <Icon className="h-4 w-4"/>
                    </div>
                    {/* spacer for alternating side */}
                    <div className={cn('hidden sm:block', left ? 'sm:col-start-2' : 'sm:col-start-1 sm:row-start-1')}/>
                  </li>);
        })}
            </ul>
          </div>

          </div>
      </section>

      {/* FEATURES — side-by-side boxes */}
      <section id="features" className="border-y border-slate-200 bg-[#f7f9fc]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              Features
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
              Everything needed to close the reverse chain.
            </h2>
            <p className="mt-3 text-slate-600">
              Eight modules working side by side — from batch passport to verified disposal.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => {
            const Icon = f.icon;
            return (<article key={f.title} className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-elevated sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-800 transition group-hover:bg-brand-800 group-hover:text-white">
                      <Icon className="h-5 w-5"/>
                    </span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                      {f.tag}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold tracking-tight text-brand-950">
                    {f.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{f.text}</p>
                </article>);
        })}
          </div>
        </div>
      </section>

      {/* AI — dark band with risk meter */}
      <section className="relative overflow-hidden bg-brand-950">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-verify-600/20 blur-3xl"/>
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-brand-600/30 blur-3xl"/>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-verify-500">
              AI intelligence
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Predict problems before they become losses.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/65">
              Flag stock likely to become an expiry return and highlight unusual patterns — while
              keeping critical compliance decisions rule- and verification-based.
            </p>
            <dl className="mt-8 space-y-4 border-t border-white/10 pt-8">
              {[
            ['XGBoost', 'Expiry-return risk prediction'],
            ['SHAP', 'Explainable drivers behind each score'],
            ['Anomaly Detection', 'Unusual return pattern alerts'],
        ].map(([k, v]) => (<div key={k} className="flex gap-6">
                  <dt className="w-36 shrink-0 font-display text-sm font-bold text-verify-400">{k}</dt>
                  <dd className="text-sm text-white/60">{v}</dd>
                </div>))}
            </dl>
            <p className="mt-8 text-sm italic text-white/45">
              AI provides predictions and risk alerts. Critical compliance decisions remain
              verification-based.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-md sm:p-9">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
              AI Expiry Risk
            </p>
            <p className="mt-3 font-display text-xl font-bold text-white">PCM-2026-001</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
            ['Stock', '500 units'],
            ['Days to Expiry', '25'],
            ['Sales Velocity', 'Low'],
            ['Historical Returns', 'High'],
        ].map(([k, v]) => (<div key={k} className="rounded-xl bg-black/25 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/40">{k}</p>
                  <p className="mt-0.5 font-display font-semibold text-white">{v}</p>
                </div>))}
            </div>
            <div className="mt-6 flex items-end justify-between gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="font-display text-6xl font-extrabold tracking-tight text-orange-400">87%</p>
                <p className="mt-1 font-display text-sm font-bold uppercase tracking-wide text-orange-300/90">
                  High return risk
                </p>
              </div>
              <span className="rounded-full bg-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-200 ring-1 ring-orange-400/30">
                Action recommended
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS — horizontal role rows */}
      <section id="benefits" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-brand-600">
              Who benefits
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-brand-950 sm:text-4xl">
              Value for every participant.
            </h2>
          </div>

          <ul className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
            {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (<li key={b.role} className="group flex flex-col gap-4 py-7 transition hover:bg-brand-50/40 sm:flex-row sm:items-center sm:gap-10 sm:px-4">
                  <div className="flex items-center gap-4 sm:w-56 sm:shrink-0">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-800 text-white transition group-hover:bg-verify-600">
                      <Icon className="h-5 w-5"/>
                    </span>
                    <span className="font-display text-lg font-bold text-brand-950">{b.role}</span>
                  </div>
                  <p className="flex-1 text-[16px] leading-relaxed text-slate-600">{b.line}</p>
                  <ArrowRight className="hidden h-5 w-5 text-brand-300 transition group-hover:translate-x-1 group-hover:text-brand-700 sm:block"/>
                </li>);
        })}
          </ul>
        </div>
      </section>

      {/* COMPLIANCE */}
      <section id="compliance" className="overflow-hidden bg-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
            <div>
              <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-verify-400">
                Compliance support
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Built for responsible pharmaceutical disposal.
              </h2>
              <p className="mt-2 font-display text-sm font-semibold text-verify-300">CDSCO 2025 Guidance</p>
              <p className="mt-4 text-[16px] leading-relaxed text-white/70">
                PharmaLoop digitally supports the reverse-disposal workflow by maintaining records,
                tracking expired and unused medicine returns, verifying quantities, recording disposal
                activities, and preserving evidence for regulatory verification.
              </p>
              <p className="mt-4 text-sm text-white/45">
                Supports compliance workflows. Not CDSCO-approved, government certified, or officially
                endorsed.
              </p>
              <a href="#features" className="mt-8 inline-flex items-center gap-2 font-display text-sm font-bold text-white transition hover:text-verify-300">
                Explore compliance features <ArrowRight className="h-4 w-4"/>
              </a>
            </div>
            <ul className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
              {[
            'Return & quantity trail',
            'Disposal certificate linkage',
            'Tamper-evident audit history',
            'Investigation-ready records',
        ].map((t) => (<li key={t} className="flex items-center gap-3 text-sm text-white/85">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-verify-400"/>
                  {t}
                </li>))}
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-[#f4f7fb] text-brand-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-8 sm:px-6">
          <div className="sm:max-w-xs">
            <div className="flex items-center gap-2.5">
              <LogoMark />
              <span className="font-display text-lg font-extrabold text-brand-900">PharmaLoop</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-800/80">
              Digital reverse logistics and compliance for expired and unused medicines.
            </p>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-3 text-center text-sm sm:max-w-md sm:gap-4">
            <div>
              <p className="font-display font-semibold text-brand-900">Product</p>
              <ul className="mt-2 space-y-1.5">
                <li><a href="#features" className="text-brand-800 hover:text-brand-950">Features</a></li>
                <li><a href="#how-it-works" className="text-brand-800 hover:text-brand-950">How It Works</a></li>
                <li><a href="#benefits" className="text-brand-800 hover:text-brand-950">Benefits</a></li>
              </ul>
            </div>
            <div>
              <p className="font-display font-semibold text-brand-900">Resources</p>
              <ul className="mt-2 space-y-1.5">
                <li><a href="#compliance" className="text-brand-800 hover:text-brand-950">Compliance</a></li>
                <li><Link to="/login" className="text-brand-800 hover:text-brand-950">Login</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-display font-semibold text-brand-900">Legal</p>
              <ul className="mt-2 space-y-1.5">
                <li><a href="#" className="text-brand-800 hover:text-brand-950">Privacy</a></li>
                <li><a href="#" className="text-brand-800 hover:text-brand-950">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 text-center text-xs text-brand-800/70">
          © 2026 PharmaLoop. All rights reserved.
        </div>
      </footer>
    </div>);
}
