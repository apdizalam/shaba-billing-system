import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProfile } from '../contexts/ProfileContext';

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const routeLabels = {
  '/dashboard': 'Dashboard',
  '/customers': 'Customers',
  '/meters': 'Meters',
  '/billing': 'Billing',
  '/reports': 'Reports',
  '/managers/register': 'Manager registration',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

export default function Header({ toggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileImage } = useProfile();
  const [adminUser, setAdminUser] = useState(readStoredUser);

  useEffect(() => {
    const syncProfile = () => setAdminUser(readStoredUser());
    syncProfile();
    window.addEventListener('storage_profile_updated', syncProfile);
    return () => window.removeEventListener('storage_profile_updated', syncProfile);
  }, []);

  const role =
    adminUser.role ||
    localStorage.getItem('role') ||
    localStorage.getItem('userRole') ||
    'admin';
  const adminName =
    adminUser.name ||
    adminUser.fullName ||
    (role === 'manager' ? 'Shaba Manager' : 'Admin User');
  const avatar = adminUser.avatar || (profileImage !== '/profile.jpg' ? profileImage : '');
  const initials = adminName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());
  const pageLabel = routeLabels[location.pathname] || 'Admin workspace';

  return (
    <header
      data-app-header
      className="print:hidden sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-4 border-b border-slate-100 bg-white/95 px-4 shadow-[0_2px_8px_rgba(25,45,80,0.035)] backdrop-blur sm:px-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-indigo-50 hover:text-[#1b2da6] md:hidden"
          aria-label="Open navigation"
        >
          <Menu size={19} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">
            Shaba Water · Administration
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{pageLabel}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <span className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {today}
        </span>
        <span className="h-7 w-px bg-slate-200" />
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-slate-50"
          aria-label={`Open ${adminName}'s profile`}
        >
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-xs font-bold text-[#1b2da6]">
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
          <span className="hidden max-w-36 truncate text-xs font-semibold text-slate-700 sm:block">
            {adminName}
          </span>
        </button>
      </div>
    </header>
  );
}
