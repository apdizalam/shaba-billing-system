import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  Headset,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { API_BASE } from '../services/api';
import Modal from '../components/Modal';

const PAGE_SIZE = 6;
const INITIAL_FORM = {
  fullName: '',
  email: '',
  phoneNumber: '',
  username: '',
  password: '',
};
const PHONE_REGEX = /^(\+252|0)?(61|62|63|65|67|68|69)\d{7}$/;

const getName = (manager) => manager.fullName || manager.name || 'Unnamed manager';
const getPhone = (manager) => manager.phone || manager.phoneNumber || '';
const getUsername = (manager) => String(manager.username || '').replace(/^@/, '');
const getStatus = (manager) => {
  if (manager.isActive === false) return 'Inactive';
  if (manager.isActive === true) return 'Active';
  return String(manager.registrationStatus || '').toLowerCase() === 'active' ? 'Active' : 'Inactive';
};
const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const downloadManagersCsv = (managers) => {
  const headers = ['Full Name', 'Email', 'Phone', 'Username', 'Status', 'Created At'];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = managers.map((manager) => [
    getName(manager),
    manager.email || '',
    getPhone(manager),
    getUsername(manager),
    getStatus(manager),
    manager.createdAt || '',
  ]);
  const csv = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'shaba-managers.csv';
  link.click();
  URL.revokeObjectURL(url);
};

