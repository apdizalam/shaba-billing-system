import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '../../services/payment.service';
import { AuthContext } from '../../context/AuthContext';
import { resolveCustomerUserInfo } from '../../utils/customerSession';

const COLORS = {
  blue: '#2436B2',
  ink: '#111A3A',
  muted: '#626D79',
  background: '#F3F6F8',
};

const formatAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'N/A'
    : date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const PayBillScreen = ({ navigation, route }) => {
  const authContext = useContext(AuthContext) || {};
  const isDarkMode = authContext.globalThemeState === 'dark';
  const routeParams = route?.params || {};
  const userInfo = resolveCustomerUserInfo(route, authContext) || {};

  const customerName =
    routeParams.customerName ||
    userInfo?.fullName ||
    userInfo?.name ||
    userInfo?.username ||
    'Customer';
  const [supplyNumber, setSupplyNumber] = useState(routeParams.supplyNo || '');
  const [paymentAmount, setPaymentAmount] = useState(
    routeParams.amountDue !== undefined && routeParams.amountDue !== null
      ? String(routeParams.amountDue)
      : ''
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gateway, setGateway] = useState('edahab');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (routeParams.supplyNo) setSupplyNumber(routeParams.supplyNo);
    if (routeParams.amountDue !== undefined && routeParams.amountDue !== null) {
      setPaymentAmount(String(routeParams.amountDue));
    }
  }, [routeParams.supplyNo, routeParams.amountDue, routeParams.billId]);

  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: isDarkMode ? '#121826' : COLORS.background },
    header: {
      minHeight: 76,
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: isDarkMode ? '#333E4D' : '#E4E9EF',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    backButton: { width: 42, height: 48, justifyContent: 'center' },
    headerText: { marginLeft: 12 },
    title: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 20, fontWeight: '700' },
    subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 2 },
    scrollContent: { padding: 20, paddingBottom: 24 },
    content: { width: '100%', maxWidth: 560, alignSelf: 'center' },
    warning: {
      flexDirection: 'row',
      backgroundColor: isDarkMode ? '#351D16' : '#FFF4EF',
      borderColor: '#FFBEA8',
      borderWidth: 1,
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
      alignItems: 'flex-start',
    },
    warningIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: '#C83F08',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 1,
    },
    warningTitle: { color: isDarkMode ? '#FDBA9B' : '#8B3214', fontSize: 15, fontWeight: '700' },
    warningText: { color: isDarkMode ? '#FDBA9B' : '#A63D16', fontSize: 14, lineHeight: 20, marginTop: 4, flexShrink: 1 },
    billCard: {
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      borderRadius: 22,
      padding: 18,
      marginBottom: 20,
    },
    customerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    customerLabel: { color: COLORS.muted, fontSize: 14 },
    customerValue: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 15, fontWeight: '700', marginLeft: 12, flexShrink: 1 },
    readings: { flexDirection: 'row', gap: 8 },
    readingBox: { flex: 1, minHeight: 70, borderRadius: 16, padding: 12, justifyContent: 'space-between' },
    readingLabel: { color: COLORS.muted, fontSize: 13 },
    readingValue: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 19, fontWeight: '700' },
    unitsBox: { backgroundColor: isDarkMode ? '#28315B' : '#E5E9FF' },
    unitsLabel: { color: isDarkMode ? '#C7CEFF' : COLORS.blue, fontSize: 13 },
    unitsValue: { color: isDarkMode ? '#C7CEFF' : COLORS.blue, fontSize: 19, fontWeight: '700' },
    fieldGroup: { marginBottom: 18 },
    fieldLabel: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 },
    input: {
      height: 58,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#495364' : '#B9C3CE',
      borderRadius: 14,
      color: isDarkMode ? '#F3F4F6' : COLORS.ink,
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      paddingHorizontal: 16,
      fontSize: 16,
    },
    amountInputRow: {
      height: 58,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#495364' : '#B9C3CE',
      borderRadius: 14,
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      flexDirection: 'row',
      overflow: 'hidden',
      alignItems: 'center',
    },
    currency: {
      height: '100%',
      minWidth: 54,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#263142' : '#F3F6F8',
      borderRightWidth: 1,
      borderRightColor: isDarkMode ? '#495364' : '#D8DEE5',
    },
    currencyText: { color: isDarkMode ? '#F3F4F6' : '#414B56', fontSize: 18, fontWeight: '700' },
    amountInput: { flex: 1, height: '100%', paddingHorizontal: 16, color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 17 },
    walletOptions: { flexDirection: 'row', gap: 10 },
    walletOption: {
      flex: 1,
      minHeight: 70,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#495364' : '#B9C3CE',
      borderRadius: 16,
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      padding: 12,
      justifyContent: 'center',
    },
    walletOptionSelected: {
      borderColor: COLORS.blue,
      backgroundColor: isDarkMode ? '#20294D' : '#F2F3FF',
      borderWidth: 2,
    },
    walletTitle: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 15, fontWeight: '700' },
    walletSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
    phoneRow: {
      height: 58,
      borderWidth: 1.5,
      borderColor: isDarkMode ? '#495364' : '#B9C3CE',
      borderRadius: 14,
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    phonePrefix: {
      height: '100%',
      minWidth: 62,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#263142' : '#F3F6F8',
      borderRightWidth: 1,
      borderRightColor: isDarkMode ? '#495364' : '#D8DEE5',
    },
    phonePrefixText: { color: isDarkMode ? '#F3F4F6' : '#414B56', fontSize: 15, fontWeight: '700' },
    phoneInput: { flex: 1, height: '100%', paddingHorizontal: 14, color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 16 },
    helper: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
    footer: {
      backgroundColor: isDarkMode ? '#1C2433' : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDarkMode ? '#333E4D' : '#E4E9EF',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    },
    footerContent: { width: '100%', maxWidth: 560, alignSelf: 'center' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    totalLabel: { color: COLORS.muted, fontSize: 15 },
    totalAmount: { color: isDarkMode ? '#F3F4F6' : COLORS.ink, fontSize: 17, fontWeight: '700' },
    payButton: {
      minHeight: 58,
      borderRadius: 32,
      backgroundColor: COLORS.blue,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    payButtonDisabled: { opacity: 0.55 },
    payButtonText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginLeft: 10 },
  }), [isDarkMode]);

  const amount = Number(paymentAmount);
  const canPay = Boolean(supplyNumber.trim() && phoneNumber.trim() && Number.isFinite(amount) && amount > 0 && !loading);

  const handlePayment = async () => {
    if (!supplyNumber.trim() || !phoneNumber.trim() || !Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Check payment details', 'Enter a supply number, a valid amount, and your wallet phone number.');
      return;
    }

    const walletDigits = phoneNumber.replace(/\D/g, '').replace(/^252/, '');
    if (walletDigits.length < 6) {
      Alert.alert('Invalid phone number', 'Enter a valid mobile wallet number.');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.initiatePayment({
        meterNumber: supplyNumber.trim(),
        billId: routeParams.billId,
        amount,
        phoneNumber: walletDigits,
        gateway,
      });

      const paymentStatus = String(response?.payment?.status || '').toUpperCase();
      if (paymentStatus === 'FAILED') {
        Alert.alert(
          'Payment failed',
          response?.sifaloResponse?.message || 'The wallet provider could not start this payment.'
        );
        return;
      }

      Alert.alert(
        paymentStatus === 'SUCCESS' ? 'Payment successful' : 'Confirm payment',
        paymentStatus === 'SUCCESS'
          ? 'Your payment was confirmed.'
          : 'A payment prompt was sent to your phone. Approve it to complete the payment.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Payment failed',
        error.response?.data?.message || error.message || 'Could not start the payment. Check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color={isDarkMode ? '#F3F4F6' : COLORS.ink} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Pay bill</Text>
          <Text style={styles.subtitle}>via Somtel · E-Dahab</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.content}>
            <View style={styles.warning}>
              <View style={styles.warningIcon}>
                <Ionicons name="alert" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.warningTitle}>Bill generated: {formatDate(routeParams.billDate)}</Text>
                <Text style={styles.warningText}>
                  Haddii aan lagu bixin ka hor {formatDate(routeParams.dueDate)}, adeegga biyaha waa laga goyn doonaa.
                </Text>
              </View>
            </View>

            <View style={styles.billCard}>
              <View style={styles.customerRow}>
                <Text style={styles.customerLabel}>Customer</Text>
                <Text style={styles.customerValue} numberOfLines={1}>{customerName}</Text>
              </View>
              <View style={styles.readings}>
                <View style={[styles.readingBox, { backgroundColor: isDarkMode ? '#263142' : '#F3F6F8' }]}>
                  <Text style={styles.readingLabel}>Previous</Text>
                  <Text style={styles.readingValue}>{routeParams.previousReading ?? '—'}</Text>
                </View>
                <View style={[styles.readingBox, { backgroundColor: isDarkMode ? '#263142' : '#F3F6F8' }]}>
                  <Text style={styles.readingLabel}>Current</Text>
                  <Text style={styles.readingValue}>{routeParams.currentReading ?? '—'}</Text>
                </View>
                <View style={[styles.readingBox, styles.unitsBox]}>
                  <Text style={styles.unitsLabel}>Used units</Text>
                  <Text style={styles.unitsValue}>{routeParams.units ?? '—'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Supply number</Text>
              <TextInput
                style={styles.input}
                value={supplyNumber}
                onChangeText={setSupplyNumber}
                placeholder="e.g. SHB-MTR-0001"
                placeholderTextColor={isDarkMode ? '#8490A0' : '#7B8085'}
                autoCapitalize="characters"
                accessibilityLabel="Supply number"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Amount (USD)</Text>
              <View style={styles.amountInputRow}>
                <View style={styles.currency}><Text style={styles.currencyText}>$</Text></View>
                <TextInput
                  style={styles.amountInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="0.00"
                  placeholderTextColor={isDarkMode ? '#8490A0' : '#7B8085'}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Payment amount in US dollars"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Pay with</Text>
              <View style={styles.walletOptions}>
                <TouchableOpacity
                  style={[styles.walletOption, gateway === 'edahab' && styles.walletOptionSelected]}
                  onPress={() => setGateway('edahab')}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: gateway === 'edahab' }}
                >
                  <Text style={styles.walletTitle}>E-Dahab</Text>
                  <Text style={styles.walletSubtitle}>Somtel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.walletOption, gateway === 'zaad' && styles.walletOptionSelected]}
                  onPress={() => setGateway('zaad')}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: gateway === 'zaad' }}
                >
                  <Text style={styles.walletTitle}>Zaad</Text>
                  <Text style={styles.walletSubtitle}>Telesom</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{gateway === 'edahab' ? 'Somtel phone number' : 'Telesom phone number'}</Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}><Text style={styles.phonePrefixText}>+252</Text></View>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="Phone number"
                  placeholderTextColor={isDarkMode ? '#8490A0' : '#7B8085'}
                  keyboardType="phone-pad"
                  accessibilityLabel="Mobile wallet phone number"
                />
              </View>
              <Text style={styles.helper}>You'll get a prompt on this phone to confirm the payment.</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total to pay</Text>
              <Text style={styles.totalAmount}>${formatAmount(paymentAmount)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.payButton, !canPay && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={!canPay}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canPay, busy: loading }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="lock-closed-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>Pay now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default PayBillScreen;
