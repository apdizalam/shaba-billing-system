import React, { useState, useContext, useEffect } from 'react';
import { View, Text, Alert, Linking, Platform, SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Input from '../../components/Input';
import Button from '../../components/Button';
import paymentService from '../../services/payment.service';
import billService from '../../services/bill.service';
import { AuthContext } from '../../context/AuthContext';
import { resolveCustomerUserInfo } from '../../utils/customerSession';
import axios from 'axios';

const PayBillScreen = ({ navigation, route }) => {
    const authContext = useContext(AuthContext) || {};
    const { globalThemeState } = authContext;
    const routeParams = route?.params || {};
    const { userInfo: routeUserInfo } = routeParams;
    const userInfo = resolveCustomerUserInfo(route, authContext) || routeUserInfo || {};

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

    const customerName = routeCustomerName || userInfo?.fullName || userInfo?.username || 'Customer';

    // Initialize state with route parameters or default to empty strings
    const [supplyNumber, setSupplyNumber] = useState(supplyNo || '');
    const [paymentAmount, setPaymentAmount] = useState(amountDue ? String(amountDue) : '');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [gateway, setGateway] = useState('somtel');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Auto-fill from user profile if not passed via route
        if (!supplyNumber) {
            if (routeParams?.supplyNo) {
                 setSupplyNumber(routeParams.supplyNo);
            } else if (userInfo?.supplyNo) {
                 setSupplyNumber(userInfo.supplyNo);
            } else if (userInfo?.user?.supplyNo) {
                 setSupplyNumber(userInfo.user.supplyNo);
            } else if (userInfo?.user?.meterNumber || userInfo?.meterNumber) {
                 setSupplyNumber(userInfo.user?.meterNumber || userInfo.meterNumber);
            }
        }

        if (!paymentAmount && routeParams?.amountDue) {
            setPaymentAmount(String(routeParams.amountDue));
        }
    }, [userInfo, routeParams, supplyNumber, paymentAmount]);

    const setAmount = setPaymentAmount;
    const setAccountNumber = setSupplyNumber;
    const setReferenceNotes = setPhoneNumber;
    const setBillDetails = null;

    useEffect(() => {
        // Clear form inputs when entering or exiting the Pay Bill screen context cleanly
        return () => {
            setAmount("");
            setAccountNumber("");
            setReferenceNotes("");
            if (typeof setBillDetails === 'function') setBillDetails(null);
            console.log("Pay Bill input parameters successfully wiped out upon screen exit.");
        };
    }, []);

    const handlePayment = async () => {
        if (!supplyNumber || !paymentAmount || !phoneNumber) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        const userProfile = userInfo;
        const amount = paymentAmount;
        const paymentGateway = gateway;
        const supplyNo = supplyNumber;

        const setSupplyNo = setSupplyNumber;
        const setAmount = setPaymentAmount;

        setLoading(true);
        try {
            const response = await axios.post('http://192.168.8.52:5000/api/payments/pay', {
                customerId: userInfo?._id || userProfile?._id,
                supplyNo: supplyNo,
                amount: amount,
                gateway: paymentGateway, // Somtel / E-Dahab
                phoneNumber: phoneNumber
            });

            if (billId) {
                try {
                    await billService.payBill(billId);
                } catch (payErr) {
                    console.warn("Direct MongoDB bill status flip failed:", payErr.message);
                }
            }

            Alert.alert('Success', 'Payment completed successfully. Status updated.');
            
            // Clear data so user doesn't double-tap old bills
            setSupplyNo('');
            setAmount('');
            setPhoneNumber('');

            navigation.goBack();
        } catch (error) {
            Alert.alert(
                'Payment Failed',
                error.response?.data?.message || error.message || 'Payment initiation failed. Check connection.',
                [{ text: 'OK' }]
            );
        } finally {
            setLoading(false);
        }
    };

    const isDarkMode = globalThemeState === 'dark';
    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDarkMode ? '#121212' : '#FFFFFF',
        },
        text: {
            color: isDarkMode ? '#FFFFFF' : '#111827',
        },
        dropdownStyle: {
            height: 55,
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#ccc',
            borderRadius: 8,
            justifyContent: 'center',
            paddingHorizontal: 10,
            backgroundColor: isDarkMode ? '#1e1e1e' : '#fff'
        }
    });

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }} className="text-xl font-bold mb-4">Pay Bill via Somtel / E-Dahab</Text>

            <View className="mb-4 p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#eff6ff', borderColor: isDarkMode ? '#333333' : '#dbeafe' }}>
                <Text style={{ color: isDarkMode ? '#cccccc' : '#374151' }} className="text-sm font-semibold mb-2">
                    Bill Generated: {billDate ? new Date(billDate).toLocaleDateString() : 'N/A'}
                </Text>
                <Text className="text-sm font-bold text-red-600">
                    Haddii aan lagu bixin ka hor {dueDate ? new Date(dueDate).toLocaleDateString() : '[DueDate]'}, adeegga biyaha waa laga goyn doonaa.
                </Text>
            </View>

            <View className="mb-6 p-4 rounded-lg border" style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#f9fafb', borderColor: isDarkMode ? '#333333' : '#e5e7eb' }}>
                <Text style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }} className="text-sm font-bold mb-2">Customer: {customerName || 'N/A'}</Text>
                <View className="flex-row justify-between mb-1">
                    <Text style={{ color: isDarkMode ? '#cccccc' : '#4b5563' }} className="text-xs font-medium">Previous Reading:</Text>
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }} className="text-xs font-bold">{previousReading ?? '-'}</Text>
                </View>
                <View className="flex-row justify-between mb-1">
                    <Text style={{ color: isDarkMode ? '#cccccc' : '#4b5563' }} className="text-xs font-medium">Current Reading:</Text>
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }} className="text-xs font-bold">{currentReading ?? '-'}</Text>
                </View>
                <View className="flex-row justify-between mt-2 pt-2 border-t" style={{ borderTopColor: isDarkMode ? '#333333' : '#e5e7eb' }}>
                    <Text style={{ color: isDarkMode ? '#ffffff' : '#1f2937' }} className="text-sm font-bold">Consumed Units:</Text>
                    <Text className="text-sm font-extrabold text-blue-600" style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}>{units ?? '-'}</Text>
                </View>
            </View>

            <Input
                label="Supply No"
                value={supplyNumber}
                onChangeText={setSupplyNumber}
                placeholder="Enter Supply Number"
                autoCapitalize="characters"
            />

            <Input
                label="Amount (USD)"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Enter Amount"
                keyboardType="numeric"
            />

            <View className="mb-4">
                <Text style={{ color: isDarkMode ? '#cccccc' : '#374151' }} className="text-sm font-medium mb-2">Payment Gateway</Text>
                <View style={styles.dropdownStyle}>
                    <Picker
                        selectedValue={gateway}
                        onValueChange={(itemValue) => setGateway(itemValue)}
                        style={{ height: 55, color: isDarkMode ? '#ffffff' : '#000000' }}
                        dropdownIconColor={isDarkMode ? '#ffffff' : '#000000'}
                    >
                        <Picker.Item label="Somtel (E-Dahab)" value="somtel" />
                    </Picker>
                </View>
            </View>

            <Input
                label="Somtel Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="252..."
                keyboardType="phone-pad"
            />

            <Button
                title="Pay Now"
                onPress={handlePayment}
                isLoading={loading}
            />
            </ScrollView>
        </SafeAreaView>
    );
};

export default PayBillScreen;
