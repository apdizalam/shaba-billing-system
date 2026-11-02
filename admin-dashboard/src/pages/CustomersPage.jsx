import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  UserPlus,
  X,
} from 'lucide-react';
import { API_BASE } from '../services/api';
import CreateCustomerModal from '../components/CreateCustomerModal';

const PAGE_SIZE = 7;
const DISTRICTS = ['Hodan', 'Waberi', 'Warta Nabada', 'Yaqshid', 'Dharkenley', 'Hawl-Wadaag'];

const getName = (customer) => customer.fullName || customer.name || 'Unnamed customer';
const getPhone = (customer) => customer.phone || customer.phoneNumber || customer.mobile || '';
const getMeter = (customer) => customer.meterNumber || customer.supplyNo || customer.supplyNumber || '';
const getAddress = (customer) => customer.address || '';
const getCustomerId = (customer) => String(customer._id || customer.id || '');

const getGroupLabel = (group = '') => {
  const normalized = group.toLowerCase();
  if (['households', 'guuri', 'residential'].includes(normalized)) return 'Residential';
  if (['commercial', 'ganacsi'].includes(normalized)) return 'Commercial';
  if (['government', 'dawladd'].includes(normalized)) return 'Government';
  if (normalized.includes('industrial')) return 'Industrial';
  if (normalized.includes('refill')) return '20L Refill';
  return group || 'Unassigned';
};

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

