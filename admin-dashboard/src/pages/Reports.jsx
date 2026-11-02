import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileDown,
  FileText,
  MapPin,
  Printer,
  Search,
  Waves,
  X,
} from 'lucide-react';
import { API_BASE } from '../services/api';

const PAGE_SIZE = 7;

const getCustomer = (bill) => bill.customerId || bill.customer || null;
const getCustomerName = (bill) => {
  const customer = getCustomer(bill);
  return (
    bill.customerName ||
    (typeof customer === 'object' ? customer?.fullName || customer?.name : '') ||
    'Water Client'
  );
};
const getCustomerAddress = (bill) => {
  const customer = getCustomer(bill);
  return typeof customer === 'object' ? customer?.address || '' : '';
};
const getSupplyNo = (bill) => bill.supplyNo || bill.supply || bill.meterNumber || '';
const getInvoiceId = (bill) =>
  bill.invoiceNo ||
  bill.billId ||
  (bill._id ? `INV-${bill._id.slice(-8).toUpperCase()}` : 'SHB-INV');
const getAmount = (bill) => Number(bill.amountDue ?? bill.totalAmount ?? bill.amount ?? 0) || 0;
const getUnits = (bill) => Number(bill.unitsConsumed ?? bill.unitsUsed ?? bill.units ?? 0) || 0;
const getBillDate = (bill) => bill.billDate || bill.createdAt || bill.currDate || bill.currentDate || '';
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const formatDate = (value) => {
  const date = toDate(value);
  return date
    ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
};
const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const getDistrict = (bill) => getCustomerAddress(bill).split(/[,\n]/)[0].trim();
const getStatus = (bill) => {
  const status = String(bill.status || '').toLowerCase();
  if (status === 'paid' || status === 'completed') return 'Paid';
  if (status === 'overdue') return 'Overdue';
  const dueDate = toDate(bill.dueDate);
  return dueDate && dueDate < new Date() ? 'Overdue' : 'Pending';
};
const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const exportCsv = (filename, bills) => {
  const headers = [
    'Customer',
    'District',
    'Invoice',
    'Supply No.',
    'Usage (m3)',
    'Amount (USD)',
    'Bill Date',
    'Status',
  ];
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = bills.map((bill) => [
    getCustomerName(bill),
    getDistrict(bill),
    getInvoiceId(bill),
    getSupplyNo(bill),
    getUnits(bill),
    getAmount(bill),
    getBillDate(bill),
    getStatus(bill),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function StatusBadge({ status }) {
  const styles = {
    Paid: 'bg-emerald-100 text-emerald-800',
    Pending: 'bg-indigo-100 text-indigo-800',
    Overdue: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'Paid' ? 'bg-emerald-600' : status === 'Overdue' ? 'bg-orange-600' : 'bg-indigo-600'}`} />
      {status === 'Paid' ? 'La Bixiyay' : status === 'Overdue' ? 'Dib u Dhacay' : 'Sugaya Xisaab'}
    </span>
  );
}

const REPORT_TABS = [
  { key: 'all', label: 'Dhammaan Warbixinada (All Reports)' },
  { key: 'revenue', label: 'Dakhliga & Biilasha (Revenue & Billing)' },
  { key: 'usage', label: 'Isticmaalka Biyaha (Telemetry & m³)' },
  { key: 'district', label: 'Degmooyinka Muqdisho (District Audits)' },
  { key: 'overdue', label: 'Lumidda & Dayactirka (Loss & Leakage)' },
];

export default function Reports() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_BASE}/billing`, { withCredentials: true });
      setBills(Array.isArray(response.data) ? response.data : []);
    } catch (fetchError) {
      console.error('Failed to load report billing records:', fetchError.message);
      setError('Could not load report data. Please try again.');
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
    window.addEventListener('bills:updated', fetchBills);
    return () => window.removeEventListener('bills:updated', fetchBills);
  }, [fetchBills]);

  const districts = [...new Set(bills.map(getDistrict).filter(Boolean))].sort();
  const scopedBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    return bills.filter((bill) => {
      const billDate = toDate(getBillDate(bill));
      const matchesDate = (!start || (billDate && billDate >= start)) && (!end || (billDate && billDate <= end));
      const matchesDistrict = !districtFilter || getDistrict(bill).toLowerCase() === districtFilter.toLowerCase();
      const status = getStatus(bill);
      const matchesStatus = !statusFilter || status === statusFilter;
      const matchesSearch =
        !query ||
        [
          getCustomerName(bill),
          getInvoiceId(bill),
          bill.billId,
          getSupplyNo(bill),
          getCustomerAddress(bill),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesTab = activeTab !== 'overdue' || status === 'Overdue';
      return matchesDate && matchesDistrict && matchesStatus && matchesSearch && matchesTab;
    });
  }, [bills, search, startDate, endDate, districtFilter, statusFilter, activeTab]);

  const statusCounts = useMemo(() => {
    const result = { All: scopedBills.length, Paid: 0, Overdue: 0, Pending: 0 };
    scopedBills.forEach((bill) => {
      result[getStatus(bill)] += 1;
    });
    return result;
  }, [scopedBills]);
  const totalRevenue = scopedBills.reduce((sum, bill) => sum + getAmount(bill), 0);
  const paidBills = scopedBills.filter((bill) => getStatus(bill) === 'Paid');
  const overdueBills = scopedBills.filter((bill) => getStatus(bill) === 'Overdue');
  const paidRevenue = paidBills.reduce((sum, bill) => sum + getAmount(bill), 0);
  const overdueAmount = overdueBills.reduce((sum, bill) => sum + getAmount(bill), 0);
  const totalUsage = scopedBills.reduce((sum, bill) => sum + getUnits(bill), 0);
  const paidRate = scopedBills.length ? (paidBills.length / scopedBills.length) * 100 : 0;
  const pageCount = Math.max(1, Math.ceil(scopedBills.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleBills = scopedBills.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const districtRevenue = useMemo(() => {
    const totals = new Map();
    scopedBills.forEach((bill) => {
      const district = getDistrict(bill) || 'Degmo lama diiwaangelin';
      const entry = totals.get(district) || { amount: 0, count: 0 };
      entry.amount += getAmount(bill);
      entry.count += 1;
      totals.set(district, entry);
    });
    return [...totals.entries()].sort((first, second) => second[1].amount - first[1].amount);
  }, [scopedBills]);

  const clearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setDistrictFilter('');
    setStatusFilter('');
    setActiveTab('all');
    setPage(1);
  };

  const printInvoice = (bill) => {
    const invoiceWindow = window.open('', '_blank');
    if (!invoiceWindow) {
      setNotice('Allow pop-ups to print an invoice.');
      return;
    }
    const escapeHtml = (value) =>
      String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]);
    invoiceWindow.document.write(`
      <!doctype html>
      <html><head><title>${escapeHtml(getInvoiceId(bill))} · Shaba Water</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e242b;padding:36px}
        main{max-width:640px;margin:auto;border:1px solid #e6eaee;border-radius:16px;padding:28px}
        h1{color:#1b2da6;margin:0 0 24px}p{display:flex;justify-content:space-between;border-bottom:1px solid #e6eaee;padding:10px 0}
      </style></head>
      <body><main><h1>Shaba Water · Invoice</h1>
      <p><strong>Invoice</strong><span>${escapeHtml(getInvoiceId(bill))}</span></p>
      <p><strong>Customer</strong><span>${escapeHtml(getCustomerName(bill))}</span></p>
      <p><strong>Supply number</strong><span>${escapeHtml(getSupplyNo(bill) || '—')}</span></p>
      <p><strong>Usage</strong><span>${escapeHtml(getUnits(bill))} m³</span></p>
      <p><strong>Billing period</strong><span>${escapeHtml(bill.period || '—')}</span></p>
      <p><strong>Bill date</strong><span>${escapeHtml(formatDate(getBillDate(bill)))}</span></p>
      <p><strong>Status</strong><span>${escapeHtml(getStatus(bill))}</span></p>
      <p><strong>Amount due</strong><span>${escapeHtml(formatMoney(getAmount(bill)))}</span></p>
      </main><script>window.onload=()=>window.print();</script></body></html>
    `);
    invoiceWindow.document.close();
  };

  const exportNamedReport = (name, subset = scopedBills) => {
    exportCsv(`shaba-${name}-report.csv`, subset);
    setNotice(`${name} report downloaded.`);
    window.setTimeout(() => setNotice(''), 3500);
  };

  return (
    <div className="min-h-full bg-[#f6f9ff] px-4 py-6 sm:px-6 lg:px-8">
      <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#1b2da6]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1b2da6]" />
              Maamulka Warbixinada · System Reports &amp; Analytics
            </div>
            <h1 className="font-['Archivo',sans-serif] text-2xl font-extrabold tracking-tight text-[#0e1430] sm:text-3xl">
              Warbixinada Guud ee Nidaamka
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Falanqaynta dakhliga, isticmaalka biyaha, xaaladda biilasha, iyo xogta macaamiisha degmada Muqdisho.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportNamedReport('system')}
              disabled={!scopedBills.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1b2da6] shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <Download size={15} />
              Soo Deji Excel / CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              <Printer size={15} />
              Daabac (Print)
            </button>
          </div>
        </div>

        {(error || notice) && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
              error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-indigo-100 bg-white text-slate-600'
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
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dakhliga Guud &amp; Ururinta</span>
              <span className="rounded-lg bg-[#edf1ff] p-2 text-[#1b2da6]"><CircleDollarSign size={17} /></span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <strong className="font-['Archivo',sans-serif] text-2xl font-extrabold text-[#0e1430]">{formatMoney(paidRevenue)}</strong>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-800">
                {paidRate.toFixed(1)}% collected
              </span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">From {paidBills.length.toLocaleString()} paid bills</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Biyaha La Qaybiyay</span>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Waves size={17} /></span>
            </div>
            <div className="mt-3 font-['Archivo',sans-serif] text-2xl font-extrabold text-[#0e1430]">
              {totalUsage.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Recorded consumption · {scopedBills.length.toLocaleString()} bills</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Xaaladda Biilasha</span>
              <span className="rounded-lg bg-orange-50 p-2 text-orange-700"><AlertTriangle size={17} /></span>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <strong className="font-['Archivo',sans-serif] text-2xl font-extrabold text-[#0e1430]">
                {statusCounts.Paid.toLocaleString()} <span className="text-sm font-medium text-slate-500">/ {scopedBills.length.toLocaleString()}</span>
              </strong>
              <span className="rounded-full bg-orange-50 px-2 py-1 text-[9px] font-bold text-orange-800">{formatMoney(overdueAmount)} overdue</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">{statusCounts.Overdue} overdue · {statusCounts.Pending} pending</p>
          </article>
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Collection Rate</span>
              <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><CheckCircle2 size={17} /></span>
            </div>
            <div className="mt-3 font-['Archivo',sans-serif] text-2xl font-extrabold text-[#0e1430]">{paidRate.toFixed(1)}%</div>
            <p className="mt-2 text-[10px] text-slate-500">
              Amount billed: {formatMoney(totalRevenue)} · Water-loss telemetry unavailable
            </p>
          </article>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
            {REPORT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                aria-pressed={activeTab === tab.key}
                className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[10px] font-semibold transition sm:px-4 sm:text-xs ${
                  activeTab === tab.key
                    ? 'border-[#1b2da6] text-[#1b2da6]'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-[#1b2da6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative md:col-span-2">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Search reports"
                  placeholder="Raadi magaca macmiilka, lambarka biilka ama meeterka..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-[#1b2da6] focus:ring-2 focus:ring-[#1b2da6]/10"
                />
              </label>
              <label className="relative">
                <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Report start date"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-2 text-[11px] outline-none focus:border-[#1b2da6]"
                />
              </label>
              <label className="relative">
                <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Report end date"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-2 text-[11px] outline-none focus:border-[#1b2da6]"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0 text-slate-400" />
                <select
                  value={districtFilter}
                  onChange={(event) => {
                    setDistrictFilter(event.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter reports by district"
                  className="w-full rounded-xl bg-[#f6f9ff] px-3 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/10"
                >
                  <option value="">Dhammaan Degmooyinka</option>
                  {districts.map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
              </label>
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter reports by payment status"
                className="w-full rounded-xl bg-[#f6f9ff] px-3 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/10"
              >
                <option value="">Xaaladda Bixinta</option>
                <option value="Paid">La Bixiyay (Paid)</option>
                <option value="Overdue">Dib u Dhacay (Overdue)</option>
                <option value="Pending">Sugaya (Pending)</option>
              </select>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e7eff8] px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-[#dbe3ed]"
              >
                <X size={14} />
                Nadiifi
              </button>
            </div>
          </div>
        </section>

        <section id="shaba-report-document" className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <FileText size={16} />
              </span>
              <h2 className="text-sm font-bold text-[#0e1430]">System Reports &amp; Invoicing Telemetry</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-600">{scopedBills.length.toLocaleString()} Diiwaan</span>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
              <BarChart3 size={13} />
              {activeTab === 'overdue' ? 'Overdue bills' : 'Billing records'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-[#f3f6fb] text-[9px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-4 py-3">Macmiilka &amp; Degmo</th>
                  <th className="px-3 py-3">Lambarka Biilka</th>
                  <th className="px-3 py-3">Meeterka ID</th>
                  <th className="px-3 py-3 text-right">Isticmaalka (m³)</th>
                  <th className="px-3 py-3 text-right">Qiimaha (USD)</th>
                  <th className="px-3 py-3">Taariikhda</th>
                  <th className="px-3 py-3 text-center">Xaaladda</th>
                  <th className="px-4 py-3 text-center">Ficillada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">Loading system reports...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-rose-600">{error}</td></tr>
                ) : visibleBills.length ? (
                  visibleBills.map((bill, index) => {
                    const name = getCustomerName(bill);
                    const district = getDistrict(bill);
                    return (
                      <tr key={bill._id || getInvoiceId(bill)} className="transition hover:bg-[#f6f9ff]">
                        <td className="min-w-[205px] px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                              index % 3 === 1 ? 'bg-emerald-100 text-emerald-800' : index % 3 === 2 ? 'bg-orange-100 text-orange-800' : 'bg-[#e3e7fa] text-[#1b2da6]'
                            }`}>
                              {getInitials(name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[175px] truncate text-[11px] font-bold text-[#0e1430]">{name}</span>
                              <span className="block max-w-[180px] truncate text-[9px] text-slate-500">
                                {[district, getCustomerAddress(bill).slice(district.length).replace(/^[,\s]+/, '')]
                                  .filter(Boolean)
                                  .join(' • ') || 'Degmo lama diiwaangelin'}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-[#1b2da6]">{getInvoiceId(bill)}</td>
                        <td className="px-3 py-3 font-mono text-[10px] text-slate-500">{getSupplyNo(bill) || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">
                          {getUnits(bill).toLocaleString(undefined, { maximumFractionDigits: 1 })} m³
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-[#0e1430]">{formatMoney(getAmount(bill))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-500">{formatDate(getBillDate(bill))}</td>
                        <td className="px-3 py-3 text-center"><StatusBadge status={getStatus(bill)} /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => printInvoice(bill)}
                              title="Print invoice"
                              aria-label={`Print ${getInvoiceId(bill)}`}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#1b2da6]"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => exportCsv(`${getInvoiceId(bill)}.csv`, [bill])}
                              title="Download invoice data"
                              aria-label={`Download ${getInvoiceId(bill)}`}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#1b2da6]"
                            >
                              <FileDown size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No reports match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-[#fbfcff] px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {scopedBills.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} -{' '}
              {Math.min(currentPage * PAGE_SIZE, scopedBills.length)} of {scopedBills.length.toLocaleString()} billing records
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

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#0e1430]">Dakhliga Degmooyinka (District Distribution)</h2>
                <p className="mt-1 text-[10px] text-slate-500">Billing revenue grouped by customer district</p>
              </div>
              <span className="rounded-full bg-[#f2f4fd] px-2.5 py-1 text-[9px] font-bold text-[#1b2da6]">
                Wadarta: {formatMoney(totalRevenue)}
              </span>
            </div>
            {districtRevenue.length ? (
              <div className="mt-4 space-y-3">
                {districtRevenue.slice(0, 5).map(([district, data]) => {
                  const share = totalRevenue ? (data.amount / totalRevenue) * 100 : 0;
                  return (
                    <div key={district}>
                      <div className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate font-semibold text-[#0e1430]">{district}</span>
                        <span className="whitespace-nowrap font-bold text-[#1b2da6]">
                          {formatMoney(data.amount)} ({share.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#1b2da6]" style={{ width: `${share}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-[#f6f9ff] p-3 text-[11px] text-slate-500">No district revenue data available for these filters.</p>
            )}
          </article>

          <article className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#0e1430]">Jadwalka Warbixinada (Report Exports)</h2>
                <p className="mt-1 text-[10px] text-slate-500">Download current billing data by report type</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">On demand</span>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f9ff] p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-lg border border-slate-200 bg-white p-2 text-[#1b2da6]"><CircleDollarSign size={15} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-[#0e1430]">Revenue &amp; Billing Summary</span>
                    <span className="block text-[9px] text-slate-500">{paidBills.length} paid · {overdueBills.length} overdue</span>
                  </span>
                </div>
                <button type="button" onClick={() => exportNamedReport('revenue')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#1b2da6] hover:bg-indigo-50">Soo Deji</button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f9ff] p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-lg border border-slate-200 bg-white p-2 text-emerald-700"><BarChart3 size={15} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-[#0e1430]">Water Usage Report</span>
                    <span className="block text-[9px] text-slate-500">{totalUsage.toLocaleString()} m³ recorded usage</span>
                  </span>
                </div>
                <button type="button" onClick={() => exportNamedReport('usage')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#1b2da6] hover:bg-indigo-50">Soo Deji</button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f9ff] p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="rounded-lg border border-slate-200 bg-white p-2 text-orange-700"><MapPin size={15} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-[#0e1430]">District Billing Report</span>
                    <span className="block text-[9px] text-slate-500">{districtRevenue.length} districts with records</span>
                  </span>
                </div>
                <button type="button" onClick={() => exportNamedReport('district')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[9px] font-semibold text-[#1b2da6] hover:bg-indigo-50">Soo Deji</button>
              </div>
            </div>
            <p className="mt-3 border-t border-slate-100 pt-3 text-[9px] text-slate-500">
              Automated schedules and telemetry loss reports are not configured in the current system.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
