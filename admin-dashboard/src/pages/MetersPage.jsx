import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Download,
  Map as MapIcon,
  Pencil,
  PlusCircle,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
  Waves,
  X,
} from 'lucide-react';
import { API_BASE } from '../services/api';
import Modal from '../components/Modal';

const PAGE_SIZE = 7;
const CSV_HEADERS = ['supplyNo', 'customerId', 'prevReading', 'currReading', 'readingDate'];
const DISTRICTS = [
  'Hodan',
  'Waberi',
  'Warta Nabada',
  'Yaqshid',
  'Karaan',
  'Howlwadaag',
  'Hawl-Wadaag',
  'Dharkenley',
];
const INITIAL_FORM = {
  supplyNo: '',
  customerId: '',
  prevReading: '',
  currReading: '',
  readingDate: new Date().toISOString().slice(0, 10),
};

const getId = (value) => String(value?._id || value?.id || value || '');
const getCustomerName = (customer) => customer?.fullName || customer?.name || 'Unknown customer';
const getAddress = (customer) => customer?.address || '';
const getPhone = (customer) => customer?.phone || customer?.phoneNumber || '';
const getSupplyNo = (meter) => meter.supplyNo || meter.meterNumber || '';
const getReadingDate = (meter) => meter.readingDate || meter.createdAt || '';

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted field.');
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

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

const dateIsRecent = (date) => {
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) && timestamp >= Date.now() - 30 * 24 * 60 * 60 * 1000;
};

const formatReading = (reading) =>
  Number.isFinite(Number(reading))
    ? Number(reading).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : '—';

