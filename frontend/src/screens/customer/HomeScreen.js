import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import billService from '../../services/bill.service';
import { resolveCustomerUserInfo } from '../../utils/customerSession';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COLORS = {
  blue: '#2436B2',
  green: '#A3EDB2',
  ink: '#111A3A',
  muted: '#626D79',
  background: '#F3F6F8',
};

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const formatBillPeriod = (period) => {
  if (!period) return 'Water bill';

  const match = String(period).match(/^(\d{4})-(\d{1,2})$/);
  if (match) {
    const month = new Date(Number(match[1]), Number(match[2]) - 1).toLocaleString(undefined, {
      month: 'long',
    });
    return `${month} bill`;
  }

  return `${period} bill`;
};

const formatShortDate = (date) => {
  if (!date) return '—';
  const dateOnly = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(date);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getInitials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'SH';
  return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
};

const getBillAmount = (bill) => bill?.amountDue ?? bill?.amount ?? 0;
const getBillDate = (bill) => bill?.updatedAt || bill?.createdAt || bill?.billDate;
const getBillDueTimestamp = (bill) => {
  const timestamp = bill?.dueDate ? new Date(bill.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

const ShortcutCard = ({ styles, title, subtitle, icon, color, backgroundColor, onPress }) => (
  <TouchableOpacity style={styles.shortcut} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.shortcutIcon, { backgroundColor }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <View>
      <Text style={styles.shortcutTitle} numberOfLines={1}>{title}</Text>
      <Text style={styles.shortcutSubtitle} numberOfLines={1}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

export default function HomeScreen({ route, navigation }) {
  const authContext = useContext(AuthContext) || {};
  const { globalThemeState } = authContext;
  const userInfo = useMemo(
    () => resolveCustomerUserInfo(route, authContext),
    [route?.params?.userInfo, authContext?.userInfo]
  );
  const customerId = userInfo?._id || userInfo?.user?._id;
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userProfile, setUserProfile] = useState(userInfo);
  const isDarkMode = globalThemeState === 'dark';

  const palette = isDarkMode
    ? {
        background: '#121826',
        surface: '#1C2433',
        ink: '#F3F4F6',
        muted: '#A5AFBC',
        border: '#333E4D',
      }
    : {
        background: COLORS.background,
        surface: '#FFFFFF',
        ink: COLORS.ink,
        muted: COLORS.muted,
        border: '#E4E9EF',
      };

  const loadCachedProfile = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem('userData');
      if (cached) {
        const parsed = JSON.parse(cached);
        const profile = parsed.user || parsed;
        setUserProfile((current) => ({ ...current, ...profile }));
      }
    } catch (err) {
      console.warn('Failed to load cached customer profile:', err.message);
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = JSON.parse(window.localStorage.getItem('user') || '{}');
        setUserProfile((current) => ({ ...current, ...cached }));
      } catch (err) {
        console.warn('Failed to load cached customer profile:', err.message);
      }
    }
  }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      const profile = response.data?.user || response.data;
      if (profile) {
        setUserProfile((current) => ({ ...current, ...profile }));
      }
    } catch (err) {
      console.warn('Failed to fetch customer profile on Home:', err.message);
    }
  }, []);

  const fetchBills = useCallback(async () => {
    if (!customerId) {
      setBills([]);
      setError(true);
      console.warn('Cannot fetch customer bills on Home: missing customer ID.');
      setLoading(false);
      return;
    }

    try {
      setError(false);
      const customerBills = await billService.getCustomerBills(customerId);
      setBills(Array.isArray(customerBills) ? customerBills : []);
    } catch (err) {
      console.warn('Failed to fetch customer bills on Home:', err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
      fetchBills();
      loadCachedProfile();
    }, [fetchProfile, fetchBills, loadCachedProfile])
  );

  const displayName =
    userProfile?.fullName ||
    userProfile?.name ||
    userInfo?.fullName ||
    userInfo?.name ||
    userInfo?.username ||
    'Customer';
  const avatar = userProfile?.avatar || userProfile?.profileImage || null;
  const sortedBills = useMemo(
    () => [...bills].sort((a, b) => new Date(getBillDate(b) || 0) - new Date(getBillDate(a) || 0)),
    [bills]
  );
  const unpaidBills = useMemo(
    () => sortedBills.filter((bill) => ['pending', 'unpaid', 'overdue'].includes(String(bill.status).toLowerCase())),
    [sortedBills]
  );
  const paidBills = useMemo(
    () => sortedBills.filter((bill) => String(bill.status).toLowerCase() === 'paid'),
    [sortedBills]
  );
  const balanceDue = unpaidBills.reduce((sum, bill) => sum + (Number(getBillAmount(bill)) || 0), 0);
  const nextUnpaidBill = useMemo(
    () => [...unpaidBills].sort((a, b) => getBillDueTimestamp(a) - getBillDueTimestamp(b))[0],
    [unpaidBills]
  );
  const latestPaidBill = paidBills[0];
  const supplyNumber =
    nextUnpaidBill?.supplyNo ||
    userProfile?.supplyNo ||
    userProfile?.supplyNumber ||
    userProfile?.meterNumber ||
    userInfo?.supplyNo ||
    userInfo?.supplyNumber ||
    userInfo?.meterNumber ||
    '—';
  const latestPaymentUnits =
    latestPaidBill?.unitsUsed ?? latestPaidBill?.units ?? latestPaidBill?.consumption ?? 0;

  const openPayBill = () => {
    if (!nextUnpaidBill) {
      navigation.navigate('Pay Bill', { userInfo });
      return;
    }

    navigation.navigate('Pay Bill', {
      userInfo,
      billId: nextUnpaidBill._id,
      supplyNo: nextUnpaidBill.supplyNo || supplyNumber,
      amountDue: getBillAmount(nextUnpaidBill),
      period: nextUnpaidBill.period || nextUnpaidBill.month,
      customerName: displayName,
      previousReading: nextUnpaidBill.prevReading ?? nextUnpaidBill.previousReading,
      currentReading: nextUnpaidBill.currReading ?? nextUnpaidBill.currentReading,
      units: nextUnpaidBill.unitsUsed ?? nextUnpaidBill.units,
      billDate: nextUnpaidBill.billDate || nextUnpaidBill.createdAt,
      dueDate: nextUnpaidBill.dueDate,
    });
  };

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    scrollContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
    content: { width: '100%', maxWidth: 560, alignSelf: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    initials: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: COLORS.green,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    initialsText: { color: COLORS.blue, fontSize: 20, fontWeight: '800' },
    greeting: { color: palette.muted, fontSize: 14, marginBottom: 2 },
    name: { color: palette.ink, fontSize: 20, lineHeight: 25, fontWeight: '700' },
    settingsButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    balanceCard: {
      backgroundColor: COLORS.blue,
      borderRadius: 26,
      padding: 22,
      marginBottom: 20,
      overflow: 'hidden',
    },
    decorativeRing: {
      position: 'absolute',
      width: 190,
      height: 190,
      borderRadius: 95,
      borderWidth: 16,
      borderColor: 'rgba(255,255,255,0.07)',
      top: -72,
      right: -42,
    },
    balanceTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    balanceTitle: { color: '#E8EBFF', fontSize: 16, fontWeight: '500' },
    statusBadge: {
      backgroundColor: COLORS.green,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    statusText: { color: '#175A32', fontSize: 12, fontWeight: '700' },
    balanceAmount: { color: '#FFFFFF', fontSize: 42, lineHeight: 50, fontWeight: '800' },
    billMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 18,
    },
    billMetaText: { color: '#E0E5FF', fontSize: 12, flexShrink: 1 },
    payButton: {
      minHeight: 52,
      borderRadius: 30,
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    payButtonText: { color: COLORS.blue, fontSize: 17, fontWeight: '700', marginLeft: 8 },
    shortcutGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
      marginBottom: 22,
    },
    shortcut: {
      width: '48.3%',
      minHeight: 120,
      borderRadius: 20,
      backgroundColor: palette.surface,
      padding: 16,
      justifyContent: 'space-between',
    },
    shortcutIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shortcutTitle: { color: palette.ink, fontSize: 16, fontWeight: '700', marginTop: 12 },
    shortcutSubtitle: { color: palette.muted, fontSize: 13, marginTop: 2 },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    sectionTitle: { color: palette.ink, fontSize: 19, fontWeight: '700' },
    seeAll: { color: COLORS.blue, fontSize: 15, fontWeight: '600' },
    paymentCard: {
      minHeight: 82,
      borderRadius: 20,
      backgroundColor: palette.surface,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    paymentIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#DDF7E4',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    paymentInfo: { flex: 1, minWidth: 0 },
    paymentTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' },
    paymentSubtitle: { color: palette.muted, fontSize: 12, marginTop: 3 },
    paymentAmount: { color: palette.ink, fontSize: 16, fontWeight: '700', marginLeft: 8 },
    emptyPayment: { color: palette.muted, fontSize: 14 },
    billError: { color: '#FDE68A', fontSize: 12, marginTop: 6 },
  });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              setLoading(true);
              fetchBills();
              fetchProfile();
            }}
            tintColor={COLORS.blue}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.initials}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={styles.initialsText}>{getInitials(displayName)}</Text>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Profile', { userInfo })}
              accessibilityRole="button"
              accessibilityLabel="Open settings and profile"
            >
              <Ionicons name="settings-outline" size={24} color={palette.ink} />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceCard}>
            <View pointerEvents="none" style={styles.decorativeRing} />
            <View style={styles.balanceTop}>
              <Text style={styles.balanceTitle}>Balance due</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {loading ? 'Loading' : error ? 'Unavailable' : unpaidBills.length > 0 ? 'Payment due' : 'All paid'}
                </Text>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" style={{ alignSelf: 'flex-start', height: 50 }} />
            ) : (
              <Text style={styles.balanceAmount}>${formatAmount(balanceDue)}</Text>
            )}
            <View style={styles.billMeta}>
              <Text style={styles.billMetaText} numberOfLines={1}>Supply No · {supplyNumber}</Text>
              <Text style={[styles.billMetaText, { marginLeft: 10 }]} numberOfLines={1}>
                Next bill: {nextUnpaidBill?.dueDate ? formatShortDate(nextUnpaidBill.dueDate) : '—'}
              </Text>
            </View>
            {error && <Text style={styles.billError}>Could not load your bills. Pull down to retry.</Text>}
            <TouchableOpacity
              style={styles.payButton}
              onPress={openPayBill}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons name="card-outline" size={22} color={COLORS.blue} />
              <Text style={styles.payButtonText}>Pay bill now</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shortcutGrid}>
            <ShortcutCard
              styles={styles}
              title="My bills"
              subtitle={`${unpaidBills.length} unpaid`}
              icon="receipt-outline"
              color={COLORS.blue}
              backgroundColor="#E5E9FF"
              onPress={() => navigation.navigate('ViewBills', { userInfo })}
            />
            <ShortcutCard
              styles={styles}
              title="Payment history"
              subtitle={`${paidBills.length} ${paidBills.length === 1 ? 'payment' : 'payments'}`}
              icon="time-outline"
              color="#168044"
              backgroundColor="#DDF7E4"
              onPress={() => navigation.navigate('PaymentHistory', { userInfo })}
            />
            <ShortcutCard
              styles={styles}
              title="My profile"
              subtitle="Account details"
              icon="person-outline"
              color="#46515C"
              backgroundColor="#E8EDF1"
              onPress={() => navigation.navigate('Profile', { userInfo })}
            />
            <ShortcutCard
              styles={styles}
              title="Get help"
              subtitle="Report a problem"
              icon="call-outline"
              color="#D34214"
              backgroundColor="#FFE7DE"
              onPress={() => Alert.alert('Get help', 'Please contact Shaba Water support for help with your account or bills.')}
            />
          </View>

          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Last payment</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('PaymentHistory', { userInfo })}
              accessibilityRole="button"
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.paymentCard}
            onPress={() => navigation.navigate('PaymentHistory', { userInfo })}
            activeOpacity={0.8}
          >
            <View style={styles.paymentIcon}>
              <Ionicons name={latestPaidBill ? 'checkmark' : 'receipt-outline'} size={22} color="#168044" />
            </View>
            {latestPaidBill ? (
              <>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentTitle} numberOfLines={1}>
                    {formatBillPeriod(latestPaidBill.period || latestPaidBill.month)}
                  </Text>
                  <Text style={styles.paymentSubtitle} numberOfLines={1}>
                    Paid {formatShortDate(getBillDate(latestPaidBill))} · {latestPaymentUnits} units
                  </Text>
                </View>
                <Text style={styles.paymentAmount}>${formatAmount(getBillAmount(latestPaidBill))}</Text>
              </>
            ) : (
              <Text style={styles.emptyPayment}>No payments yet</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
