import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Droplet,
  Gauge,
  LayoutDashboard,
  LogOut,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useProfile } from '../contexts/ProfileContext';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export default function Sidebar({ collapsed = false, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profileImage } = useProfile();
  const [adminUser, setAdminUser] = useState(readStoredUser);

  const role =
    adminUser.role ||
    localStorage.getItem('role') ||
    localStorage.getItem('userRole') ||
    'admin';
  const adminName =
    adminUser.name ||
    adminUser.fullName ||
    (role === 'manager' ? 'Shaba Manager' : 'Admin User');
  const adminEmail = adminUser.email || (role === 'manager' ? 'Manager account' : 'Administrator');
  const avatar = adminUser.avatar || (profileImage !== '/profile.jpg' ? profileImage : '');
  const initials = adminName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    const syncProfile = () => setAdminUser(readStoredUser());
    syncProfile();
    window.addEventListener('storage_profile_updated', syncProfile);
    return () => window.removeEventListener('storage_profile_updated', syncProfile);
  }, []);

  const allNav = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { key: 'customers', label: 'Customers', path: '/customers', icon: UsersRound },
    { key: 'meters', label: 'Meters', path: '/meters', icon: Gauge },
    { key: 'billing', label: 'Billing', path: '/billing', icon: CreditCard },
    { key: 'reports', label: 'Reports', path: '/reports', icon: BarChart3 },
    { key: 'managers', label: 'Manager registration', path: '/managers/register', icon: UserPlus },
  ];

  const navItems =
    role === 'manager'
      ? allNav.filter((item) => item.key !== 'reports' && item.key !== 'managers')
      : allNav;

  const handleSignOut = () => {
    [
      'token',
      'role',
      'userRole',
      'userFullName',
      'username',
      'userEmail',
      'user_role',
      'user_name',
      'user',
    ].forEach((key) => localStorage.removeItem(key));
    navigate('/login', { replace: true });
  };

  return (
    <aside
      data-app-sidebar
      className={`print:hidden fixed inset-y-0 left-0 z-40 flex min-h-screen w-full max-w-[85vw] flex-col border-r border-slate-100 bg-white shadow-xl transition-transform md:static md:w-64 md:shrink-0 md:shadow-sm ${
        collapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
        <Link
          to="/dashboard"
          onClick={() => onClose?.()}
          className="flex min-w-0 items-center gap-3"
          aria-label="Shaba Water dashboard"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1b2da6] text-white shadow-[0_4px_12px_rgba(27,45,166,0.2)]">
            <Droplet size={21} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold tracking-tight text-[#1b2da6]">
              Shaba Water
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
              {role === 'manager' ? 'Manager portal' : 'Admin portal'}
            </span>
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 md:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="px-5 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Administrative menu
      </div>
      <nav aria-label="Main navigation" className="flex-1 space-y-1 px-3 pb-5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => onClose?.()}
              aria-current={isActive ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                isActive
                  ? 'bg-[#1b2da6] text-white shadow-[0_4px_12px_rgba(27,45,166,0.16)]'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-[#1b2da6]'
              }`}
            >
              <Icon
                size={18}
                className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#1b2da6]'}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 bg-[#f7f9fd] p-3">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:border-indigo-100"
        >
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-xs font-bold text-[#1b2da6]">
            {initials}
            {avatar && (
              <img
                src={avatar}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-slate-800">{adminName}</span>
            <span className="mt-0.5 block truncate text-[10px] text-slate-500">{adminEmail}</span>
          </span>
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
        >
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