const formatDate = (date) => {
  if (!date) return '—';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

function ReadingStatus({ meter }) {
  const date = getReadingDate(meter);
  const units = Number(meter.unitsUsed ?? Number(meter.currReading) - Number(meter.prevReading));
  const status = units === 0 ? 'No usage' : dateIsRecent(date) ? 'Recent' : 'Needs reading';
  const styles = {
    Recent: 'bg-emerald-100 text-emerald-800',
    'Needs reading': 'bg-amber-100 text-amber-800',
    'No usage': 'bg-slate-200 text-slate-700',
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function MetersPage() {
  const [meters, setMeters] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    const [meterResult, customerResult] = await Promise.allSettled([
      axios.get(`${API_BASE}/meters`, { withCredentials: true }),
      axios.get(`${API_BASE}/customers`, { withCredentials: true }),
    ]);

    if (meterResult.status === 'rejected') {
      console.error('Failed to load meter readings:', meterResult.reason?.message);
      setError('Failed to load meter readings. Please try again.');
      setMeters([]);
    } else {
      setMeters(Array.isArray(meterResult.value.data) ? meterResult.value.data : []);
    }

    if (customerResult.status === 'rejected') {
      console.error('Failed to load customers for meter details:', customerResult.reason?.message);
      setCustomerError('Customer names and districts could not be loaded.');
      setCustomers([]);
    } else {
      setCustomerError('');
      setCustomers(Array.isArray(customerResult.value.data) ? customerResult.value.data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const customersById = useMemo(
    () => new Map(customers.map((customer) => [getId(customer), customer])),
    [customers],
  );

  const enrichedMeters = useMemo(
    () =>
      meters.map((meter) => {
        const customerId = getId(meter.customerId);
        const customer = customersById.get(customerId) || meter.customerId || null;
        const address = getAddress(customer);
        const district = address.split(/[,\n]/)[0].trim();
        return { ...meter, customer, customerId, address, district };
      }),
    [meters, customersById],
  );

  const monthStart = useMemo(() => {
    const date = new Date();
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const counts = useMemo(() => {
    const supplyNumbers = new Set(enrichedMeters.map(getSupplyNo).filter(Boolean));
    const recentSupplies = new Set(
      enrichedMeters
        .filter((meter) => dateIsRecent(getReadingDate(meter)))
        .map(getSupplyNo)
        .filter(Boolean),
    );
    const monthReadings = enrichedMeters.filter((meter) => {
      const date = new Date(getReadingDate(meter));
      return !Number.isNaN(date.getTime()) && date >= monthStart;
    });
    const suppliesWithMonthReading = new Set(monthReadings.map(getSupplyNo).filter(Boolean));
    const allSupplies = [...supplyNumbers];
    const totalUsage = monthReadings.reduce(
      (total, meter) => total + Math.max(0, Number(meter.unitsUsed ?? 0)),
      0,
    );

    return {
      total: allSupplies.length,
      recent: recentSupplies.size,
      pending: Math.max(0, allSupplies.length - suppliesWithMonthReading.size),
      totalUsage,
      monthReadings: monthReadings.length,
    };
  }, [enrichedMeters, monthStart]);

  const filteredMeters = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enrichedMeters.filter((meter) => {
      const readingDate = getReadingDate(meter);
      const units = Number(meter.unitsUsed ?? Number(meter.currReading) - Number(meter.prevReading));
      const isRecent = dateIsRecent(readingDate);
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Recent' && isRecent) ||
        (statusFilter === 'Needs reading' && !isRecent) ||
        (statusFilter === 'No usage' && units === 0);
      const matchesDistrict =
        !districtFilter || meter.address.toLowerCase().includes(districtFilter.toLowerCase());
      const matchesSearch =
        !query ||
        [
          getSupplyNo(meter),
          getCustomerName(meter.customer),
          meter.address,
          getPhone(meter.customer),
        ].some((value) => String(value || '').toLowerCase().includes(query));
      return matchesStatus && matchesDistrict && matchesSearch;
    });
  }, [enrichedMeters, search, districtFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredMeters.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleMeters = filteredMeters.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const districts = [...new Set(customers.map((customer) => {
    const address = getAddress(customer);
    return address ? address.split(/[,\n]/)[0].trim() : '';
  }).filter(Boolean))].sort();

  const openNewReading = (meter = null) => {
    const customer = meter?.customer;
    setIsEditing(Boolean(meter));
    setEditingId(meter?._id || '');
    setFormData(
      meter
        ? {
            supplyNo: getSupplyNo(meter),
            customerId: getId(meter.customerId),
            prevReading: meter.prevReading ?? '',
            currReading: meter.currReading ?? '',
            readingDate: getReadingDate(meter)
              ? new Date(getReadingDate(meter)).toISOString().slice(0, 10)
              : INITIAL_FORM.readingDate,
          }
        : {
            ...INITIAL_FORM,
            supplyNo: customer?.supplyNo || customer?.meterNumber || '',
            customerId: getId(customer),
            prevReading: meter?.currReading ?? '',
            currReading: '',
          },
    );
    setFormMessage('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const previous = Number(formData.prevReading);
    const current = Number(formData.currReading);
    if (
      !formData.supplyNo.trim() ||
      !formData.customerId ||
      formData.prevReading === '' ||
      formData.currReading === '' ||
      !Number.isFinite(previous) ||
      !Number.isFinite(current) ||
      previous < 0 ||
      current < previous
    ) {
      setFormMessage('Enter a supply number, customer, and valid readings. Current reading must be at least the previous reading.');
      return;
    }

    setSaving(true);
    setFormMessage('');
    const payload = {
      supplyNo: formData.supplyNo.trim(),
      meterNumber: formData.supplyNo.trim(),
      customerId: formData.customerId,
      prevReading: previous,
      currReading: current,
      readingDate: formData.readingDate,
    };
    try {
      if (isEditing) {
        await axios.put(`${API_BASE}/meters/${editingId}`, payload, { withCredentials: true });
        setNotice('Meter reading updated successfully.');
      } else {
        await axios.post(`${API_BASE}/meters`, payload, { withCredentials: true });
        setNotice('Meter reading saved successfully.');
      }
      setIsModalOpen(false);
      setFormData(INITIAL_FORM);
      window.dispatchEvent(new CustomEvent('meterLog:updated'));
      await fetchData();
      window.setTimeout(() => setNotice(''), 3500);
    } catch (submitError) {
      console.error('Failed to save meter reading:', submitError.message);
      setFormMessage(submitError.response?.data?.message || 'Failed to save meter reading.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (meter) => {
    setDeletingId(meter._id);
    setNotice('');
    try {
      await axios.delete(`${API_BASE}/meters/${meter._id}`, { withCredentials: true });
      setMeters((previous) => previous.filter((item) => item._id !== meter._id));
      setNotice('Meter reading deleted successfully.');
      window.setTimeout(() => setNotice(''), 3500);
    } catch (deleteError) {
      console.error('Failed to delete meter reading:', deleteError.message);
      setNotice(deleteError.response?.data?.message || 'Failed to delete meter reading.');
      window.setTimeout(() => setNotice(''), 4500);
    } finally {
      setDeletingId('');
    }
  };

  const exportReadings = () => {
    const headers = ['Supply No.', 'Customer', 'District', 'Phone', 'Previous Reading (m3)', 'Current Reading (m3)', 'Usage (m3)', 'Reading Date'];
    const rows = filteredMeters.map((meter) => [
      getSupplyNo(meter),
      getCustomerName(meter.customer),
      meter.district,
      getPhone(meter.customer),
      meter.prevReading,
      meter.currReading,
      meter.unitsUsed,
      getReadingDate(meter),
    ]);
    downloadCsv('shaba-meter-readings.csv', [headers, ...rows]);
  };

  const downloadTemplate = () => {
    downloadCsv('shaba-meter-reading-template.csv', [
      CSV_HEADERS,
      ['SHB-MTR-0001', 'CUSTOMER_ID_FROM_CUSTOMERS', '0', '0', new Date().toISOString().slice(0, 10)],
    ]);
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setNotice('');
    try {
      const rows = parseCsv(await file.text());
      const headers = rows[0].map((header) => header.trim().toLowerCase());
      const missingHeaders = CSV_HEADERS.filter((header) => !headers.includes(header.toLowerCase()));
      if (missingHeaders.length) {
        throw new Error(`CSV is missing required columns: ${missingHeaders.join(', ')}.`);
      }
      const indexOf = Object.fromEntries(CSV_HEADERS.map((header) => [header, headers.indexOf(header.toLowerCase())]));
      const records = rows.slice(1).map((row, rowIndex) => {
        const record = Object.fromEntries(
          CSV_HEADERS.map((header) => [header, row[indexOf[header]] || '']),
        );
        const previous = Number(record.prevReading);
        const current = Number(record.currReading);
        if (
          !record.supplyNo ||
          !record.customerId ||
          !Number.isFinite(previous) ||
          !Number.isFinite(current) ||
          previous < 0 ||
          current < previous
        ) {
          throw new Error(`Invalid data on CSV row ${rowIndex + 2}. Check supplyNo, customerId, and readings.`);
        }
        return {
          supplyNo: record.supplyNo,
          meterNumber: record.supplyNo,
          customerId: record.customerId,
          prevReading: previous,
          currReading: current,
          ...(record.readingDate ? { readingDate: record.readingDate } : {}),
        };
      });
      if (!records.length) throw new Error('The CSV has no reading rows to import.');

      const results = await Promise.allSettled(
        records.map((record) =>
          axios.post(`${API_BASE}/meters`, record, { withCredentials: true }),
        ),
      );
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      setNotice(
        failed
          ? `Imported ${succeeded} reading${succeeded === 1 ? '' : 's'}; ${failed} failed. Check customer IDs and reading data, then retry failed rows.`
          : `Imported ${succeeded} meter reading${succeeded === 1 ? '' : 's'} successfully.`,
      );
      await fetchData();
    } catch (uploadError) {
      console.error('Failed to import meter readings:', uploadError.message);
      setNotice(uploadError.message || 'Failed to import meter readings.');
    } finally {
      setImporting(false);
    }
  };

  const monthlyUsage = useMemo(() => {
    const totals = new Map();
    enrichedMeters.forEach((meter) => {
      const date = new Date(getReadingDate(meter));
      if (Number.isNaN(date.getTime()) || date < monthStart) return;
      const district = meter.district || 'District not recorded';
      totals.set(district, (totals.get(district) || 0) + Math.max(0, Number(meter.unitsUsed ?? 0)));
    });
    return [...totals.entries()].sort((first, second) => second[1] - first[1]).slice(0, 5);
  }, [enrichedMeters, monthStart]);

  const tabs = [
    { label: 'All', count: enrichedMeters.length },
    { label: 'Recent', count: enrichedMeters.filter((meter) => dateIsRecent(getReadingDate(meter))).length },
    { label: 'Needs reading', count: enrichedMeters.filter((meter) => !dateIsRecent(getReadingDate(meter))).length },
    {
      label: 'No usage',
      count: enrichedMeters.filter((meter) => Number(meter.unitsUsed ?? Number(meter.currReading) - Number(meter.prevReading)) === 0).length,
    },
  ];

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
          <div className="max-w-3xl">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              <span>Maamulka Saacadaha</span>
              <span className="text-slate-300">/</span>
              <span className="text-[#1b2da6]">Meter Operations &amp; Telemetry</span>
            </div>
            <h1 className="font-['Archivo_Narrow',sans-serif] text-3xl font-bold tracking-tight text-[#001484] sm:text-[34px]">
              Saacadaha Biyaha &amp; Akhriska
              <span className="block text-2xl sm:inline sm:text-[34px]"> (Meters &amp; Telemetry)</span>
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Kormeerka akhriska saacadaha biyaha, diiwaangelinta akhriska cusub, iyo dabagalka isticmaalka macaamiisha.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportReadings}
              disabled={!filteredMeters.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1b2da6] shadow-sm transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <Download size={15} />
              Soo Deji CSV
            </button>
            <button
              type="button"
              onClick={() => openNewReading()}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-[#1b2da6] shadow-sm transition hover:bg-indigo-50"
            >
              <PlusCircle size={15} />
              Diiwaangeli Akhris
            </button>
            <button
              type="button"
              onClick={() => openNewReading()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#101c9a] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2637ae]"
            >
              <Activity size={16} />
              + Geli Akhris Cusub
            </button>
          </div>
        </div>

        {(error || customerError || notice) && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
              error || notice.toLowerCase().includes('failed') || notice.toLowerCase().includes('missing')
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-indigo-100 bg-white text-slate-600'
            }`}
          >
            <span>{error || customerError || notice}</span>
            {notice && !error && !customerError && (
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
                <X size={15} />
              </button>
            )}
          </div>
        )}

        <section className="flex flex-col justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Activity size={20} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Meter reading activity</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
                  {loading ? 'Loading' : `${counts.monthReadings} this month`}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                {loading
                  ? 'Loading reading records...'
                  : `Latest reading data for ${counts.total.toLocaleString()} distinct supply numbers.`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-[11px] font-semibold text-[#1b2da6] transition hover:bg-indigo-50 disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Dib u Cusbooneysii
          </button>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Wadarta Saacadaha</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf3fc] text-[#1b2da6]">
                <Waves size={17} />
              </span>
            </div>
            <div className="font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-[#001484]">
              {loading ? '—' : counts.total.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Supply numbers recorded</span>
              <span>{customers.length.toLocaleString()} customers</span>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Akhriska Guusha Leh</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <Radio size={17} />
              </span>
            </div>
            <div className="font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-emerald-800">
              {loading ? '—' : counts.recent.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Read within the last 30 days</span>
              <span className="font-semibold text-emerald-800">Recent</span>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Akhris Sugaya</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                <CircleAlert size={17} />
              </span>
            </div>
            <div className="font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-amber-700">
              {loading ? '—' : counts.pending.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>No reading recorded this month</span>
              <span>Needs follow-up</span>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Isticmaalka Bishan (m³)</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf3fc] text-[#1b2da6]">
                <Waves size={17} />
              </span>
            </div>
            <div className="font-['Archivo_Narrow',sans-serif] text-4xl font-bold text-[#001484]">
              {loading ? '—' : counts.totalUsage.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Usage from readings this month</span>
              <span>{counts.monthReadings} readings</span>
            </div>
          </article>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-white p-3 shadow-[0_2px_12px_rgba(27,45,166,0.045)] sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.label);
                    setPage(1);
                  }}
                  aria-pressed={statusFilter === tab.label}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                    statusFilter === tab.label
                      ? 'bg-[#101c9a] text-white shadow-sm'
                      : 'bg-[#edf3fc] text-slate-700 hover:bg-[#dfe8f5]'
                  }`}
                >
                  {tab.label === 'All'
                    ? 'Dhammaan'
                    : tab.label === 'Recent'
                      ? 'Akhrisyo u dambeeyay'
                      : tab.label === 'Needs reading'
                        ? 'Akhris Sugaya'
                        : 'Isticmaal eber ah'}
                  <span className="ml-1.5 opacity-75">{loading ? '—' : tab.count.toLocaleString()}</span>
                </button>
              ))}
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
              <ClipboardList size={14} />
              {filteredMeters.length.toLocaleString()} reading records
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
            <label className="relative md:col-span-6">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                aria-label="Search meter readings"
                placeholder="Raadi lambarka saacada, macmiilka, ama degmada..."
                className="w-full rounded-xl bg-[#f5f8fc] py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-[#1b2da6]/15"
              />
            </label>
            <select
              value={districtFilter}
              onChange={(event) => {
                setDistrictFilter(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by district"
              className="w-full rounded-xl bg-[#f5f8fc] px-3 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/15 md:col-span-3"
            >
              <option value="">Degmooyinka Dhammaan</option>
              {[...new Set([...DISTRICTS, ...districts])].sort().map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f5f8fc] px-3 py-2 text-[10px] text-slate-600 md:col-span-2">
              <span>Meter type</span>
              <span className="font-semibold text-slate-700">Not tracked</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setDistrictFilter('');
                setStatusFilter('All');
                setPage(1);
              }}
              title="Reset filters"
              aria-label="Reset filters"
              className="flex h-10 w-10 items-center justify-center justify-self-end rounded-xl bg-[#f5f8fc] text-slate-600 transition hover:bg-[#dfe8f5] md:col-span-1"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#edf3fc] text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600">
                <tr>
                  <th className="px-4 py-3">Supply No. / ID</th>
                  <th className="px-3 py-3">Macmiilka &amp; Degmada</th>
                  <th className="px-3 py-3 text-right">Akhriskii Hore</th>
                  <th className="px-3 py-3 text-right">Akhriska Hadda</th>
                  <th className="px-3 py-3 text-right">Isticmaalka (m³)</th>
                  <th className="px-3 py-3">Xiriirkii U Dambeeyay</th>
                  <th className="px-3 py-3">Reading Status</th>
                  <th className="px-4 py-3 text-right">Hawlaha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">Loading meter readings...</td></tr>
                ) : error ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-rose-600">{error}</td></tr>
                ) : visibleMeters.length ? (
                  visibleMeters.map((meter) => {
                    const units = Number(meter.unitsUsed ?? Number(meter.currReading) - Number(meter.prevReading));
                    const name = getCustomerName(meter.customer);
                    return (
                      <tr key={meter._id} className={`group transition hover:bg-[#f7f9fd] ${units === 0 ? 'bg-amber-50/50' : ''}`}>
                        <td className="min-w-[155px] px-4 py-3">
                          <span className="block font-['Archivo_Narrow',sans-serif] text-sm font-bold text-[#001484]">
                            {getSupplyNo(meter) || '—'}
                          </span>
                          <span className="text-[9px] text-slate-500">Meter type not recorded</span>
                        </td>
                        <td className="min-w-[220px] px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7e9ff] text-[9px] font-bold text-[#2637ae]">
                              {name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[185px] truncate text-[11px] font-semibold text-slate-800">{name}</span>
                              <span className="block max-w-[195px] truncate text-[9px] text-slate-500">
                                {[meter.district, meter.address && meter.district ? meter.address.slice(meter.district.length).replace(/^[,\s]+/, '') : '', getPhone(meter.customer)]
                                  .filter(Boolean)
                                  .join(' · ') || 'Customer address not recorded'}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-slate-500">{formatReading(meter.prevReading)} m³</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-bold text-slate-800">{formatReading(meter.currReading)} m³</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <span className={`font-bold ${units === 0 ? 'text-amber-700' : 'text-[#1b2da6]'}`}>{formatReading(units)} m³</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="block font-medium text-slate-700">{formatDate(getReadingDate(meter))}</span>
                          <span className="text-[9px] text-slate-400">Reading date</span>
                        </td>
                        <td className="px-3 py-3"><ReadingStatus meter={meter} /></td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openNewReading(meter)}
                              aria-label={`Edit reading for ${name}`}
                              className="rounded-lg p-1.5 text-[#1b2da6] transition hover:bg-indigo-50"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(meter)}
                              disabled={deletingId === meter._id}
                              aria-label={`Delete reading for ${name}`}
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
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No readings match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredMeters.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{' '}
              {Math.min(currentPage * PAGE_SIZE, filteredMeters.length)} of {filteredMeters.length.toLocaleString()} readings
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
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#1b2da6]">Kormeerka Degmooyinka</h2>
                <p className="text-[10px] text-slate-500">Recorded usage this month (m³)</p>
              </div>
              <MapIcon size={19} className="text-[#1b2da6]" />
            </div>
            {monthlyUsage.length ? (
              <div className="space-y-3">
                {monthlyUsage.map(([district, usage]) => {
                  const maxUsage = monthlyUsage[0][1] || 1;
                  return (
                    <div key={district}>
                      <div className="mb-1 flex justify-between gap-2 text-[10px]">
                        <span className="truncate font-medium text-slate-700">{district}</span>
                        <span className="font-bold text-emerald-800">{usage.toLocaleString(undefined, { maximumFractionDigits: 1 })} m³</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(usage / maxUsage) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-lg bg-[#f5f8fc] p-3 text-[11px] text-slate-500">
                No district-level readings have been recorded this month.
              </p>
            )}
            <p className="mt-3 border-t border-slate-100 pt-2 text-[9px] text-slate-400">
              District is derived from the customer address; pressure telemetry is not connected.
            </p>
          </article>

          <article className="flex flex-col justify-between rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf3fc] text-[#1b2da6]">
                  <UploadCloud size={18} />
                </span>
                <h2 className="text-sm font-bold text-[#1b2da6]">Geli Akhriska Kooxeed (Batch)</h2>
              </div>
              <p className="mb-3 text-[11px] leading-5 text-slate-500">
                Import reading records from a CSV. Each row needs the supply number, customer ID, previous and current readings, and reading date.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex w-full flex-col items-center justify-center rounded-xl bg-[#edf3fc] px-4 py-5 text-center transition hover:bg-[#e2eafa] disabled:opacity-50"
              >
                <UploadCloud size={25} className="mb-1 text-[#1b2da6]" />
                <span className="text-[11px] font-bold text-[#1b2da6]">
                  {importing ? 'Importing readings...' : 'Riix halkan si aad u doorato CSV'}
                </span>
                <span className="mt-1 text-[9px] text-slate-500">{CSV_HEADERS.join(', ')}</span>
              </button>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="mt-3 self-start text-[10px] font-semibold text-[#1b2da6] hover:underline"
            >
              Degso Template (.csv)
            </button>
          </article>

          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf3fc] text-[#1b2da6]">
                  <ClipboardList size={17} />
                </span>
                <h2 className="text-sm font-bold text-[#1b2da6]">Reading data quality</h2>
              </div>
              <span className="rounded-full bg-[#edf3fc] px-2 py-1 text-[9px] font-semibold text-slate-600">
                {meters.length.toLocaleString()} records
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              Review readings that report no consumption and keep meter data current.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg bg-[#f5f8fc] p-2.5 text-[10px]">
                <span className="text-slate-600">Recent readings (30 days)</span>
                <span className="font-bold text-emerald-800">{counts.recent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f5f8fc] p-2.5 text-[10px]">
                <span className="text-slate-600">Meters without a reading this month</span>
                <span className="font-bold text-amber-700">{counts.pending.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#f5f8fc] p-2.5 text-[10px]">
                <span className="text-slate-600">Customer details</span>
                <span className={`font-bold ${customerError ? 'text-rose-700' : 'text-emerald-800'}`}>
                  {customerError ? 'Unavailable' : 'Connected'}
                </span>
              </div>
            </div>
          </article>
        </section>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setFormMessage('');
        }}
        title={isEditing ? 'Edit Meter Reading' : 'Geli Akhris Cusub (New Reading)'}
      >
        {formMessage && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
            {formMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reading-customer" className="mb-1.5 block text-xs font-bold text-slate-700">
              Dooro Saacadda (Supply No. ama Macmiilka)
            </label>
            <select
              id="reading-customer"
              value={formData.customerId}
              onChange={(event) => {
                const customer = customersById.get(event.target.value);
                setFormData((previous) => ({
                  ...previous,
                  customerId: event.target.value,
                  supplyNo: previous.supplyNo || customer?.supplyNo || customer?.meterNumber || '',
                }));
              }}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
            >
              <option value="">Select a customer...</option>
              {customers.map((customer) => (
                <option key={getId(customer)} value={getId(customer)}>
                  {getCustomerName(customer)} ({getPhone(customer) || 'No phone'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reading-supply" className="mb-1.5 block text-xs font-bold text-slate-700">Supply No.</label>
            <input
              id="reading-supply"
              type="text"
              value={formData.supplyNo}
              onChange={(event) => setFormData((previous) => ({ ...previous, supplyNo: event.target.value }))}
              required
              placeholder="e.g. SHB-MTR-0001"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="reading-previous" className="mb-1.5 block text-xs font-bold text-slate-700">Akhriskii Hore (m³)</label>
              <input
                id="reading-previous"
                type="number"
                min="0"
                step="0.1"
                value={formData.prevReading}
                onChange={(event) => setFormData((previous) => ({ ...previous, prevReading: event.target.value }))}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
              />
            </div>
            <div>
              <label htmlFor="reading-current" className="mb-1.5 block text-xs font-bold text-slate-700">Akhriska Hadda (m³)</label>
              <input
                id="reading-current"
                type="number"
                min={formData.prevReading || 0}
                step="0.1"
                value={formData.currReading}
                onChange={(event) => setFormData((previous) => ({ ...previous, currReading: event.target.value }))}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="reading-date" className="mb-1.5 block text-xs font-bold text-slate-700">Taariikhda Akhriska</label>
            <input
              id="reading-date"
              type="date"
              value={formData.readingDate}
              onChange={(event) => setFormData((previous) => ({ ...previous, readingDate: event.target.value }))}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1b2da6]/20"
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#f5f8fc] px-3 py-2.5 text-xs">
            <span className="font-semibold text-slate-600">Units used</span>
            <span className="font-bold text-[#1b2da6]">
              {Math.max(0, Number(formData.currReading || 0) - Number(formData.prevReading || 0)).toLocaleString()} m³
            </span>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Jooji
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#101c9a] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2637ae] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Kaydi Akhriska'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
