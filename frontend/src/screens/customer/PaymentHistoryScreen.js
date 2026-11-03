import React, { useState, useContext, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const COLORS = {
  blue: '#2436B2',
  green: '#A3EDB2',
  ink: '#111A3A',
  muted: '#626D79',
  background: '#F3F6F8',
};

const getPaidDate = (bill) => bill?.updatedAt || bill?.paidAt || bill?.createdAt || bill?.billDate;

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString() : '—';
};

const getPeriodTitle = (bill) => {
  const period = bill?.period || bill?.month;
  if (!period) return 'Water bill';
  const match = String(period).match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return String(period);
  const month = new Date(Number(match[1]), Number(match[2]) - 1).toLocaleString(undefined, {
    month: 'long',
  });
  return `${month} ${match[1]}`;
};

const PaymentHistoryScreen = ({ route, navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selectedYear, setSelectedYear] = useState('All');

  const authContext = useContext(AuthContext) || {};
  const isDarkMode = authContext.globalThemeState === 'dark';
  const routeParams = route?.params || {};
  const userInfo = useMemo(
    () => routeParams.userInfo ?? authContext.userInfo?.user ?? authContext.userInfo ?? {},
    [routeParams.userInfo, authContext.userInfo]
  );
  const customerId = userInfo?._id || userInfo?.user?._id;

  const fetchLiveHistory = useCallback(async () => {
    if (!customerId) {
      setBills([]);
      setError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(false);
      const response = await api.get('/bills', {
        params: { customerId, status: 'Paid' },
      });
      if (!Array.isArray(response.data)) throw new Error('Invalid payment history response');
      setBills(response.data);
    } catch (err) {
      console.warn('Failed to fetch payment history:', err.message);
      setBills([]);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchLiveHistory();
    }, [fetchLiveHistory])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLiveHistory();
  }, [fetchLiveHistory]);

  const paidBills = useMemo(
    () => bills
      .filter((bill) => bill && String(bill.status).toUpperCase() === 'PAID')
      .sort((a, b) => (parseDate(getPaidDate(b))?.getTime() || 0) - (parseDate(getPaidDate(a))?.getTime() || 0)),
    [bills]
  );
  const years = useMemo(() => {
    const values = paidBills
      .map((bill) => parseDate(getPaidDate(bill))?.getFullYear())
      .filter(Boolean);
    return ['All', ...Array.from(new Set(values)).sort((a, b) => b - a).map(String)];
  }, [paidBills]);
  const visibleBills = useMemo(
    () => selectedYear === 'All'
      ? paidBills
      : paidBills.filter((bill) => String(parseDate(getPaidDate(bill))?.getFullYear()) === selectedYear),
    [paidBills, selectedYear]
  );
  const totalPaidAmount = useMemo(
    () => visibleBills.reduce((sum, bill) => {
      const amount = Number(bill.amountDue ?? bill.amount ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0),
    [visibleBills]
  );
  const maxUnitsUsed = useMemo(
    () => Math.max(
      0,
      ...visibleBills.map((bill) => Number(bill.unitsUsed ?? bill.units ?? bill.consumption ?? 0))
        .filter(Number.isFinite)
    ),
    [visibleBills]
  );

  const shareReceipt = async (bill) => {
    const amount = Number(bill.amountDue ?? bill.amount ?? 0);
    const receiptText = [
      'Shaba Water payment receipt',
      `Bill: ${bill.billId || bill.billNumber || bill.invoiceNo || bill._id}`,
      `Supply number: ${bill.supplyNo || '—'}`,
      `Period: ${bill.period || bill.month || '—'}`,
      `Paid on: ${formatDate(getPaidDate(bill))}`,
      `Amount paid: $${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`,
    ].join('\n');

    try {
      await Share.share({ title: 'Payment receipt', message: receiptText });
    } catch (err) {
      console.warn('Could not share payment receipt:', err.message);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#121826' : COLORS.background },
    header: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333E4D' : '#E4E9EF',
    },
    backButton: { width: 42, height: 48, justifyContent: 'center' },
    headerTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 20, fontWeight: '700', marginLeft: 12 },
    listContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
    summary: {
      minHeight: 136,
      borderRadius: 26,
      backgroundColor: isDarkMode ? '#17462D' : COLORS.green,
      paddingHorizontal: 22,
      paddingVertical: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },
    summaryLeft: { flex: 1, minWidth: 0 },
    summaryLabel: { color: '#175A32', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
    summaryAmount: { color: COLORS.blue, fontSize: 38, lineHeight: 46, fontWeight: '800', marginTop: 4 },
    summaryMeta: { alignItems: 'flex-end', marginLeft: 10 },
    summaryCount: { color: '#175A32', fontSize: 15, fontWeight: '700', textAlign: 'right' },
    summaryYear: { color: '#175A32', fontSize: 14, marginTop: 3 },
    summaryLoading: { height: 46, justifyContent: 'center' },
    filters: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    filterButton: {
      minWidth: 62,
      minHeight: 44,
      paddingHorizontal: 18,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#495364' : '#B9C3CE',
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterButtonActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
    filterText: { color: isDarkMode ? '#E5E7EB' : '#414B56', fontSize: 15, fontWeight: '600' },
    filterTextActive: { color: '#FFFFFF' },
    paymentCard: {
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      borderRadius: 22,
      padding: 18,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333E4D' : '#EEF1F4',
      shadowColor: '#172033',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    billTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 19, fontWeight: '800', flexShrink: 1 },
    supplyNumber: { color: COLORS.muted, fontSize: 14, marginTop: 3 },
    paidBadge: { backgroundColor: isDarkMode ? '#154B35' : '#DDF7E4', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginLeft: 8 },
    paidBadgeText: { color: '#176B3A', fontSize: 12, fontWeight: '700' },
    readingPanel: { backgroundColor: isDarkMode ? '#263142' : '#F3F6F8', borderRadius: 18, padding: 15, marginBottom: 16 },
    readingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    readingLabel: { color: COLORS.muted, fontSize: 14 },
    readingValue: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 18, fontWeight: '700', marginLeft: 8 },
    progressTrack: { height: 8, borderRadius: 5, backgroundColor: isDarkMode ? '#3A4560' : '#E2E7FB', marginTop: 12, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 5, backgroundColor: COLORS.blue },
    unitsText: { color: COLORS.blue, fontSize: 15, fontWeight: '700', marginTop: 10 },
    detailRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    detailLabel: { color: COLORS.muted, fontSize: 14, flex: 1 },
    detailValue: { color: isDarkMode ? '#E5E7EB' : COLORS.ink, fontSize: 14, marginLeft: 8, textAlign: 'right' },
    amountRow: {
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#3A4560' : '#CBD5E1',
      borderStyle: 'dashed',
      marginTop: 12,
      paddingTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    amountLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
    amount: { color: '#168044', fontSize: 27, fontWeight: '800', marginLeft: 8 },
    receiptButton: { minHeight: 52, borderRadius: 28, backgroundColor: isDarkMode ? '#242E55' : '#F1F2FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15 },
    receiptText: { color: COLORS.blue, fontSize: 16, fontWeight: '700', marginLeft: 8 },
    state: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    stateTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 14 },
    stateSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 7 },
    retryButton: { minHeight: 46, paddingHorizontal: 22, borderRadius: 24, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  }), [isDarkMode]);

  const renderPayment = useCallback(({ item }) => {
    const amount = Number(item.amountDue ?? item.amount ?? 0);
    const units = Number(item.unitsUsed ?? item.units ?? item.consumption ?? 0);
    const previousReading = item.prevReading ?? item.previousReading;
    const currentReading = item.currReading ?? item.currentReading;
    const supplyNo = item.supplyNo || userInfo?.supplyNumber || userInfo?.meterNumber || '—';
    const paidDate = getPaidDate(item);

    return (
      <View style={styles.paymentCard}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.billTitle} numberOfLines={1}>{getPeriodTitle(item)}</Text>
            <Text style={styles.supplyNumber}>{supplyNo}</Text>
          </View>
          <View style={styles.paidBadge}>
            <Text style={styles.paidBadgeText}>Guulaystay · Paid</Text>
          </View>
        </View>

        <View style={styles.readingPanel}>
          <View style={styles.readingTop}>
            <Text style={styles.readingLabel}>Meter reading</Text>
            <Text style={styles.readingValue} numberOfLines={1}>
              {previousReading ?? '—'} → {currentReading ?? '—'}
            </Text>
          </View>
          <View style={styles.progressTrack}>
            {units > 0 && (
              <View
                style={[
                  styles.progressFill,
                  { width: `${maxUnitsUsed > 0 ? (units / maxUnitsUsed) * 100 : 0}%` },
                ]}
              />
            )}
          </View>
          <Text style={styles.unitsText}>{Number.isFinite(units) ? units : 0} units used</Text>
        </View>

        <View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Previous reading date</Text>
            <Text style={styles.detailValue}>{formatDate(item.prevDate || item.previousDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current reading date</Text>
            <Text style={styles.detailValue}>{formatDate(item.currDate || item.currentDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Paid on</Text>
            <Text style={styles.detailValue}>{formatDate(paidDate)}</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>AMOUNT PAID</Text>
          <Text style={styles.amount}>${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}</Text>
        </View>

        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => shareReceipt(item)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Ionicons name="share-outline" size={20} color={COLORS.blue} />
          <Text style={styles.receiptText}>Share receipt</Text>
        </TouchableOpacity>
      </View>
    );
  }, [maxUnitsUsed, shareReceipt, styles, userInfo]);

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.state}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.stateSubtitle}>Loading payment history...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.state}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.muted} />
          <Text style={styles.stateTitle}>Could not load payment history</Text>
          <Text style={styles.stateSubtitle}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchLiveHistory();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.state}>
        <View style={{ width: 94, height: 94, borderRadius: 47, backgroundColor: '#DDF7E4', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="receipt-outline" size={42} color="#168044" />
        </View>
        <Text style={styles.stateTitle}>No successful payments yet</Text>
        <Text style={styles.stateSubtitle}>Your completed bill payments will appear here.</Text>
      </View>
    );
  };

  const summaryYear = selectedYear === 'All'
    ? (parseDate(getPaidDate(paidBills[0]))?.getFullYear() || new Date().getFullYear())
    : selectedYear;
  const data = loading || error ? [] : visibleBills;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home', { userInfo })}
          accessibilityRole="button"
          accessibilityLabel="Back to home"
        >
          <Ionicons name="chevron-back" size={28} color={isDarkMode ? '#F3F4F6' : COLORS.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment history</Text>
      </View>

      <FlatList
        data={data}
        renderItem={renderPayment}
        keyExtractor={(item, index) => String(item._id || item.billId || index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View>
            <View style={styles.summary}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryLabel}>TOTAL PAID</Text>
                {loading ? (
                  <View style={styles.summaryLoading}><ActivityIndicator color={COLORS.blue} /></View>
                ) : error ? (
                  <Text style={styles.summaryAmount}>—</Text>
                ) : (
                  <Text style={styles.summaryAmount}>${totalPaidAmount.toFixed(2)}</Text>
                )}
              </View>
              <View style={styles.summaryMeta}>
                <Text style={styles.summaryCount}>
                  {loading ? 'Loading' : error ? 'Unavailable' : `${visibleBills.length} ${visibleBills.length === 1 ? 'payment' : 'payments'}`}
                </Text>
                <Text style={styles.summaryYear}>{summaryYear}</Text>
              </View>
            </View>
            {!loading && !error && (
              <View style={styles.filters}>
                {years.map((year) => {
                  const selected = year === selectedYear;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[styles.filterButton, selected && styles.filterButtonActive]}
                      onPress={() => setSelectedYear(year)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.filterText, selected && styles.filterTextActive]}>{year}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.blue}
          />
        }
      />
    </SafeAreaView>
  );
};

export default PaymentHistoryScreen;
