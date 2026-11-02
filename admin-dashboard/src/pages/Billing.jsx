import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  FileText,
  FilterX,
  PlusCircle,
  Search,
  UsersRound,
  X,
  Zap,
  Pencil,
  Trash2,
  Printer,
} from 'lucide-react';
import { API_BASE } from '../services/api';
import BillingModal from '../components/Billing';
import Modal from '../components/Modal';

const PAGE_SIZE = 7;
const INITIAL_BILL_FORM = {
  supplyNo: '',
  idNo: '',
  customerId: '',
  prevReading: '',
  currReading: '',
  prevDate: '',
  currDate: '',
  units: 0,
  period: '',
  billDate: '',
  amount: '',
  dueDate: '',
  status: 'Pending',
};

const getBillCustomer = (bill) => bill.customerId || bill.customer || null;
const getBillCustomerId = (bill) => {
  const customer = getBillCustomer(bill);
  return String(typeof customer === 'object' ? customer?._id || customer?.id || '' : customer || '');
};
const getCustomerName = (bill) => {
  const customer = getBillCustomer(bill);
  return (
    bill.customerName ||
    (typeof customer === 'object' ? customer?.fullName || customer?.name : '') ||
    'Unknown customer'
  );
};
const getCustomerAddress = (bill) => {
  const customer = getBillCustomer(bill);
  return typeof customer === 'object' ? customer?.address || '' : '';
};
const getCustomerPhone = (bill) => {
  const customer = getBillCustomer(bill);
  return typeof customer === 'object' ? customer?.phone || customer?.phoneNumber || '' : '';
};
const getSupplyNo = (bill) => bill.supplyNo || bill.supply || bill.meterNumber || '';
const getAmount = (bill) => Number(bill.amountDue ?? bill.amount ?? 0) || 0;
const getUnits = (bill) => Number(bill.unitsUsed ?? bill.units ?? 0) || 0;
const getInvoiceId = (bill) =>
  bill.invoiceNo || bill.billId || (bill._id ? `INV-${bill._id.slice(-8).toUpperCase()}` : '—');

const isBillOverdue = (bill) => {
  if (String(bill.status || '').toLowerCase() === 'paid') return false;
  if (String(bill.status || '').toLowerCase() === 'overdue') return true;
  if (!bill.dueDate) return false;
  const dueDate = new Date(bill.dueDate);
  return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
};

const getStatus = (bill) => {
  if (String(bill.status || '').toLowerCase() === 'paid') return 'Paid';
  return isBillOverdue(bill) ? 'Overdue' : 'Pending';
};

const getDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = getDate(value);
  return date
    ? date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
};

