import { useEffect, useState } from 'react';
import { ArrowRight, Droplets, Eye, EyeOff, FlaskConical, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, setAuthToken } from '../services/api';

const translations = {
  en: {
    portal: 'ADMIN LOGIN PORTAL',
    heading: 'Sign in to SHaaba System',
    description: 'Enter your administrator credentials to access meter, billing, and customer management.',
    role: 'Super Admin',
    identity: 'USERNAME OR WORK EMAIL',
    identityPlaceholder: 'Enter your username or email',
    password: 'PASSWORD',
    passwordPlaceholder: 'Enter your password',
    forgot: 'Forgot Password?',
    remember: 'Remember Me',
    secure: 'Secure sign-in',
    signIn: 'Sign In to Admin Portal',
    signingIn: 'Signing in...',
    heroTitle: 'Water Billing System for',
    heroHighlight: 'web administration',
    heroTail: 'and customer mobile support.',
    heroDescription: 'SHABA Water Billing System unifies high-precision web-based administration with real-time customer mobile connectivity for meter management, automated billing, and revenue management.',
    badge: 'SHABA BILLING SYSTEM',
    hub: 'Banadir Operations Hub',
    recovery: 'Password recovery is not available here. Please contact your system administrator.',
    footer: 'All rights reserved.',
    company: 'SHABA WATER COMPANY',
    loginError: 'Unable to sign in. Please check your connection and try again.',
    invalidCredentials: 'Invalid username or password.',
    tokenError: 'Login response did not include an authentication token.',
  },
  so: {
    portal: 'GALITAANKA MAAMULKA',
    heading: 'Gal Nidaamka SHaaba',
    description: 'Geli xogtaada si aad u maamusho mitirrada, biilasha iyo macaamiisha.',
    role: 'Maamulaha Guud',
    identity: 'USERNAME AMA EMAIL-KA SHAQADA',
    identityPlaceholder: 'Geli username ama email',
    password: 'FURAHAGA SIRTA',
    passwordPlaceholder: 'Geli furaha sirta',
    forgot: 'Furaha ma illowday?',
    remember: 'I Xasuuso',
    secure: 'Galitaan ammaan ah',
    signIn: 'Gal Bogga Maamulka',
    signingIn: 'Waa la galayaa...',
    heroTitle: 'Nidaamka Biilasha Biyaha ee',
    heroHighlight: 'maamulka webka',
    heroTail: 'iyo adeegga macaamiisha moobilka.',
    heroDescription: 'Nidaamka SHABA wuxuu mideeyaa maamulka webka iyo xiriirka macaamiisha moobilka si loo maareeyo mitirrada, biilasha iyo dakhliga.',
    badge: 'NIDAAMKA SHABA',
    hub: 'Xarunta Hawlgalka Banaadir',
    recovery: 'Adeegga dib-u-dejinta furaha lama heli karo. La xiriir maamulaha nidaamka.',
    footer: 'Dhammaan xuquuqdu way dhowran tahay.',
    company: 'SHIRKADDA BIYAHA SHABA',
    loginError: 'Gelitaanku ma suurtagelin. Hubi internetka oo mar kale isku day.',
    invalidCredentials: 'Username ama furaha sirta waa khalad.',
    tokenError: 'Jawaabta gelitaanku ma wadan token-ka xaqiijinta.',
  },
};

