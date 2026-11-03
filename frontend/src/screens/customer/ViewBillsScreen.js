import React, { useState, useContext, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import billService from '../../services/bill.service';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  blue: '#2436B2',
  green: '#A3EDB2',
  ink: '#111A3A',
  muted: '#626D79',
  background: '#F3F6F8',
};

const getAmount = (bill) => {
  const amount = Number(bill?.amountDue ?? bill?.amount ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
};

const EmptyState = ({ styles, onHistoryPress }) => (
  <View style={styles.emptyState}>
    <View style={styles.successHalo}>
      <View style={styles.successIcon}>
        <Ionicons name="checkmark" size={40} color="#FFFFFF" />
      </View>
    </View>
    <Text style={styles.emptyTitle}>Ma jiraan biilal aan la bixin</Text>
    <Text style={styles.emptySubtitle}>Dhamaan biilashaada waa la wada bixiyay!</Text>
    <TouchableOpacity
      style={styles.historyButton}
      onPress={onHistoryPress}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Text style={styles.historyButtonText}>View payment history</Text>
    </TouchableOpacity>
  </View>
);

const ViewBillsScreen = ({ route, navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const authContext = useContext(AuthContext) || {};
  const isDarkMode = authContext.globalThemeState === 'dark';
  const routeParams = route?.params || {};
  const userInfo = useMemo(
    () => routeParams.userInfo ?? authContext.userInfo?.user ?? authContext.userInfo ?? {},
    [routeParams.userInfo, authContext.userInfo]
  );
  const customerId = userInfo?._id || userInfo?.user?._id;

  const fetchLiveBills = useCallback(async () => {
    if (!customerId) {
      setBills([]);
      setError(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(false);
      const data = await billService.getCustomerBills(customerId, 'unpaid');
      if (!Array.isArray(data)) throw new Error('Invalid bills response');
      setBills(data);
    } catch (err) {
      console.warn('Failed to fetch unpaid customer bills:', err.message);
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
      fetchLiveBills();
    }, [fetchLiveBills])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLiveBills();
  }, [fetchLiveBills]);

  const unpaidBills = useMemo(
    () => bills
      .filter((bill) => ['PENDING', 'UNPAID', 'OVERDUE'].includes(String(bill.status).toUpperCase()))
      .sort((a, b) => new Date(a.dueDate || a.createdAt || 0) - new Date(b.dueDate || b.createdAt || 0)),
    [bills]
  );
  const totalBalanceDue = unpaidBills.reduce((sum, bill) => sum + getAmount(bill), 0);

  const handlePayPress = (bill) => {
    navigation.navigate('Pay Bill', {
      userInfo,
      billId: bill._id,
      supplyNo: bill.supplyNo || userInfo?.supplyNumber || userInfo?.meterNumber || '',
      amountDue: getAmount(bill),
      period: bill.period || bill.month,
      customerName: bill.customerName || userInfo?.fullName || userInfo?.name || 'Customer',
      previousReading: bill.prevReading ?? bill.previousReading,
      currentReading: bill.currReading ?? bill.currentReading,
      units: bill.unitsUsed ?? bill.units ?? bill.consumption,
      billDate: bill.billDate || bill.createdAt,
      dueDate: bill.dueDate,
    });
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
    summaryCard: {
      minHeight: 136,
      borderRadius: 26,
      paddingHorizontal: 22,
      paddingVertical: 20,
      backgroundColor: COLORS.blue,
      marginBottom: 16,
      justifyContent: 'center',
    },
    summaryLabel: { color: '#C8D0FF', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
    summaryBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    summaryAmount: { color: '#FFFFFF', fontSize: 38, lineHeight: 46, fontWeight: '800' },
    summaryBadge: { backgroundColor: COLORS.green, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginLeft: 8 },
    summaryBadgeText: { color: '#175A32', fontSize: 13, fontWeight: '700' },
    loadingAmount: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    billCard: {
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      padding: 18,
      borderRadius: 20,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: isDarkMode ? '#333E4D' : '#E8EDF2',
    },
    billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    billTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 16, fontWeight: '700', flexShrink: 1 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: '#FFF0DC', marginLeft: 8 },
    overdueBadge: { backgroundColor: isDarkMode ? '#482323' : '#FEE8E7' },
    statusText: { color: '#A34B00', fontSize: 11, fontWeight: '700' },
    overdueText: { color: '#B42318' },
    details: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: isDarkMode ? '#333E4D' : '#E8EDF2', paddingVertical: 12, marginBottom: 14 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
    detailLabel: { color: COLORS.muted, fontSize: 13 },
    detailValue: { color: isDarkMode ? '#E5E7EB' : '#293244', fontSize: 13, fontWeight: '600', flexShrink: 1, marginLeft: 12, textAlign: 'right' },
    billBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    amountLabel: { color: COLORS.muted, fontSize: 12 },
    amount: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 20, fontWeight: '800', marginTop: 2 },
    payButton: { minHeight: 44, paddingHorizontal: 18, borderRadius: 13, backgroundColor: COLORS.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    payButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 6 },
    emptyState: { flex: 1, minHeight: 330, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
    successHalo: { width: 112, height: 112, borderRadius: 56, backgroundColor: '#DDF7E4', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
    successIcon: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#168044', alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 22, lineHeight: 29, fontWeight: '800', textAlign: 'center' },
    emptySubtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 6 },
    historyButton: { borderWidth: 2, borderColor: COLORS.blue, borderRadius: 30, paddingHorizontal: 24, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
    historyButtonText: { color: COLORS.blue, fontSize: 16, fontWeight: '700' },
    stateContainer: { flex: 1, minHeight: 300, alignItems: 'center', justifyContent: 'center', padding: 24 },
    stateTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 17, fontWeight: '700', textAlign: 'center', marginTop: 14 },
    stateSubtitle: { color: COLORS.muted, fontSize: 14, textAlign: 'center', marginTop: 6 },
    retryButton: { minHeight: 46, paddingHorizontal: 22, borderRadius: 24, backgroundColor: COLORS.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  }), [isDarkMode]);

  const renderBill = useCallback(({ item }) => {
    const overdue = String(item.status).toUpperCase() === 'OVERDUE';
    const supplyNo = item.supplyNo || userInfo?.supplyNumber || userInfo?.meterNumber || '—';
    const units = item.unitsUsed ?? item.units ?? item.consumption ?? '—';
    const title = item.period || item.month || item.billId || item.billNumber || 'Water bill';

    return (
      <View style={styles.billCard}>
        <View style={styles.billTop}>
          <Text style={styles.billTitle} numberOfLines={1}>{title}</Text>
          <View style={[styles.statusBadge, overdue && styles.overdueBadge]}>
            <Text style={[styles.statusText, overdue && styles.overdueText]}>
              {overdue ? 'OVERDUE' : 'PENDING'}
            </Text>
          </View>
        </View>
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Supply number</Text>
            <Text style={styles.detailValue}>{supplyNo}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Meter readings</Text>
            <Text style={styles.detailValue}>
              {item.prevReading ?? item.previousReading ?? '—'} → {item.currReading ?? item.currentReading ?? '—'} ({units} units)
            </Text>
          </View>
          <View style={[styles.detailRow, { marginBottom: 0 }]}>
            <Text style={styles.detailLabel}>Due date</Text>
            <Text style={styles.detailValue}>{formatDate(item.dueDate)}</Text>
          </View>
        </View>
        <View style={styles.billBottom}>
          <View>
            <Text style={styles.amountLabel}>Amount due</Text>
            <Text style={styles.amount}>${getAmount(item).toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handlePayPress(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            <Ionicons name="card-outline" size={17} color="#FFFFFF" />
            <Text style={styles.payButtonText}>Pay now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handlePayPress, styles, userInfo]);

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.stateContainer}>
          <ActivityIndicator size="large" color={COLORS.blue} />
          <Text style={styles.stateSubtitle}>Loading your bills...</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.stateContainer}>
          <Ionicons name="cloud-offline-outline" size={46} color={COLORS.muted} />
          <Text style={styles.stateTitle}>Could not load your bills</Text>
          <Text style={styles.stateSubtitle}>Check your connection and try again.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              fetchLiveBills();
            }}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <EmptyState
        styles={styles}
        onHistoryPress={() => navigation.navigate('PaymentHistory', { userInfo })}
      />
    );
  };

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
        <Text style={styles.headerTitle}>My unpaid bills</Text>
      </View>

      <FlatList
        data={loading || error ? [] : unpaidBills}
        renderItem={renderBill}
        keyExtractor={(item, index) => String(item._id || item.billId || index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={(
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL BALANCE DUE</Text>
            <View style={styles.summaryBottom}>
              {loading ? (
                <View style={styles.loadingAmount}><ActivityIndicator color="#FFFFFF" /></View>
              ) : error ? (
                <Text style={styles.summaryAmount}>—</Text>
              ) : (
                <Text style={styles.summaryAmount}>${totalBalanceDue.toFixed(2)}</Text>
              )}
              <View style={styles.summaryBadge}>
                <Text style={styles.summaryBadgeText}>
                  {loading ? 'Loading' : error ? 'Unavailable' : unpaidBills.length > 0 ? `${unpaidBills.length} due` : 'Up to date'}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={renderEmptyState}
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

export default ViewBillsScreen;