const formatMoney = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const downloadCsv = (filename, rows) => {
  const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(quote).join(',')).join('\r\n');
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
    Overdue: 'bg-rose-100 text-rose-700',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'Paid' ? 'bg-emerald-600' : status === 'Overdue' ? 'bg-rose-600' : 'bg-indigo-600'}`} />
      {status === 'Paid' ? 'La Bixiyay (Paid)' : status === 'Overdue' ? 'Dib u Dhacay (Overdue)' : 'Sugaya (Pending)'}
    </span>
  );
}

export default function BillingPage() {
  const [bills, setBills] = useState([]);
  const [meters, setMeters] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supportError, setSupportError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [cycleFilter, setCycleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [notice, setNotice] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchCycle, setBatchCycle] = useState(
    new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  );
  const [batchDueDate, setBatchDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [batchRunning, setBatchRunning] = useState(false);

  const fetchBillingData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [billResult, customerResult, meterResult] = await Promise.allSettled([
      axios.get(`${API_BASE}/billing`, { withCredentials: true }),
      axios.get(`${API_BASE}/customers`, { withCredentials: true }),
      axios.get(`${API_BASE}/meters`, { withCredentials: true }),
    ]);

    if (billResult.status === 'rejected') {
      console.error('Failed to load bills:', billResult.reason?.message);
      setBills([]);
      setError('Failed to load bills. Please try again.');
    } else {
      const list = Array.isArray(billResult.value.data) ? billResult.value.data : [];
      setBills(
        list.map((bill) => ({
          ...bill,
          supplyNo: bill.supplyNo || bill.supply || '',
          amountDue: bill.amountDue !== undefined ? bill.amountDue : bill.amount ?? 0,
          unitsUsed: bill.unitsUsed !== undefined ? bill.unitsUsed : bill.units ?? 0,
          customerName: bill.customerName || getCustomerName(bill),
        })),
      );
    }

    const auxiliaryErrors = [];
    if (customerResult.status === 'fulfilled') {
      setCustomers(Array.isArray(customerResult.value.data) ? customerResult.value.data : []);
    } else {
      console.error('Failed to load customers for billing actions:', customerResult.reason?.message);
      setCustomers([]);
      auxiliaryErrors.push('Customer list unavailable.');
    }
    if (meterResult.status === 'fulfilled') {
      setMeters(Array.isArray(meterResult.value.data) ? meterResult.value.data : []);
    } else {
      console.error('Failed to load meter readings for batch billing:', meterResult.reason?.message);
      setMeters([]);
      auxiliaryErrors.push('Meter readings unavailable for batch billing.');
    }
    setSupportError(auxiliaryErrors.join(' '));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const statusCounts = useMemo(() => {
    const result = { All: bills.length, Paid: 0, Overdue: 0, Pending: 0 };
    bills.forEach((bill) => {
      result[getStatus(bill)] += 1;
    });
    return result;
  }, [bills]);

  const overdueBills = useMemo(() => bills.filter((bill) => getStatus(bill) === 'Overdue'), [bills]);
  const paidBills = useMemo(() => bills.filter((bill) => getStatus(bill) === 'Paid'), [bills]);
  const totalBilled = bills.reduce((total, bill) => total + getAmount(bill), 0);
  const totalPaid = paidBills.reduce((total, bill) => total + getAmount(bill), 0);
  const totalOverdue = overdueBills.reduce((total, bill) => total + getAmount(bill), 0);
  const totalUnits = bills.reduce((total, bill) => total + getUnits(bill), 0);
  const averageRate = totalUnits ? totalBilled / totalUnits : 0;

  const districts = [...new Set(
    bills.map((bill) => getCustomerAddress(bill).split(/[,\n]/)[0].trim()).filter(Boolean),
  )].sort();
  const paymentMethods = [...new Set(
    bills
      .map((bill) => bill.paymentMethod || bill.payment?.paymentMethod || bill.gateway || '')
      .filter(Boolean),
  )].sort();
  const cycles = [...new Set(bills.map((bill) => bill.period).filter(Boolean))].sort().reverse();

  const filteredBills = useMemo(() => {
    const query = search.trim().toLowerCase();
    return bills.filter((bill) => {
      const status = getStatus(bill);
      const district = getCustomerAddress(bill).split(/[,\n]/)[0].trim();
      const method = bill.paymentMethod || bill.payment?.paymentMethod || bill.gateway || '';
      const matchesStatus = statusFilter === 'All' || status === statusFilter;
      const matchesDistrict = !districtFilter || district.toLowerCase() === districtFilter.toLowerCase();
      const matchesPayment = !paymentFilter || method.toLowerCase() === paymentFilter.toLowerCase();
      const matchesCycle = !cycleFilter || String(bill.period || '') === cycleFilter;
      const matchesSearch =
        !query ||
        [
          getInvoiceId(bill),
          bill.billId,
          getSupplyNo(bill),
          getCustomerName(bill),
          getCustomerPhone(bill),
          getCustomerAddress(bill),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesDistrict && matchesPayment && matchesCycle && matchesSearch;
    });
  }, [bills, search, statusFilter, districtFilter, paymentFilter, cycleFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleBills = filteredBills.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setDistrictFilter('');
    setPaymentFilter('');
    setCycleFilter('');
    setPage(1);
  };

  const exportBills = () => {
    const headers = [
      'Invoice',
      'Supply No.',
      'Customer',
      'District',
      'Phone',
      'Previous Reading (m3)',
      'Current Reading (m3)',
      'Usage (m3)',
      'Bill Date',
      'Due Date',
      'Amount (USD)',
      'Period',
      'Status',
    ];
    const rows = filteredBills.map((bill) => [
      getInvoiceId(bill),
      getSupplyNo(bill),
      getCustomerName(bill),
      getCustomerAddress(bill).split(/[,\n]/)[0].trim(),
      getCustomerPhone(bill),
      bill.prevReading,
      bill.currReading,
      getUnits(bill),
      bill.billDate || bill.createdAt,
      bill.dueDate,
      getAmount(bill),
      bill.period,
      getStatus(bill),
    ]);
    downloadCsv('shaba-billing-report.csv', [headers, ...rows]);
  };

  const handleDelete = async (bill) => {
    if (!bill._id) return;
    setDeletingId(bill._id);
    setNotice('');
    try {
      await axios.delete(`${API_BASE}/billing/${bill._id}`, { withCredentials: true });
      setBills((previous) => previous.filter((item) => item._id !== bill._id));
      setNotice('Bill deleted successfully.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (deleteError) {
      console.error('Failed to delete bill:', deleteError.message);
      setNotice(deleteError.response?.data?.message || 'Failed to delete bill.');
      window.setTimeout(() => setNotice(''), 4500);
    } finally {
      setDeletingId('');
    }
  };

  const latestReadingByCustomer = useMemo(() => {
    const result = new Map();
    [...meters]
      .sort((first, second) => new Date(second.readingDate || second.createdAt) - new Date(first.readingDate || first.createdAt))
      .forEach((meter) => {
        const customerId = String(
          typeof meter.customerId === 'object' ? meter.customerId?._id || '' : meter.customerId || '',
        );
        if (customerId && !result.has(customerId)) result.set(customerId, meter);
      });
    return result;
  }, [meters]);

  const batchEligible = customers.filter((customer) => {
    const customerId = String(customer._id || '');
    const hasReading = latestReadingByCustomer.has(customerId);
    const alreadyBilled = bills.some(
      (bill) => getBillCustomerId(bill) === customerId && String(bill.period || '') === batchCycle,
    );
    return hasReading && !alreadyBilled;
  });

  const createBatchBills = async (event) => {
    event.preventDefault();
    if (!batchCycle.trim() || !batchDueDate || !batchEligible.length) return;

    setBatchRunning(true);
    setNotice('');
    const results = await Promise.allSettled(
      batchEligible.map((customer) => {
        const reading = latestReadingByCustomer.get(String(customer._id));
        const previous = Number(reading.prevReading || 0);
        const current = Number(reading.currReading || 0);
        const usage = Math.max(0, current - previous);
        return axios.post(
          `${API_BASE}/billing`,
          {
            customerId: customer._id,
            supplyNo: reading.supplyNo || reading.meterNumber || customer.supplyNo || 'PENDING',
            prevReading: previous,
            currReading: current,
            prevDate: reading.readingDate || reading.createdAt,
            currDate: reading.readingDate || reading.createdAt,
            billDate: new Date().toISOString().slice(0, 10),
            period: batchCycle.trim(),
            amountDue: Number((usage * 1.5).toFixed(2)),
            dueDate: batchDueDate,
            status: 'Pending',
          },
          { withCredentials: true },
        );
      }),
    );
    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - succeeded;
    setIsBatchModalOpen(false);
    setNotice(
      failed
        ? `Created ${succeeded} bills. ${failed} failed; review customer and meter records before retrying.`
        : `Created ${succeeded} bills for ${batchCycle}.`,
    );
    await fetchBillingData();
    setBatchRunning(false);
    window.setTimeout(() => setNotice(''), 6000);
  };

  const tabs = [
    { key: 'All', label: 'Dhammaan' },
    { key: 'Paid', label: 'La Bixiyay / Paid' },
    { key: 'Overdue', label: 'Dib u Dhacay / Overdue' },
    { key: 'Pending', label: 'Sugaya / Pending' },
  ];

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1b2da6]" />
              Maamulka Biilasha
              <span className="text-slate-300">/</span>
              <span className="text-[#1b2da6]">Billing &amp; Invoicing</span>
            </div>
            <h1 className="font-['Archivo_Narrow',sans-serif] text-3xl font-bold tracking-tight text-[#001484] sm:text-[34px]">
              Maamulka Biilasha
              <span className="ml-2 text-xl font-normal text-slate-500">(All Bills &amp; Invoicing)</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportBills}
              disabled={!filteredBills.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1b2da6] shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <Download size={15} />
              Soo Deji Warbixinta (CSV)
            </button>
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(true)}
              disabled={!meters.length || !customers.length}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Zap size={15} />
              Biil Kooxeed (Batch)
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingBill(null);
                setIsBillModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#101c9a] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2637ae]"
            >
              <PlusCircle size={16} />
              + Soo Saar Biil Cusub
            </button>
          </div>
        </div>

        {(error || supportError || notice) && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
              error || notice.toLowerCase().includes('failed')
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-indigo-100 bg-white text-slate-600'
            }`}
          >
            <span>{error || supportError || notice}</span>
            {notice && !error && !supportError && (
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
                <X size={15} />
              </button>
            )}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#1b2da6]" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wadarta Biilasha</p>
                <p className="mt-1 font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-slate-900">
                  {loading ? '—' : bills.length.toLocaleString()}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3fc] text-[#1b2da6]">
                <FileText size={21} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
              <span className="font-semibold text-slate-700">{formatMoney(totalBilled)} total billed</span>
              <span className="text-slate-500">All invoices</span>
            </div>
          </article>
          <article className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">La Bixiyay / Settled</p>
                <p className="mt-1 font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-slate-900">{formatMoney(totalPaid)}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={21} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
              <span className="text-slate-500">{paidBills.length.toLocaleString()} paid bills</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                {bills.length ? `${((paidBills.length / bills.length) * 100).toFixed(1)}% paid` : '0% paid'}
              </span>
            </div>
          </article>
          <article className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-rose-600" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Dib u Dhacay / Overdue</p>
                <p className="mt-1 font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-rose-700">{formatMoney(totalOverdue)}</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle size={21} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
              <span className="font-medium text-rose-700">{overdueBills.length.toLocaleString()} overdue bills</span>
              <span className="text-slate-500">Past due date</span>
            </div>
          </article>
          <article className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#6574cd]" />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Celceliska Isticmaalka</p>
                <p className="mt-1 font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-slate-900">
                  {averageRate ? formatMoney(averageRate) : '$0.00'}
                  <span className="ml-1 text-base font-normal text-slate-500">/ m³</span>
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf3fc] text-[#1b2da6]">
                <CircleDollarSign size={21} />
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
              <span className="text-slate-500">{totalUnits.toLocaleString()} m³ billed</span>
              <span className="font-semibold text-[#1b2da6]">Average billed rate</span>
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_12px_rgba(27,45,166,0.045)] sm:p-4">
          <div className="flex flex-col items-stretch justify-between gap-3 xl:flex-row xl:items-center">
            <label className="relative min-w-0 flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                aria-label="Search billing records"
                placeholder="Raadi lambarka biilka, macmiilka, taleefanka, ama meeterka..."
                className="w-full rounded-xl bg-[#edf3fc] py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-[#1b2da6]/15"
              />
            </label>
            <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1 xl:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setPage(1);
                  }}
                  aria-pressed={statusFilter === tab.key}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-[10px] font-semibold transition ${
                    statusFilter === tab.key
                      ? 'bg-[#101c9a] text-white shadow-sm'
                      : 'bg-[#edf3fc] text-slate-600 hover:bg-[#dfe8f5]'
                  }`}
                >
                  {tab.key === 'Overdue' && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                  {tab.label}
                  <span className="opacity-75">{loading ? '—' : statusCounts[tab.key].toLocaleString()}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500">
              Degmada (District)
              <select
                value={districtFilter}
                onChange={(event) => {
                  setDistrictFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-[#edf3fc] px-3 py-2.5 text-xs font-normal text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/15"
              >
                <option value="">Dhammaan Degmooyinka (All)</option>
                {districts.map((district) => <option key={district} value={district}>{district}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500">
              Habka Lacag-bixinta (Payment Method)
              <select
                value={paymentFilter}
                onChange={(event) => {
                  setPaymentFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-[#edf3fc] px-3 py-2.5 text-xs font-normal text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/15"
              >
                <option value="">Dhammaan Hababka (All Methods)</option>
                {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500">
              Bisha Biilka (Billing Cycle)
              <select
                value={cycleFilter}
                onChange={(event) => {
                  setCycleFilter(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-[#edf3fc] px-3 py-2.5 text-xs font-normal text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/15"
              >
                <option value="">Dhammaan Bilaha (All Cycles)</option>
                {cycles.map((cycle) => <option key={cycle} value={cycle}>{cycle}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-end"
            >
              <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e7eff8] px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-[#dbe3ed]">
                <FilterX size={15} />
                Nadiifi Shaandhada
              </span>
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#edf3fc] text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600">
                <tr>
                  <th className="px-3 py-3">Biilka / Supply No</th>
                  <th className="px-3 py-3">Macmiilka &amp; Goobta</th>
                  <th className="px-3 py-3">Akhrinta Meeterka (m³)</th>
                  <th className="px-3 py-3">Taariikhaha (Dates)</th>
                  <th className="px-3 py-3 text-right">Isticmaalka</th>
                  <th className="px-3 py-3 text-right">Lacagta (USD)</th>
                  <th className="px-3 py-3">Xaaladda / Bixinta</th>
                  <th className="px-3 py-3 text-center">Ficillada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">Loading billing records...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-rose-600">{error}</td></tr>
                ) : visibleBills.length ? (
                  visibleBills.map((bill, index) => {
                    const name = getCustomerName(bill);
                    const address = getCustomerAddress(bill);
                    const district = address.split(/[,\n]/)[0].trim();
                    const previousDate = bill.prevDate || bill.previousDate;
                    const currentDate = bill.currDate || bill.currentDate || bill.billDate || bill.createdAt;
                    const status = getStatus(bill);
                    const method = bill.paymentMethod || bill.payment?.paymentMethod || bill.gateway;
                    return (
                      <tr
                        key={bill._id || getInvoiceId(bill)}
                        className={`transition hover:bg-[#f7f9fd] ${status === 'Overdue' ? 'bg-rose-50/60' : ''}`}
                      >
                        <td className="min-w-[115px] px-3 py-3">
                          <span className={`block font-['Archivo_Narrow',sans-serif] text-sm font-bold ${status === 'Overdue' ? 'text-rose-700' : 'text-[#001484]'}`}>
                            {getInvoiceId(bill)}
                          </span>
                          <span className="mt-1 block font-mono text-[9px] text-slate-500">
                            {getSupplyNo(bill) || 'No supply no.'}
                          </span>
                        </td>
                        <td className="min-w-[200px] px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                              status === 'Overdue' ? 'bg-rose-100 text-rose-700' : index % 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-[#dfe0ff] text-[#2637ae]'
                            }`}>
                              {getInitials(name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[175px] truncate text-[11px] font-bold text-slate-800">{name}</span>
                              <span className="block max-w-[185px] truncate text-[9px] text-slate-500">
                                {[district, address && district ? address.slice(district.length).replace(/^[,\s]+/, '') : '', getCustomerPhone(bill)]
                                  .filter(Boolean)
                                  .join(' • ') || 'Customer location not recorded'}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="min-w-[140px] px-3 py-3">
                          <span className="block whitespace-nowrap font-mono text-[10px] font-semibold text-slate-800">
                            {Number(bill.currReading ?? 0).toLocaleString()} m³ <span className="font-sans font-normal text-slate-500">(Hadda)</span>
                          </span>
                          <span className="mt-1 block whitespace-nowrap font-mono text-[9px] text-slate-500">
                            {Number(bill.prevReading ?? 0).toLocaleString()} m³ (Hore)
                          </span>
                        </td>
                        <td className="min-w-[140px] px-3 py-3">
                          <span className={`block whitespace-nowrap font-medium ${status === 'Overdue' ? 'text-rose-700' : 'text-slate-700'}`}>
                            {previousDate ? formatDate(previousDate) : '—'} → {formatDate(currentDate)}
                          </span>
                          <span className="mt-1 block text-[9px] text-slate-500">
                            {bill.period || (bill.dueDate ? `Due ${formatDate(bill.dueDate)}` : 'Billing period not set')}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className="inline-block rounded-lg bg-[#edf3fc] px-2.5 py-1 font-mono text-[10px] font-bold text-slate-800">
                            {getUnits(bill).toLocaleString()} m³
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className={`block font-['Archivo_Narrow',sans-serif] text-base font-bold ${status === 'Overdue' ? 'text-rose-700' : 'text-slate-900'}`}>
                            {formatMoney(getAmount(bill))}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {getUnits(bill) ? `${formatMoney(getAmount(bill) / getUnits(bill))}/m³` : 'Amount due'}
                          </span>
                        </td>
                        <td className="min-w-[150px] px-3 py-3">
                          <StatusBadge status={status} />
                          <span className="mt-1 block max-w-[150px] truncate text-[9px] text-slate-500">
                            {method || (status === 'Paid' ? 'Payment method not recorded' : `Due ${formatDate(bill.dueDate)}`)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => window.print()}
                              title="Print bills"
                              aria-label={`Print ${getInvoiceId(bill)}`}
                              className="rounded-lg p-1.5 text-slate-500 transition hover:bg-[#edf3fc] hover:text-[#1b2da6]"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBill(bill);
                                setIsBillModalOpen(true);
                              }}
                              title="Edit bill"
                              aria-label={`Edit ${getInvoiceId(bill)}`}
                              className="rounded-lg p-1.5 text-[#1b2da6] transition hover:bg-indigo-50"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(bill)}
                              disabled={deletingId === bill._id}
                              title="Delete bill"
                              aria-label={`Delete ${getInvoiceId(bill)}`}
                              className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No bills match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredBills.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{' '}
              {Math.min(currentPage * PAGE_SIZE, filteredBills.length)} of {filteredBills.length.toLocaleString()} bills
            </span>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="rounded-md bg-[#101c9a] px-2.5 py-1.5 font-semibold text-white">{currentPage}</span>
              <span className="px-1">/ {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={currentPage === pageCount}
                aria-label="Next page"
                className="rounded-md p-1.5 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={17} />
              </span>
              <h2 className="text-sm font-bold text-slate-800">Collection overview</h2>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              Payment totals and collection rate are calculated from the current billing records.
            </p>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f8fc] px-3 py-2.5 text-[10px]">
              <span className="text-slate-600">Collected / billed</span>
              <span className="font-bold text-emerald-800">
                {totalBilled ? `${((totalPaid / totalBilled) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf3fc] text-[#1b2da6]">
                <UsersRound size={17} />
              </span>
              <h2 className="text-sm font-bold text-slate-800">Billing records</h2>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              Review pending accounts and create individual or batch invoices from available meter readings.
            </p>
            <div className="flex items-center justify-between rounded-lg bg-[#f5f8fc] px-3 py-2.5 text-[10px]">
              <span className="text-slate-600">Customers with meter readings</span>
              <span className="font-bold text-[#1b2da6]">{latestReadingByCustomer.size.toLocaleString()}</span>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                <AlertTriangle size={17} />
              </span>
              <h2 className="text-sm font-bold text-slate-800">Overdue follow-up</h2>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              Unpaid bills past their due date are automatically counted as overdue.
            </p>
            <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2.5 text-[10px]">
              <span className="text-rose-700">Overdue balance</span>
              <span className="font-bold text-rose-700">{formatMoney(totalOverdue)}</span>
            </div>
          </article>
        </section>
      </div>

      <BillingModal
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setEditingBill(null);
        }}
        initial={editingBill}
        onSaved={() => {
          setIsBillModalOpen(false);
          setEditingBill(null);
          fetchBillingData();
        }}
      />

      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Create bills in batch"
        maxWidth="max-w-xl"
      >
        <form onSubmit={createBatchBills} className="space-y-4">
          <p className="text-sm leading-6 text-slate-600">
            Create one pending bill for each customer with a meter reading, excluding customers already billed for the selected cycle.
            The current tariff used by the billing service is $1.50 per m³.
          </p>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Billing cycle
            <input
              value={batchCycle}
              onChange={(event) => setBatchCycle(event.target.value)}
              required
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
              placeholder="e.g. November 2026"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700">
            Due date
            <input
              type="date"
              value={batchDueDate}
              onChange={(event) => setBatchDueDate(event.target.value)}
              required
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
            />
          </label>
          <div className="flex items-center justify-between rounded-xl bg-[#edf3fc] px-3 py-3 text-sm">
            <span className="text-slate-600">Eligible customers</span>
            <span className="font-bold text-[#1b2da6]">{batchEligible.length.toLocaleString()}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Batch bills use each customer’s latest recorded reading and will be created as pending.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBatchModalOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={batchRunning || batchEligible.length === 0 || !batchCycle.trim() || !batchDueDate}
              className="rounded-xl bg-[#101c9a] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2637ae] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {batchRunning ? 'Creating bills...' : `Create ${batchEligible.length} bills`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