function BrandMark({ compact = false }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full border border-emerald-200/70 bg-white p-1 shadow-md ${compact ? 'h-9 w-9' : 'h-12 w-12'}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
        <circle cx="60" cy="60" r="53" fill="#e3e7fa" stroke="#1b2da6" strokeWidth="9" />
        <path d="M37 37h43v13H68v11h13v6H41v-6h13V50H37z" fill="#6b7581" />
        <path d="M65 67 52 88h28L69 67z" fill="#1b2da6" />
        <path d="M34 77h52l-7 22H41z" fill="#b9c1ca" stroke="#3e4751" strokeWidth="2" />
        <text x="60" y="92" textAnchor="middle" fill="#1b2da6" fontSize="12" fontWeight="900">SHABA</text>
      </svg>
    </span>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false);
  const [language, setLanguage] = useState('en');
  const copy = translations[language];

  useEffect(() => {
    const savedRemember = localStorage.getItem('remember_me') === 'true';
    const savedUsername = localStorage.getItem('remembered_username') || '';
    if (savedRemember) {
      setRememberMe(true);
      setUsername(savedUsername);
    }
  }, []);

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setShowRecoveryHelp(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || copy.invalidCredentials);
        return;
      }

      if (!data.token) {
        setErrorMessage(copy.tokenError);
        return;
      }

      const user = {
        ...data.user,
        name: data.user?.fullName || username.trim(),
      };
      const userRole = data.user?.role || 'admin';

      setAuthToken(data.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', userRole);
      localStorage.setItem('user_role', userRole);
      localStorage.setItem('user_name', user.name);
      if (rememberMe) {
        localStorage.setItem('remember_me', 'true');
        localStorage.setItem('remembered_username', username.trim());
      } else {
        localStorage.removeItem('remember_me');
        localStorage.removeItem('remembered_username');
      }
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Login request failed:', error);
      setErrorMessage(copy.loginError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#0b1338] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(at 0% 0%, rgba(27,45,166,.75) 0, transparent 55%), radial-gradient(at 100% 10%, rgba(22,98,50,.45) 0, transparent 50%), radial-gradient(at 20% 90%, rgba(13,22,80,.95) 0, transparent 65%), radial-gradient(at 85% 85%, rgba(27,45,166,.55) 0, transparent 50%)',
        }}
      />

      <header className="relative z-10 flex min-h-14 items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-7 lg:px-10">
        <div className="flex items-center gap-2.5">
          <BrandMark compact />
          <span className="font-['Archivo',sans-serif] text-xs font-extrabold tracking-wide text-white sm:text-sm">
            {copy.company}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1.5 text-[10px] text-emerald-200 sm:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Shaba Water
          </span>
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5" aria-label="Select language">
            {['en', 'so'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLanguage(option)}
                aria-pressed={language === option}
                className={`rounded px-2.5 py-1 text-[10px] font-medium uppercase ${
                  language === option ? 'bg-[#1b2da6] text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-8 sm:px-7 sm:py-10 lg:px-10">
        <div className="grid w-full grid-cols-1 items-center gap-9 lg:grid-cols-12 lg:gap-12">
          <section className="order-2 flex flex-col justify-center gap-5 lg:order-1 lg:col-span-7 lg:pr-4">
            <div className="inline-flex w-fit items-center gap-2.5 rounded-full border border-indigo-300/30 bg-[#1b2da6]/40 px-3.5 py-1.5 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              <span className="font-['Archivo',sans-serif] text-[9px] font-bold uppercase tracking-widest text-emerald-200 sm:text-[10px]">
                {copy.badge} v2.4
              </span>
              <span className="text-xs text-white/40">|</span>
              <span className="text-[10px] font-medium text-slate-300">{copy.hub}</span>
            </div>

            <h1 className="max-w-3xl font-['Archivo',sans-serif] text-3xl font-black leading-[1.13] tracking-tight text-white sm:text-4xl xl:text-5xl">
              {copy.heroTitle}{' '}
              <span className="bg-gradient-to-r from-emerald-200 via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
                {copy.heroHighlight}
              </span>{' '}
              {copy.heroTail}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-[15px]">
              {copy.heroDescription}
            </p>
            <div className="grid max-w-2xl grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
              <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <h2 className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                  <Droplets size={14} />
                  Web Admin Panel
                </h2>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Manage customers, meters, billing cycles, and reports from one dashboard.
                </p>
              </article>
              <article className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
                <h2 className="mb-1.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                  <UserRound size={14} />
                  Customer Mobile App
                </h2>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Customers can access bills, usage history, and payment information on mobile.
                </p>
              </article>
            </div>
          </section>

          <section className="order-1 flex w-full justify-center lg:order-2 lg:col-span-5 lg:justify-end">
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-200/15 bg-[#0f172a]/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4256c9] via-emerald-200 to-[#1b2da6]" />
              <div className="mb-5 flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="absolute -inset-2 rounded-2xl bg-gradient-to-tr from-[#2c40b8] to-emerald-300 opacity-35 blur-md" />
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/40 bg-slate-900 text-emerald-200 shadow-inner">
                    <FlaskConical size={27} strokeWidth={1.8} />
                  </div>
                </div>
                <span className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
                  {copy.portal}
                </span>
                <h2 className="font-['Archivo',sans-serif] text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  {copy.heading}
                </h2>
                <p className="mt-1.5 max-w-xs text-[11px] leading-relaxed text-slate-400">
                  {copy.description}
                </p>
              </div>

              <div className="mb-4 flex rounded-xl border border-white/10 bg-black/40 p-1 text-[10px] font-semibold">
                <span className="flex-1 rounded-lg bg-[#1b2da6] py-1.5 text-center text-white shadow-sm">
                  {copy.role}
                </span>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {errorMessage && (
                  <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2.5 text-center text-xs font-medium text-rose-200">
                    {errorMessage}
                  </div>
                )}
                {showRecoveryHelp && (
                  <div role="status" className="rounded-lg border border-emerald-300/20 bg-emerald-300/5 px-3 py-2.5 text-xs leading-relaxed text-emerald-100">
                    {copy.recovery}
                  </div>
                )}

                <div>
                  <label htmlFor="login-username" className="mb-1.5 block text-[10px] font-bold tracking-wide text-slate-300">
                    {copy.identity}
                  </label>
                  <div className="relative">
                    <UserRound size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="login-username"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      autoComplete="username"
                      placeholder={copy.identityPlaceholder}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#111927]/90 py-2.5 pl-10 pr-3.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#6b7bd9] focus:ring-2 focus:ring-[#4256c9]/40"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label htmlFor="login-password" className="block text-[10px] font-bold tracking-wide text-slate-300">
                      {copy.password}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryHelp((current) => !current)}
                      className="text-[10px] font-medium text-emerald-200 hover:text-emerald-100 hover:underline"
                      aria-expanded={showRecoveryHelp}
                    >
                      {copy.forgot}
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder={copy.passwordPlaceholder}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#111927]/90 py-2.5 pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#6b7bd9] focus:ring-2 focus:ring-[#4256c9]/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-0 top-0 flex h-full items-center px-3.5 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-0.5">
                  <label className="flex cursor-pointer select-none items-center gap-2 text-[10px] text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                      className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-900 text-[#4256c9] focus:ring-[#4256c9] focus:ring-offset-0"
                    />
                    {copy.remember}
                  </label>
                  <span className="inline-flex items-center gap-1 text-[9px] text-slate-400">
                    <ShieldCheck size={12} className="text-emerald-300" />
                    {copy.secure}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-300/30 bg-gradient-to-r from-[#1b2da6] via-[#2c40b8] to-[#1b2da6] px-4 py-3 font-['Archivo',sans-serif] text-xs font-extrabold text-white shadow-lg shadow-[#0d1650]/50 hover:from-[#121f7a] hover:to-[#121f7a] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                >
                  {isLoading ? copy.signingIn : copy.signIn}
                  {!isLoading && <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />}
                </button>
              </form>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="flex items-center justify-center gap-1.5 text-center text-[9px] text-slate-500">
                  <LockKeyhole size={11} />
                  Your credentials are used only to authenticate your account.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 px-4 py-3 text-[9px] text-slate-400 sm:flex-row sm:px-7 lg:px-10">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#4256c9]" />
          <span>© {new Date().getFullYear()} Shaba Water Company. {copy.footer}</span>
        </div>
        <span className="font-mono text-[8px] text-slate-500">SHABA · ADMIN PORTAL</span>
      </footer>
    </div>
  );
}