const getJoinedDate = (customer) => {
  const value = customer.registrationDate || customer.createdAt;
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const getDistrict = (address) => address.split(/[,\n]/)[0].trim();

const getBillCustomerId = (bill) => {
  const customer = bill.customerId || bill.customer;
  return String(typeof customer === 'object' ? customer?._id || customer?.id || '' : customer || '');
};

const isBillOverdue = (bill) => {
  if (String(bill.status || '').toLowerCase() === 'overdue') return true;
  if (String(bill.status || '').toLowerCase() === 'paid' || !bill.dueDate) return false;
  const dueDate = new Date(bill.dueDate);
  return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
};

const getCustomerStatus = (customer, overdueCustomerIds) => {
  const registrationStatus = String(customer.registrationStatus || '').toLowerCase();
  if (registrationStatus === 'suspended' || customer.isSuspended === true) return 'Suspended';
  if (overdueCustomerIds.has(getCustomerId(customer))) return 'Overdue';
  if (customer.isActive === true || registrationStatus === 'active') return 'Active';
  if (registrationStatus === 'rejected') return 'Rejected';
  return 'Pending';
};

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-emerald-100 text-emerald-800',
    Overdue: 'bg-rose-100 text-rose-700',
    Suspended: 'bg-slate-200 text-slate-700',
    Pending: 'bg-amber-100 text-amber-800',
    Rejected: 'bg-rose-100 text-rose-700',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingError, setBillingError] = useState('');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');

    const [customerResult, billResult] = await Promise.allSettled([
      axios.get(`${API_BASE}/customers`, { withCredentials: true }),
      axios.get(`${API_BASE}/billing`, { withCredentials: true }),
    ]);

    if (customerResult.status === 'rejected') {
      console.error('Failed to load customers:', customerResult.reason?.message);
      setError('Failed to load customers. Please try again.');
      setCustomers([]);
    } else {
      setCustomers(Array.isArray(customerResult.value.data) ? customerResult.value.data : []);
    }

    if (billResult.status === 'rejected') {
      console.error('Failed to load billing status:', billResult.reason?.message);
      setBillingError('Billing status is unavailable. Customer records are still shown.');
      setBills([]);
    } else {
      setBillingError('');
      setBills(Array.isArray(billResult.value.data) ? billResult.value.data : []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const overdueCustomerIds = useMemo(
    () => new Set(bills.filter(isBillOverdue).map(getBillCustomerId).filter(Boolean)),
    [bills],
  );

  const counts = useMemo(() => {
    const result = { All: customers.length, Active: 0, Overdue: 0, Suspended: 0 };
    customers.forEach((customer) => {
      const status = getCustomerStatus(customer, overdueCustomerIds);
      if (status in result) result[status] += 1;
    });
    return result;
  }, [customers, overdueCustomerIds]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const status = getCustomerStatus(customer, overdueCustomerIds);
      const address = getAddress(customer);
      const group = getGroupLabel(customer.group);
      const matchesStatus = statusFilter === 'All' || status === statusFilter;
      const matchesGroup = !groupFilter || group === groupFilter;
      const matchesDistrict =
        !districtFilter || address.toLowerCase().includes(districtFilter.toLowerCase());
      const matchesSearch =
        !query ||
        [
          getName(customer),
          getPhone(customer),
          customer.email,
          getMeter(customer),
          customer.username,
          address,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      return matchesStatus && matchesGroup && matchesDistrict && matchesSearch;
    });
  }, [customers, search, groupFilter, districtFilter, statusFilter, overdueCustomerIds]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleCustomers = filteredCustomers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const groupOptions = [...new Set(customers.map((customer) => getGroupLabel(customer.group)))].sort();
  const refillCount = customers.filter((customer) => getGroupLabel(customer.group) === '20L Refill').length;
  const meteredCount = customers.filter((customer) => getMeter(customer)).length;

  const resetFilters = () => {
    setSearch('');
    setGroupFilter('');
    setDistrictFilter('');
    setStatusFilter('All');
    setPage(1);
  };

  const exportCsv = () => {
    const fields = ['Full Name', 'Phone', 'Email', 'Address', 'Group', 'Joined Date', 'Username', 'Status'];
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = filteredCustomers.map((customer) => [
      getName(customer),
      getPhone(customer),
      customer.email || '',
      getAddress(customer),
      getGroupLabel(customer.group),
      getJoinedDate(customer),
      customer.username || '',
      getCustomerStatus(customer, overdueCustomerIds),
    ]);
    const csv = [fields, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'shaba-customers.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (customer) => {
    const id = getCustomerId(customer);
    if (!id) {
      setNotice('This customer cannot be deleted because its ID is missing.');
      return;
    }

    setDeletingId(id);
    setNotice('');
    try {
      await axios.delete(`${API_BASE}/customers/${id}`, { withCredentials: true });
      setCustomers((previous) => previous.filter((item) => getCustomerId(item) !== id));
      setNotice(`${getName(customer)} was deleted.`);
      window.setTimeout(() => setNotice(''), 3500);
    } catch (deleteError) {
      console.error('Failed to delete customer:', deleteError.message);
      setNotice(deleteError.response?.data?.message || 'Failed to delete customer.');
      window.setTimeout(() => setNotice(''), 4500);
    } finally {
      setDeletingId('');
    }
  };

  const tabs = ['All', 'Active', 'Overdue', 'Suspended'];

  return (
    <div className="min-h-full bg-[#f5f8ff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#2637ae]">
              <span>Maamulka Macaamiisha</span>
              <span className="text-slate-300">•</span>
            </div>
            <h1 className="font-['Archivo_Narrow',sans-serif] text-3xl font-bold tracking-tight text-[#151c23] sm:text-[34px]">
              Macaamiisha Shaba
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredCustomers.length}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={15} />
              Soo Deji CSV
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCustomer(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1b2da6] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2637ae]"
            >
              <UserPlus size={16} />
              + Ku Dar Macmiil
            </button>
          </div>
        </div>

        {(error || billingError || notice) && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
              error || notice.includes('Failed') || notice.includes('cannot')
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-indigo-100 bg-white text-slate-600'
            }`}
          >
            <span>{error || billingError || notice}</span>
            {notice && !error && !billingError && (
              <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
                <X size={16} />
              </button>
            )}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
          <div className="flex flex-col gap-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-[#edf3fc] p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab);
                      setPage(1);
                    }}
                    aria-pressed={statusFilter === tab}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${
                      statusFilter === tab
                        ? 'bg-white text-[#1b2da6] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                    <span
                      className={`ml-1.5 text-[10px] ${
                        tab === 'Active'
                          ? 'text-emerald-700'
                          : tab === 'Overdue'
                            ? 'text-rose-600'
                            : tab === 'Suspended'
                              ? 'text-slate-500'
                              : 'text-slate-500'
                      }`}
                    >
                      {loading ? '—' : counts[tab].toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#edf4f8] px-2.5 py-1 text-[10px] font-medium text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                Mogadishu Metro Feed Active
              </span>
            </div>

            <div className="grid grid-cols-1 items-center gap-2 md:grid-cols-12">
              <label className="relative md:col-span-6">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Raadi macmiilka, taleefanka, meeterka, ama email-ka..."
                  aria-label="Search customers"
                  className="w-full rounded-xl bg-[#edf3fc] py-2.5 pl-10 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-500 focus:bg-white focus:ring-2 focus:ring-[#1b2da6]/15"
                />
              </label>
              <select
                value={groupFilter}
                onChange={(event) => {
                  setGroupFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by customer group"
                className="w-full appearance-none rounded-xl bg-[#edf3fc] px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/15 md:col-span-3"
              >
                <option value="">Dhammaan Qaybaha (All Groups)</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
              <select
                value={districtFilter}
                onChange={(event) => {
                  setDistrictFilter(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by district"
                className="w-full appearance-none rounded-xl bg-[#edf3fc] px-3.5 py-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#1b2da6]/15 md:col-span-2"
              >
                <option value="">Degmada (District)</option>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={resetFilters}
                title="Reset filters"
                aria-label="Reset filters"
                className="flex h-10 w-10 items-center justify-center justify-self-end rounded-xl bg-[#edf3fc] text-slate-600 transition hover:bg-[#dfe8f5] md:col-span-1"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#edf3fc] text-[9px] font-bold uppercase tracking-[0.08em] text-slate-600">
                <tr>
                  <th className="px-3 py-3">Full Name</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Email</th>
                  <th className="px-3 py-3">Address / Degmada</th>
                  <th className="px-3 py-3">Group</th>
                  <th className="px-3 py-3">Joined Date</th>
                  <th className="px-3 py-3">Username</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                      Loading customers...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-rose-600">
                      {error}
                    </td>
                  </tr>
                ) : visibleCustomers.length ? (
                  visibleCustomers.map((customer) => {
                    const name = getName(customer);
                    const address = getAddress(customer);
                    const district = getDistrict(address);
                    const status = getCustomerStatus(customer, overdueCustomerIds);
                    const id = getCustomerId(customer);

                    return (
                      <tr
                        key={id || name}
                        className={`group transition hover:bg-[#f7f9fd] ${
                          status === 'Overdue' ? 'bg-rose-50/60' : ''
                        }`}
                      >
                        <td className="min-w-[205px] px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dfe0ff] text-[9px] font-bold text-[#2637ae]">
                              {getInitials(name)}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[185px] truncate text-[11px] font-semibold text-slate-800 group-hover:text-[#1b2da6]">
                                {name}
                              </span>
                              <span className="block truncate text-[9px] text-slate-400">
                                {getMeter(customer) || 'No meter assigned'}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-[10px] text-slate-700">
                          {getPhone(customer) || '—'}
                        </td>
                        <td className="max-w-[170px] truncate px-3 py-3 text-slate-600">
                          {customer.email || '—'}
                        </td>
                        <td className="min-w-[130px] px-3 py-3">
                          <span className="block font-medium text-slate-800">{district || '—'}</span>
                          <span className="block max-w-[140px] truncate text-[9px] text-slate-500">
                            {address && district ? address.slice(district.length).replace(/^[,\s]+/, '') : ''}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${
                            getGroupLabel(customer.group) === 'Residential'
                              ? 'bg-emerald-100 text-emerald-800'
                              : getGroupLabel(customer.group) === 'Commercial'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-200 text-slate-700'
                          }`}>
                            {getGroupLabel(customer.group)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-[10px] text-slate-600">
                          {getJoinedDate(customer)}
                        </td>
                        <td className="max-w-[130px] truncate px-3 py-3 text-slate-600">
                          {customer.username || '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <StatusBadge status={status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCustomer(customer);
                                setIsModalOpen(true);
                              }}
                              aria-label={`Edit ${name}`}
                              className="rounded-lg p-1.5 text-[#1b2da6] transition hover:bg-indigo-50"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(customer)}
                              disabled={deletingId === id}
                              aria-label={`Delete ${name}`}
                              className="rounded-lg p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                            >
                              <span className="sr-only">
                                {deletingId === id ? 'Deleting' : 'Delete'}
                              </span>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                      No customers match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              Showing {filteredCustomers.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0} to{' '}
              {Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} of{' '}
              {filteredCustomers.length.toLocaleString()} customers
            </span>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="rounded-md bg-[#1b2da6] px-2.5 py-1.5 font-semibold text-white">
                {currentPage}
              </span>
              <span className="px-1">/ {pageCount}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={currentPage === pageCount}
                aria-label="Next page"
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Activity size={17} className="text-emerald-700" />
                Meter coverage
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-semibold text-emerald-800">
                {customers.length ? Math.round((meteredCount / customers.length) * 100) : 0}% linked
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              Customer accounts with an assigned meter or supply number.
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${customers.length ? (meteredCount / customers.length) * 100 : 0}%` }}
              />
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <CreditCard size={17} className="text-[#1b2da6]" />
                Billing follow-up
              </div>
              <span className="rounded-full bg-indigo-100 px-2 py-1 text-[9px] font-semibold text-[#1b2da6]">
                {counts.Overdue} overdue
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              {billingError
                ? 'Billing data is currently unavailable.'
                : 'Accounts with an unpaid bill past its due date are highlighted above.'}
            </p>
            <div className="flex items-center justify-between rounded-lg bg-[#edf3fc] px-3 py-2 text-[10px] text-slate-600">
              <span>Customer accounts</span>
              <span className="font-bold text-[#1b2da6]">{customers.length.toLocaleString()}</span>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-[0_2px_12px_rgba(27,45,166,0.045)]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Truck size={17} className="text-[#1b2da6]" />
                Service mix
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-semibold text-emerald-800">
                {refillCount} refill
              </span>
            </div>
            <p className="mb-3 text-[11px] leading-5 text-slate-500">
              Residential, business, and bulk-refill groups across the customer register.
            </p>
            <div className="flex items-center justify-between rounded-lg bg-[#edf3fc] px-3 py-2 text-[10px] text-slate-600">
              <span>Registered groups</span>
              <span className="font-bold text-[#1b2da6]">{groupOptions.length}</span>
            </div>
          </article>
        </section>
      </div>

      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
        }}
        initial={editingCustomer}
        onSaved={() => {
          setIsModalOpen(false);
          setEditingCustomer(null);
          fetchCustomers();
        }}
      />
    </div>
  );
}
