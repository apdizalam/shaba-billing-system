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
import { AuthContext } from '../../context/AuthContext';
import paymentService from '../../services/payment.service';
import { resolveCustomerUserInfo } from '../../utils/customerSession';

const COLORS = {
    blue: '#2436B2',
    ink: '#111A3A',
    muted: '#626D79',
    background: '#F3F6F8',
    border: '#BBC4CF',
};

const formatDate = (date) => {
    if (!date) return 'N/A';

    const dateOnly = String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsedDate = dateOnly
        ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
        : new Date(date);

    return Number.isNaN(parsedDate.getTime()) ? 'N/A' : parsedDate.toLocaleDateString();
};

const PayBillScreen = ({ navigation, route }) => {
    const authContext = useContext(AuthContext) || {};
    const { globalThemeState } = authContext;
    const routeParams = route?.params || {};
    const userInfo = useMemo(
        () => resolveCustomerUserInfo(route, authContext),
        [route?.params?.userInfo, authContext?.userInfo]
    );
    const {
        billId,
        supplyNo,
        customerName: routeCustomerName,
        previousReading,
        currentReading,
        units,
        amountDue,
        billDate,
        dueDate,
    } = routeParams;
    const customerName =
        routeCustomerName || userInfo?.fullName || userInfo?.username || 'Customer';
    const profileSupplyNumber =
        userInfo?.supplyNo ||
        userInfo?.supplyNumber ||
        userInfo?.meterNumber ||
        userInfo?.user?.supplyNo ||
        userInfo?.user?.supplyNumber ||
        userInfo?.user?.meterNumber;

    const [supplyNumber, setSupplyNumber] = useState(supplyNo || profileSupplyNumber || '');
    const [paymentAmount, setPaymentAmount] = useState(
        amountDue !== undefined && amountDue !== null ? String(amountDue) : ''
    );
    const [phoneNumber, setPhoneNumber] = useState('');
    const [gateway, setGateway] = useState('edahab');
    const [loading, setLoading] = useState(false);
    const isDarkMode = globalThemeState === 'dark';

    useEffect(() => {
        setSupplyNumber(supplyNo || profileSupplyNumber || '');
        setPaymentAmount(
            amountDue !== undefined && amountDue !== null ? String(amountDue) : ''
        );
    }, [supplyNo, profileSupplyNumber, amountDue]);

    const palette = isDarkMode
        ? {
              background: '#121826',
              surface: '#1C2433',
              input: '#171F2D',
              ink: '#F3F4F6',
              muted: '#A5AFBC',
              border: '#3A4655',
              soft: '#252F40',
              blueSoft: '#252E5D',
          }
        : {
              background: COLORS.background,
              surface: '#FFFFFF',
              input: '#FFFFFF',
              ink: COLORS.ink,
              muted: COLORS.muted,
              border: COLORS.border,
              soft: '#F3F6F8',
              blueSoft: '#E5E9FF',
          };

    const numericAmount = Number(paymentAmount);
    const amountIsValid =
        /^\d+(?:\.\d{1,2})?$/.test(paymentAmount.trim()) &&
        Number.isFinite(numericAmount) &&
        numericAmount > 0;
    const amountDisplay = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : '0.00';
    const phoneDigits = phoneNumber.replace(/\D/g, '');

    const handlePayment = async () => {
        if (!supplyNumber.trim() || !amountIsValid || !phoneDigits) {
            Alert.alert('Missing payment details', 'Enter a supply number, a valid amount, and your mobile wallet number.');
            return;
        }

        setLoading(true);
        try {
            const result = await paymentService.initiatePayment({
                meterNumber: supplyNumber.trim(),
                amount: amountDisplay,
                gateway,
                phoneNumber: phoneDigits,
                billId,
            });
            const status = String(result?.payment?.status || '').toUpperCase();

            if (status === 'FAILED') {
                Alert.alert(
                    'Payment failed',
                    result?.sifaloResponse?.message || 'The wallet provider could not process this payment.'
                );
                return;
            }

            if (status === 'SUCCESS') {
                Alert.alert('Payment successful', 'Your payment has been confirmed.');
                navigation.navigate('Home', { userInfo });
                return;
            }

            Alert.alert(
                'Confirm payment',
                'A payment request was sent to your phone. Approve it in your mobile wallet to complete payment.'
            );
        } catch (error) {
            Alert.alert(
                'Payment failed',
                error?.response?.data?.message ||
                    error?.message ||
                    'We could not start the payment. Check your connection and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const styles = StyleSheet.create({
        screen: { flex: 1, backgroundColor: palette.background },
        header: {
            minHeight: 76,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            backgroundColor: palette.surface,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: palette.border,
        },
        backButton: {
            width: 38,
            height: 48,
            justifyContent: 'center',
            alignItems: 'flex-start',
            marginRight: 10,
        },
        title: { color: palette.ink, fontSize: 22, fontWeight: '700' },
        subtitle: { color: palette.muted, fontSize: 14, marginTop: 1 },
        content: {
            width: '100%',
            maxWidth: 560,
            alignSelf: 'center',
            paddingHorizontal: 20,
            paddingTop: 18,
            paddingBottom: 24,
        },
        warning: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            padding: 16,
            borderRadius: 20,
            backgroundColor: isDarkMode ? '#38271F' : '#FFF4EF',
            borderWidth: 1,
            borderColor: isDarkMode ? '#6A3A27' : '#FFC5AF',
            marginBottom: 18,
        },
        warningIcon: {
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: '#C9400B',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            marginTop: 1,
        },
        warningTitle: { color: isDarkMode ? '#FFD0BC' : '#7B2C12', fontSize: 16, fontWeight: '700' },
        warningText: {
            color: isDarkMode ? '#FDBA9A' : '#A63C18',
            fontSize: 14,
            lineHeight: 20,
            marginTop: 4,
        },
        billCard: {
            padding: 16,
            borderRadius: 22,
            backgroundColor: palette.surface,
            marginBottom: 18,
        },
        customerRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
        },
        customerLabel: { color: palette.muted, fontSize: 14 },
        customerName: { color: palette.ink, fontSize: 16, fontWeight: '700', marginLeft: 12, flexShrink: 1 },
        readings: { flexDirection: 'row', justifyContent: 'space-between' },
        readingTile: {
            flex: 1,
            minHeight: 62,
            paddingHorizontal: 11,
            paddingVertical: 10,
            borderRadius: 16,
            backgroundColor: palette.soft,
            marginRight: 8,
            justifyContent: 'space-between',
        },
        lastReadingTile: { marginRight: 0, backgroundColor: palette.blueSoft },
        readingLabel: { color: palette.muted, fontSize: 12 },
        readingValue: { color: palette.ink, fontSize: 19, lineHeight: 22, fontWeight: '600', marginTop: 4 },
        usedValue: { color: COLORS.blue },
        fieldGroup: { marginBottom: 16 },
        label: { color: palette.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 },
        input: {
            height: 54,
            borderWidth: 1.2,
            borderColor: palette.border,
            borderRadius: 14,
            backgroundColor: palette.input,
            paddingHorizontal: 16,
            color: palette.ink,
            fontSize: 16,
        },
        amountInputWrapper: {
            height: 54,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.2,
            borderColor: palette.border,
            borderRadius: 14,
            backgroundColor: palette.input,
            overflow: 'hidden',
        },
        currency: {
            width: 46,
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.soft,
            borderRightWidth: 1,
            borderRightColor: palette.border,
        },
        currencyText: { color: palette.muted, fontSize: 20, fontWeight: '600' },
        amountInput: { flex: 1, paddingHorizontal: 14, color: palette.ink, fontSize: 16, height: '100%' },
        walletRow: { flexDirection: 'row', justifyContent: 'space-between' },
        walletOption: {
            flex: 1,
            minHeight: 64,
            paddingHorizontal: 13,
            paddingVertical: 9,
            borderRadius: 15,
            borderWidth: 1.2,
            borderColor: palette.border,
            backgroundColor: palette.surface,
            justifyContent: 'center',
        },
        selectedWallet: {
            borderWidth: 2,
            borderColor: COLORS.blue,
            backgroundColor: palette.blueSoft,
        },
        firstWallet: { marginRight: 10 },
        walletTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' },
        walletSubtitle: { color: palette.muted, fontSize: 12, marginTop: 2 },
        phoneInputWrapper: {
            height: 54,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.2,
            borderColor: palette.border,
            borderRadius: 14,
            backgroundColor: palette.input,
            overflow: 'hidden',
        },
        countryCode: {
            height: '100%',
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.soft,
            borderRightWidth: 1,
            borderRightColor: palette.border,
        },
        countryCodeText: { color: palette.ink, fontSize: 15, fontWeight: '600' },
        phoneInput: { flex: 1, paddingHorizontal: 14, color: palette.ink, fontSize: 16, height: '100%' },
        helper: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
        footer: {
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 12,
            backgroundColor: palette.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: palette.border,
        },
        footerContent: { width: '100%', maxWidth: 560, alignSelf: 'center' },
        totalRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
        },
        totalLabel: { color: palette.muted, fontSize: 15 },
        totalAmount: { color: palette.ink, fontSize: 18, fontWeight: '700' },
        payButton: {
            minHeight: 58,
            borderRadius: 32,
            backgroundColor: COLORS.blue,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        payButtonDisabled: { opacity: 0.65 },
        payButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginLeft: 9 },
    });

    const selectedWalletLabel = gateway === 'edahab' ? 'Somtel phone number' : 'Telesom phone number';
    const walletSubtitle = gateway === 'edahab' ? 'via Somtel · E-Dahab' : 'via Telesom · Zaad';

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Home', { userInfo })}
                    accessibilityRole="button"
                    accessibilityLabel="Back to home"
                >
                    <Ionicons name="chevron-back" size={28} color={palette.ink} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>Pay bill</Text>
                    <Text style={styles.subtitle}>{walletSubtitle}</Text>
                </View>
              </View>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.warning}>
                        <View style={styles.warningIcon}>
                            <Ionicons name="alert" size={22} color="#FFFFFF" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.warningTitle}>Bill generated: {formatDate(billDate)}</Text>
                            <Text style={styles.warningText}>
                                Haddii aan lagu bixin ka hor {formatDate(dueDate)}, adeegga biyaha waa laga goyn doonaa.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.billCard}>
                        <View style={styles.customerRow}>
                            <Text style={styles.customerLabel}>Customer</Text>
                            <Text style={styles.customerName} numberOfLines={1}>{customerName}</Text>
                        </View>
                        <View style={styles.readings}>
                            <View style={styles.readingTile}>
                                <Text style={styles.readingLabel}>Previous</Text>
                                <Text style={styles.readingValue}>{previousReading ?? '—'}</Text>
                            </View>
                            <View style={styles.readingTile}>
                                <Text style={styles.readingLabel}>Current</Text>
                                <Text style={styles.readingValue}>{currentReading ?? '—'}</Text>
                            </View>
                            <View style={[styles.readingTile, styles.lastReadingTile]}>
                                <Text style={[styles.readingLabel, { color: isDarkMode ? '#B7C3FF' : '#283895' }]}>
                                    Used units
                                </Text>
                                <Text style={[styles.readingValue, styles.usedValue]}>{units ?? '—'}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Supply number</Text>
                        <TextInput
                            style={styles.input}
                            value={supplyNumber}
                            onChangeText={setSupplyNumber}
                            placeholder="e.g. SHB-MTR-0001"
                            placeholderTextColor={palette.muted}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            accessibilityLabel="Supply number"
                        />
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Amount (USD)</Text>
                        <View style={styles.amountInputWrapper}>
                            <View style={styles.currency}>
                                <Text style={styles.currencyText}>$</Text>
                            </View>
                            <TextInput
                                style={styles.amountInput}
                                value={paymentAmount}
                                onChangeText={(value) => setPaymentAmount(value.replace(/[^\d.]/g, ''))}
                                placeholder="0.00"
                                placeholderTextColor={palette.muted}
                                keyboardType="decimal-pad"
                                accessibilityLabel="Amount in USD"
                            />
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Pay with</Text>
                        <View style={styles.walletRow}>
                            <TouchableOpacity
                                style={[
                                    styles.walletOption,
                                    styles.firstWallet,
                                    gateway === 'edahab' && styles.selectedWallet,
                                ]}
                                onPress={() => setGateway('edahab')}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: gateway === 'edahab' }}
                            >
                                <Text style={styles.walletTitle}>E-Dahab</Text>
                                <Text style={styles.walletSubtitle}>Somtel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.walletOption,
                                    gateway === 'zaad' && styles.selectedWallet,
                                ]}
                                onPress={() => setGateway('zaad')}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: gateway === 'zaad' }}
                            >
                                <Text style={styles.walletTitle}>Zaad</Text>
                                <Text style={styles.walletSubtitle}>Telesom mobile money</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>{selectedWalletLabel}</Text>
                        <View style={styles.phoneInputWrapper}>
                            <View style={styles.countryCode}>
                                <Text style={styles.countryCodeText}>+252</Text>
                            </View>
                            <TextInput
                                style={styles.phoneInput}
                                value={phoneNumber}
                                onChangeText={(value) => setPhoneNumber(value.replace(/\D/g, '').slice(0, 15))}
                                placeholder="Phone number"
                                placeholderTextColor={palette.muted}
                                keyboardType="phone-pad"
                                autoComplete="tel-national"
                                accessibilityLabel={selectedWalletLabel}
                            />
                        </View>
                        <Text style={styles.helper}>
                            You'll get a prompt on this phone to confirm the payment.
                        </Text>
                    </View>
                </ScrollView>

                <View style={styles.footer}>
                    <View style={styles.footerContent}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Total to pay</Text>
                            <Text style={styles.totalAmount}>${amountDisplay}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.payButton, loading && styles.payButtonDisabled]}
                            onPress={handlePayment}
                            disabled={loading}
                            accessibilityRole="button"
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="lock-closed-outline" size={21} color="#FFFFFF" />
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