function StatusBadge({ status }) {
  const active = status === 'Active';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
      active ? 'border border-emerald-200 bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-600' : 'bg-slate-400'}`} />
      {active ? 'Firfircoon' : 'Aan firfircoonayn'}
    </span>
  );
}

export default function RegisterManagerPage() {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [managerFormData, setManagerFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE}/managers`, { withCredentials: true });
      setManagers(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      console.error('Failed to load managers:', fetchError.message);
      setManagers([]);
      setError('Could not load managers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const filteredManagers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return managers.filter((manager) => {
      const matchesStatus = statusFilter === 'All' || getStatus(manager) === statusFilter;
      const matchesSearch =
        !query ||
        [getName(manager), manager.email, getPhone(manager), getUsername(manager)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [managers, search, statusFilter]);

  const activeCount = managers.filter((manager) => getStatus(manager) === 'Active').length;
  const inactiveCount = managers.length - activeCount;
  const pageCount = Math.max(1, Math.ceil(filteredManagers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleManagers = filteredManagers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const recentManagers = [...managers]
    .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
    .slice(0, 4);

  const openNewManager = () => {
    setManagerFormData(INITIAL_FORM);
    setIsEditing(false);
    setEditingId('');
    setFormMessage('');
    setIsModalOpen(true);
  };

  const handleEdit = (manager) => {
    setManagerFormData({
      fullName: manager.fullName || manager.name || '',
      email: manager.email || '',
      phoneNumber: getPhone(manager),
      username: getUsername(manager),
      password: '',
    });
    setEditingId(manager._id);
    setIsEditing(true);
    setFormMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { fullName, email, phoneNumber, username, password } = managerFormData;
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !username.trim()) {
      setFormMessage('Full name, email, phone number, and username are required.');
      return;
    }
    const compactPhone = phoneNumber.trim().replace(/[\s-]/g, '');
    if (!PHONE_REGEX.test(compactPhone)) {
      setFormMessage('Enter a valid Somali phone number, for example +252 61 234 5678.');
      return;
    }
    if (!isEditing && !password) {
      setFormMessage('Password is required for a new manager.');
      return;
    }

    let normalizedPhone = compactPhone;
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = normalizedPhone.replace(/^0/, '+252');
    } else if (!normalizedPhone.startsWith('+252')) {
      normalizedPhone = `+252${normalizedPhone}`;
    }

    const payload = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: normalizedPhone,
      username: username.trim(),
      ...(password ? { password } : {}),
    };

    setSaving(true);
    setFormMessage('');
    try {
      if (isEditing) {
        await axios.put(`${API_BASE}/managers/${editingId}`, payload, { withCredentials: true });
        setNotice('Manager details updated.');
      } else {
        await axios.post(`${API_BASE}/managers`, payload, { withCredentials: true });
        setNotice('Manager registered successfully.');
      }
      setIsModalOpen(false);
      setManagerFormData(INITIAL_FORM);
      await fetchManagers();
      window.setTimeout(() => setNotice(''), 3500);
    } catch (saveError) {
      console.error('Failed to save manager:', saveError.message);
      setFormMessage(saveError.response?.data?.message || 'Failed to save manager.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (manager) => {
    if (!manager._id) return;
    if (!window.confirm(`Delete manager account for ${getName(manager)}?`)) return;

    setDeletingId(manager._id);
    setNotice('');
    try {
      await axios.delete(`${API_BASE}/managers/${manager._id}`, { withCredentials: true });
      setManagers((previous) => previous.filter((item) => item._id !== manager._id));
      setNotice(`${getName(manager)} was deleted.`);
      window.setTimeout(() => setNotice(''), 3500);
    } catch (deleteError) {
      console.error('Failed to delete manager:', deleteError.message);
      setNotice(deleteError.response?.data?.message || 'Failed to delete manager.');
      window.setTimeout(() => setNotice(''), 4500);
    } finally {
      setDeletingId('');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setPage(1);
  };

  return (
    <div className="min-h-full bg-[#f6f9ff] px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <section className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-xs font-bold text-slate-800">Maamulka Amniga Akoonnada · Account security</h2>
              <p className="mt-0.5 text-[10px] leading-4 text-slate-600">
                Maareeyayaasha waxaa loo sameeyaa akoonno gaar ah. Xogta 2FA iyo diiwaanka gelitaanka lama heli karo nidaamkan.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-semibold text-slate-600 sm:self-auto">
            <Users size={11} />
            Manager account records
          </span>
        </section>

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1b2da6]">
              Maamulka Guud · Manager Administration
            </div>
            <h1 className="font-['Archivo',sans-serif] text-2xl font-extrabold tracking-tight text-[#0e1430] sm:text-3xl">
              Diiwaangelinta &amp; Maamulka Maareeyayaasha
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Maamul koontooyinka, rukhsadaha nidaamka, iyo xogta xiriirka ee maareeyayaasha Shaba Water.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchManagers}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => downloadManagersCsv(filteredManagers)}
              disabled={!filteredManagers.length}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1b2da6] transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <Download size={14} />
              Dhoofi Liiska (CSV)
            </button>
            <button
              type="button"
              onClick={openNewManager}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1b2da6] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#121f7a]"
            >
              <UserPlus size={15} />
              + Ku Dar Maareeye Cusub
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
              error || notice.toLowerCase().includes('failed')
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-indigo-100 bg-white text-slate-600'
            }`}
          >
            <span>{error || notice}</span>
            {notice && !error && (
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
                <X size={15} />
              </button>
            )}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wadarta Maareeyayaasha</span>
              <span className="rounded-xl bg-[#edf1ff] p-2 text-[#1b2da6]"><Users size={17} /></span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <strong className="font-['Archivo',sans-serif] text-3xl font-extrabold text-[#0e1430]">
                {loading ? '—' : managers.length.toLocaleString()}
              </strong>
              <span className="rounded-full bg-[#f2f4fd] px-2 py-0.5 text-[9px] font-semibold text-[#1b2da6]">Accounts</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Manager accounts in the directory</p>
          </article>
          <article className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kalfadhiyada Firfircoon</span>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Activity size={17} /></span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <strong className="font-['Archivo',sans-serif] text-3xl font-extrabold text-emerald-700">
                {loading ? '—' : activeCount.toLocaleString()}
              </strong>
              <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[9px] font-semibold text-emerald-800">Enabled</span>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Accounts marked active
            </p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Amniga 2FA / TOTP</span>
              <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><BadgeCheck size={17} /></span>
            </div>
            <div className="mt-3 font-['Archivo',sans-serif] text-3xl font-extrabold text-slate-700">Not configured</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-0 rounded-full bg-emerald-600" />
            </div>
            <p className="mt-2 text-[10px] text-slate-500">2FA enrollment data is not available</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Xogta Ugu Dambaysay</span>
              <span className="rounded-xl bg-[#edf1ff] p-2 text-[#1b2da6]"><CalendarClock size={17} /></span>
            </div>
            <div className="mt-3 font-['Archivo',sans-serif] text-2xl font-extrabold text-[#1b2da6]">
              {recentManagers[0]?.createdAt ? formatDate(recentManagers[0].createdAt) : '—'}
            </div>
            <p className="mt-2 truncate text-[10px] text-slate-500">
              {recentManagers[0] ? `Latest account: ${getName(recentManagers[0])}` : 'No manager account activity'}
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
          <div className="flex flex-col gap-3 xl:col-span-8">
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Search managers"
                  placeholder="Raadi magac, email, telefoon ama username..."
                  className="w-full rounded-xl border border-slate-100 bg-[#f6f9ff] py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#1b2da6] focus:bg-white focus:ring-2 focus:ring-[#1b2da6]/10"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter managers by status"
                className="rounded-xl border border-slate-100 bg-[#f6f9ff] px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#1b2da6]"
              >
                <option value="All">Dhammaan Xaaladaha</option>
                <option value="Active">Firfircoon</option>
                <option value="Inactive">Aan firfircoonayn</option>
              </select>
              <button
                type="button"
                onClick={resetFilters}
                title="Reset filters"
                aria-label="Reset filters"
                className="flex h-10 w-10 items-center justify-center self-end rounded-xl bg-[#f6f9ff] text-slate-600 transition hover:bg-[#e3e7fa] sm:self-auto"
              >
                <RefreshCw size={15} />
              </button>
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 bg-[#fbfcff] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-sm font-bold text-[#0e1430]">Liiska Maareeyayaasha Diiwaangashan</h2>
                  <span className="rounded-full bg-[#1b2da6] px-2.5 py-0.5 text-[9px] font-bold text-white">
                    {filteredManagers.length} muuqda
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Account directory</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[790px] border-collapse text-left">
                  <thead className="bg-[#f3f6fb] text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Magaca &amp; Doorka</th>
                      <th className="px-3 py-3">Email &amp; Xiriirka</th>
                      <th className="px-3 py-3">Magaca Gudaha</th>
                      <th className="px-3 py-3">Laanta / Degmada</th>
                      <th className="px-3 py-3 text-center">Xaaladda</th>
                      <th className="px-3 py-3 text-center">Amniga</th>
                      <th className="px-4 py-3 text-right">Ficillada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                    {loading ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Loading managers...</td></tr>
                    ) : error ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-rose-600">{error}</td></tr>
                    ) : visibleManagers.length ? (
                      visibleManagers.map((manager, index) => {
                        const name = getName(manager);
                        return (
                          <tr key={manager._id || manager.username} className="transition hover:bg-[#f6f9ff]">
                            <td className="min-w-[185px] px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                  index % 3 === 1 ? 'bg-emerald-100 text-emerald-800' : index % 3 === 2 ? 'bg-slate-200 text-slate-700' : 'bg-[#e3e7fa] text-[#1b2da6]'
                                }`}>
                                  {getInitials(name)}
                                </span>
                                <span className="min-w-0">
                                  <span className="block max-w-[155px] truncate font-bold text-[#0e1430]">{name}</span>
                                  <span className="mt-0.5 inline-block rounded bg-[#f2f4fd] px-1.5 py-0.5 text-[8px] font-semibold text-[#1b2da6]">
                                    Manager
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td className="min-w-[160px] px-3 py-3">
                              <span className="block max-w-[160px] truncate font-medium text-slate-800">{manager.email || '—'}</span>
                              <span className="mt-0.5 block text-[9px] text-slate-500">{getPhone(manager) || '—'}</span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="rounded bg-slate-100 px-2 py-1 font-mono text-[9px] font-medium text-slate-700">
                                {getUsername(manager) || '—'}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <span className="block text-[10px] font-semibold text-slate-700">Not assigned</span>
                              <span className="text-[9px] text-slate-400">Branch data unavailable</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-center"><StatusBadge status={getStatus(manager)} /></td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-500">
                                <CircleAlert size={11} />
                                Not configured
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(manager)}
                                  aria-label={`Edit ${name}`}
                                  title="Edit manager"
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-indigo-50 hover:text-[#1b2da6]"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(manager)}
                                  disabled={deletingId === manager._id}
                                  aria-label={`Delete ${name}`}
                                  title="Delete manager"
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No managers match your search.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#fbfcff] px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {filteredManagers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                  {Math.min(currentPage * PAGE_SIZE, filteredManagers.length)} of {filteredManagers.length} managers
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                    aria-label="Previous page"
                    className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="rounded-md bg-[#1b2da6] px-2.5 py-1.5 font-semibold text-white">{currentPage}</span>
                  <span className="px-1">/ {pageCount}</span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    disabled={currentPage === pageCount}
                    aria-label="Next page"
                    className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[#1b2da6]">Maamulka Xeerarka &amp; Rukhsadaha (RBAC)</h2>
                  <p className="mt-1 text-[10px] text-slate-500">Manager accounts use the existing manager access role.</p>
                </div>
                <ShieldCheck size={20} className="text-[#1b2da6]" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-[#f6f9ff] p-3">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-emerald-700">Super Admin</span>
                  <p className="text-[10px] leading-4 text-slate-600">Full system administration and account management.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-[#f6f9ff] p-3">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-[#1b2da6]">Manager</span>
                  <p className="text-[10px] leading-4 text-slate-600">Access is governed by the manager role in the current system.</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-[#f6f9ff] p-3">
                  <span className="mb-1 block text-[9px] font-bold uppercase tracking-wider text-slate-600">Branch access</span>
                  <p className="text-[10px] leading-4 text-slate-600">Branch-specific roles are not configured in the manager API.</p>
                </div>
              </div>
            </section>
          </div>

          <aside className="flex flex-col gap-3 xl:col-span-4">
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-800">Dhaqdhaqaaqa Maareeyayaasha</h2>
                </div>
                <span className="text-[9px] font-semibold text-slate-500">Based on account records</span>
              </div>
              {recentManagers.length ? (
                <div className="space-y-3">
                  {recentManagers.map((manager) => (
                    <div key={manager._id || manager.username} className="flex items-start gap-2.5 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                        <UserPlus size={13} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] leading-4 text-slate-700">
                          Manager account: <strong className="text-slate-900">{getName(manager)}</strong>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500">
                          <CalendarClock size={11} />
                          Registered {formatDate(manager.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-[#f6f9ff] p-3 text-[10px] text-slate-500">
                  {loading ? 'Loading account activity...' : 'No manager account records are available.'}
                </p>
              )}
              <p className="mt-3 border-t border-slate-100 pt-3 text-[9px] leading-4 text-slate-500">
                A security audit log, login history, and IP addresses are not provided by the current API.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-[#1b2da6]">
                  <Headset size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Taageerada Nidaamka IT-ga</h2>
                  <p className="mt-1 text-[10px] leading-4 text-slate-500">
                    For access or account support, contact your system administrator.
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-[#1b2da6]">
                    <Mail size={12} />
                    Contact your system administrator
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-[#1b2da6]" />
                <h2 className="text-xs font-bold text-slate-800">Manager directory summary</h2>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-[#f6f9ff] px-3 py-2.5 text-[10px]">
                <span className="text-slate-600">Active manager accounts</span>
                <span className="font-bold text-emerald-700">{activeCount}</span>
              </div>
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[#f6f9ff] px-3 py-2.5 text-[10px]">
                <span className="text-slate-600">Inactive manager accounts</span>
                <span className="font-bold text-slate-600">{inactiveCount}</span>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormMessage('');
        }}
        title={isEditing ? 'Edit manager account' : 'Diiwaangelinta Maareeyaha Cusub'}
        maxWidth="max-w-xl"
      >
        {formMessage && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            {formMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3.5" autoComplete="off">
          <p className="text-xs leading-5 text-slate-500">
            Enter the manager account details. Passwords are never displayed in the manager list or CSV export.
          </p>
          <label className="block text-xs font-semibold text-slate-700">
            Magaca oo Buuxa
            <input
              type="text"
              value={managerFormData.fullName}
              onChange={(event) => setManagerFormData((previous) => ({ ...previous, fullName: event.target.value }))}
              required
              autoComplete="off"
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#f6f9ff] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#1b2da6] focus:bg-white"
              placeholder="Full name"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              Email
              <input
                type="email"
                value={managerFormData.email}
                onChange={(event) => setManagerFormData((previous) => ({ ...previous, email: event.target.value }))}
                required
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#f6f9ff] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#1b2da6] focus:bg-white"
                placeholder="email@shaaba.com"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Telefoonka
              <input
                type="tel"
                value={managerFormData.phoneNumber}
                onChange={(event) => setManagerFormData((previous) => ({ ...previous, phoneNumber: event.target.value }))}
                required
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#f6f9ff] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#1b2da6] focus:bg-white"
                placeholder="+252 61..."
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-700">
              Username
              <input
                type="text"
                value={managerFormData.username}
                onChange={(event) => setManagerFormData((previous) => ({ ...previous, username: event.target.value }))}
                required
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#f6f9ff] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#1b2da6] focus:bg-white"
                placeholder="Username"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Password {isEditing ? '(leave blank to keep current)' : ''}
              <input
                type="password"
                value={managerFormData.password}
                onChange={(event) => setManagerFormData((previous) => ({ ...previous, password: event.target.value }))}
                required={!isEditing}
                autoComplete="new-password"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#f6f9ff] px-3.5 py-2.5 text-sm font-normal outline-none focus:border-[#1b2da6] focus:bg-white"
                placeholder={isEditing ? 'Optional' : 'Set a password'}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1b2da6] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#121f7a] disabled:opacity-50"
            >
              {isEditing ? <Pencil size={13} /> : <Plus size={14} />}
              {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Register manager'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
