import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  DollarSign,
  FileText,
  Gauge,
  RefreshCw,
  ReceiptText,
  Search,
  TriangleAlert,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { API_BASE } from '../services/api';

const getBillAmount = (bill) => Number(bill.amountDue ?? bill.amount ?? bill.totalAmount ?? 0);

const getBillStatus = (bill) => {
  const status = String(bill.status || 'Pending').toLowerCase();
  if (status === 'paid' || status === 'completed') return 'Paid';
  if (status === 'overdue') return 'Overdue';
  if (status === 'pending' || status === 'unpaid') return 'Pending';
  return bill.status || 'Pending';
};

const getClientName = (bill) =>
  bill.customer?.fullName ||
  bill.customer?.name ||
  bill.customerName ||
  (bill.customerId && typeof bill.customerId === 'object' ? bill.customerId.fullName : null) ||
  'Water client';

const formatCurrency = (amount) =>
  `$${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const formatBillDate = (bill) => {
  const date = bill.createdAt || bill.billDate || bill.dueDate;
  if (!date) return '—';
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? '—'
    : parsedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const statusStyles = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  Pending: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-600/10',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchDashboardPayload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customerResponse, billResponse] = await Promise.all([
        axios.get(`${API_BASE}/customers`, { withCredentials: true }),
        axios.get(`${API_BASE}/billing`, { withCredentials: true }),
      ]);

      if (!Array.isArray(customerResponse.data) || !Array.isArray(billResponse.data)) {
        throw new Error('The dashboard received an unexpected response from the server.');
      }

      setCustomers(customerResponse.data);
      setBills(billResponse.data);
    } catch (requestError) {
      console.error('Failed to load dashboard data:', requestError.message);
      setError('We couldn’t load the latest dashboard data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardPayload();
    window.addEventListener('bills:updated', fetchDashboardPayload);
    return () => window.removeEventListener('bills:updated', fetchDashboardPayload);
  }, [fetchDashboardPayload]);

  const stats = useMemo(() => {
    const paidBills = bills.filter((bill) => getBillStatus(bill) === 'Paid');
    const overdueBills = bills.filter((bill) => getBillStatus(bill) === 'Overdue');
    const revenue = paidBills.reduce((sum, bill) => sum + getBillAmount(bill), 0);
    const outstanding = bills
      .filter((bill) => getBillStatus(bill) !== 'Paid')
      .reduce((sum, bill) => sum + getBillAmount(bill), 0);

    return {
      paidBills,
      overdueBills,
      revenue,
      outstanding,
      paidCount: paidBills.length,
      overdueCount: overdueBills.length,
      collectionRate: bills.length ? Math.round((paidBills.length / bills.length) * 100) : 0,
    };
  }, [bills]);

  const visibleBills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bills
      .filter((bill) => activeFilter === 'All' || getBillStatus(bill) === activeFilter)
      .filter((bill) => {
        if (!query) return true;
        const searchable = [
          getClientName(bill),
          bill.billNumber,
          bill.billNo,
          bill.invoiceNo,
          bill.supplyNo,
          bill.customer?.group,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(query);
      })
      .slice(0, 6);
  }, [activeFilter, bills, searchQuery]);

  const filters = [
    { label: 'All', count: bills.length },
    { label: 'Paid', count: stats.paidCount },
    { label: 'Pending', count: bills.filter((bill) => getBillStatus(bill) === 'Pending').length },
    { label: 'Overdue', count: stats.overdueCount },
  ];

  const metrics = [
    {
      label: 'Total customers',
      value: customers.length.toLocaleString(),
      detail: 'Registered accounts',
      icon: UsersRound,
      iconStyle: 'bg-emerald-100 text-emerald-700',
    },
    {
      label: 'Bills paid',
      value: stats.paidCount.toLocaleString(),
      detail: 'Settled invoices',
      icon: CheckCircle2,
      iconStyle: 'bg-indigo-100 text-indigo-700',
    },
    {
      label: 'Overdue bills',
      value: stats.overdueCount.toLocaleString(),
      detail: 'Needs follow-up',
      icon: TriangleAlert,
      iconStyle: 'bg-rose-100 text-rose-700',
      valueStyle: 'text-rose-700',
    },
    {
      label: 'Revenue collected',
      value: formatCurrency(stats.revenue),
      detail: 'From paid bills',
      icon: DollarSign,
      iconStyle: 'bg-emerald-100 text-emerald-700',
      valueStyle: 'text-indigo-900',
    },
  ];

  const quickActions = [
    { label: 'Add customer', detail: 'Register a new account', icon: UserPlus, path: '/customers' },
    { label: 'Create meter', detail: 'Add a meter reading', icon: Gauge, path: '/meters' },
    { label: 'All bills', detail: 'Review billing records', icon: ReceiptText, path: '/billing' },
    { label: 'New bill', detail: 'Create a customer bill', icon: FileText, path: '/billing' },
  ];

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <div className="min-h-full bg-[#f4f7fc] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Shaba Water · Operations
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1b2da6] sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Ku soo dhowoow shirkadda biyaha ee Shaaba. Here’s your service overview.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">
              <CalendarDays size={17} className="text-emerald-700" />
              <span>{today}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/billing')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1b2da6] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(27,45,166,0.2)] transition hover:bg-[#14238c] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
            >
              <ReceiptText size={17} />
              <span className="hidden sm:inline">Go to billing</span>
              <span className="sm:hidden">Billing</span>
            </button>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2">
              <CircleAlert size={18} />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={fetchDashboardPayload}
              className="self-start font-semibold underline underline-offset-2 sm:self-auto"
            >
              Try again
            </button>
          </div>
        )}

        <section aria-label="Dashboard metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article
                key={metric.label}
                className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_3px_14px_rgba(30,55,90,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(30,55,90,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.09em] text-slate-500">
                      {metric.label}
                    </p>
                    <p className={`mt-2 text-3xl font-extrabold tracking-tight ${metric.valueStyle || 'text-slate-900'}`}>
                      {loading ? <span className="text-slate-300">—</span> : metric.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{metric.detail}</p>
                  </div>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.iconStyle}`}>
                    <Icon size={20} />
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(270px,0.78fr)_minmax(0,1.55fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_3px_14px_rgba(30,55,90,0.045)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Quick actions</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Common tasks, one click away</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#1b2da6]">
                  <ArrowUpRight size={18} />
                </span>
              </div>

              <button
                type="button"
                onClick={() => navigate('/customers')}
                className="mb-3 flex w-full items-center justify-between gap-3 rounded-xl bg-[#1b2da6] px-4 py-3.5 text-left text-white shadow-[0_5px_14px_rgba(27,45,166,0.17)] transition hover:bg-[#14238c] focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2"
              >
                <span>
                  <span className="block text-sm font-bold">Manage customers</span>
                  <span className="mt-0.5 block text-xs text-indigo-100">View and update accounts</span>
                </span>
                <ChevronRight size={18} />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      type="button"
                      key={action.label}
                      onClick={() => navigate(action.path)}
                      className="flex min-h-[112px] flex-col items-start rounded-xl border border-slate-100 bg-[#f7f9fd] p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-emerald-700 shadow-sm">
                        <Icon size={17} />
                      </span>
                      <span className="text-xs font-bold text-slate-800">{action.label}</span>
                      <span className="mt-1 text-[10px] leading-4 text-slate-500">{action.detail}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => navigate('/reports')}
                className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-[#1b2da6]"
              >
                <span className="inline-flex items-center gap-2">
                  <FileText size={15} />
                  Open reports
                </span>
                <ChevronRight size={15} />
              </button>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_3px_14px_rgba(30,55,90,0.045)]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-900">Collection overview</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Payment status across all bills</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <BadgeCheck size={18} />
                </span>
              </div>

              <div className="rounded-xl bg-[#f1f5ff] p-4">
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Bills paid</p>
                    <p className="mt-1 text-2xl font-extrabold text-[#1b2da6]">
                      {loading ? '—' : `${stats.collectionRate}%`}
                    </p>
                  </div>
                  <p className="pb-1 text-xs font-semibold text-slate-500">
                    {stats.paidCount} of {bills.length}
                  </p>
                </div>
                <div
                  className="mt-3 h-2 overflow-hidden rounded-full bg-white"
                  role="progressbar"
                  aria-label="Bills paid"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={stats.collectionRate}
                >
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${stats.collectionRate}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <Clock3 size={13} className="text-indigo-600" />
                    Outstanding
                  </span>
                  <span className="font-bold text-slate-900">{formatCurrency(stats.outstanding)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-3">
                <span className="text-xs font-medium text-slate-600">Overdue bills</span>
                <span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                  {loading ? '—' : stats.overdueCount}
                </span>
              </div>
            </section>
          </div>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_3px_14px_rgba(30,55,90,0.045)]">
            <div className="border-b border-slate-100 p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="font-bold text-slate-900">Recent bills</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Latest billing activity in your system</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative min-w-0 flex-1 lg:w-56 lg:flex-none">
                    <span className="sr-only">Search bills</span>
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search customer or meter"
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={fetchDashboardPayload}
                    disabled={loading}
                    aria-label="Refresh dashboard data"
                    title="Refresh dashboard data"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:text-[#1b2da6] disabled:cursor-wait disabled:opacity-50"
                  >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/billing')}
                    className="hidden shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-[#1b2da6] hover:bg-indigo-50 sm:inline-flex"
                  >
                    View all
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5">
                {filters.map((filter) => (
                  <button
                    type="button"
                    key={filter.label}
                    onClick={() => setActiveFilter(filter.label)}
                    aria-pressed={activeFilter === filter.label}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      activeFilter === filter.label
                        ? 'bg-[#1b2da6] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filter.label} <span className={activeFilter === filter.label ? 'text-indigo-200' : 'text-slate-400'}>({filter.count})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="bg-[#f5f7fb] text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3">Customer / reference</th>
                    <th scope="col" className="px-4 py-3">Service</th>
                    <th scope="col" className="px-4 py-3">Amount</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && bills.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                        Loading billing activity…
                      </td>
                    </tr>
                  ) : visibleBills.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">
                        {bills.length ? 'No bills match your search.' : 'No bills to show yet.'}
                      </td>
                    </tr>
                  ) : (
                    visibleBills.map((bill, index) => {
                      const status = getBillStatus(bill);
                      const customerName = getClientName(bill);
                      const reference = bill.billNumber || bill.billNo || bill.invoiceNo || bill.supplyNo || 'Water bill';
                      const initials = customerName
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')
                        .toUpperCase();
                      return (
                        <tr key={bill._id || bill.billNumber || `${reference}-${index}`} className="transition hover:bg-slate-50/80">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-[#1b2da6]">
                                {initials}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-slate-800">{customerName}</span>
                                <span className="mt-0.5 block truncate text-[10px] text-slate-500">{reference}</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-600">
                            {bill.customer?.group || bill.group || (bill.supplyNo ? `Meter ${bill.supplyNo}` : 'Water service')}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs font-bold text-slate-800">
                            {formatCurrency(getBillAmount(bill))}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset ${statusStyles[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10'}`}>
                              {status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">
                            {formatBillDate(bill)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 bg-[#fbfcfe] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] text-slate-500">
                Showing {Math.min(visibleBills.length, 6)} of {bills.length} bills
              </p>
              <button
                type="button"
                onClick={() => navigate('/billing')}
                className="inline-flex items-center gap-1 self-start text-xs font-bold text-[#1b2da6] hover:text-indigo-800 sm:self-auto"
              >
                Open billing
                <ChevronRight size={14} />
              </button>
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3.5 sm:flex-row sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BadgeCheck size={18} />
          </span>
          <div>
            <p className="text-xs font-bold text-emerald-950">Dashboard data</p>
            <p className="mt-0.5 text-xs leading-5 text-emerald-900/80">
              Customer and billing totals are based on saved records. Use refresh to check for the latest updates.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
