import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import billService from '../../services/bill.service';
import authService from '../../services/auth.service';
import BillCard from '../../components/BillCard';
import { buildCustomerNavParams, resolveCustomerUserInfo } from '../../utils/customerSession';
import { Ionicons } from '@expo/vector-icons';

const MyBillsScreen = ({ route, navigation }) => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    
    const authContext = useContext(AuthContext) || {};
    const routeParams = route?.params || {};
    const userInfo = resolveCustomerUserInfo(route, authContext);
    const filterStatus = routeParams?.filterStatus;

    const fetchBills = async () => {
        try {
            setError(false);
            const customerId = userInfo?.user?._id || userInfo?._id;
            let targetId = customerId;
            if (!targetId) {
                const stored = await authService.getCurrentUser();
                targetId = stored?.user?._id || stored?._id;
            }
            
            if (targetId) {
                const data = await billService.getCustomerBills(targetId, filterStatus);
                setBills(Array.isArray(data) ? data : []);
            } else {
                setBills([]);
            }
        } catch (err) {
            console.error('Fetch bills error:', err.message);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchBills();
        }, [userInfo, filterStatus])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBills();
    }, [userInfo, filterStatus]);

    const handlePayPress = (bill) => {
        navigation.navigate('Pay Bill', buildCustomerNavParams(route, authContext, {
            billId: bill._id,
            supplyNo: bill.supplyNo || '1',
            amountDue: bill.amount || bill.amountDue,
            period: bill.period || bill.month,
            customerName: bill.customerName || (bill.customerId && bill.customerId.fullName) || 'Unknown',
            previousReading: bill.prevReading ?? bill.previousReading ?? '-',
            currentReading: bill.currReading ?? bill.currentReading ?? '-',
            units: bill.unitsUsed ?? bill.units ?? bill.consumption ?? '-',
            billDate: bill.billDate || bill.createdAt,
            dueDate: bill.dueDate,
        }));
    };

    const renderItem = useCallback(({ item }) => {
        return <BillCard bill={item} onPayPress={() => handlePayPress(item)} />;
    }, [navigation]);

    const filteredBills = useMemo(() => (
        filterStatus ? bills.filter(bill => String(bill.status).toUpperCase() === filterStatus) : bills
    ), [bills, filterStatus]);

    const totalBalanceDue = useMemo(() => {
        return bills.filter(b => String(b.status || '').toLowerCase() === 'pending').reduce((sum, b) => {
            const amt = b.amountDue !== undefined ? b.amountDue : (b.amount !== undefined ? b.amount : 0);
            return sum + parseFloat(amt || 0);
        }, 0);
    }, [bills]);

    const renderPaymentItem = useCallback(({ item }) => {
        const amt = item.amountDue !== undefined ? item.amountDue : (item.amount !== undefined ? item.amount : 0);
        return (
            <View className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100">
                <Text className="text-gray-800 font-bold mb-1">Muddada: {item.period || item.month || '—'}</Text>
                <Text className="text-gray-600 mb-1">Supply No: {item.supplyNo || '—'}</Text>
                <Text className="text-gray-800 font-semibold mb-1">Lacagta: ${parseFloat(amt).toFixed(2)}</Text>
                <Text className="text-gray-500 text-xs mb-2">Taariikhda: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}</Text>
                <View className="bg-green-100 self-start px-2 py-1 rounded">
                    <Text className="text-green-700 text-xs font-bold">Guulaystay (Paid)</Text>
                </View>
            </View>
        );
    }, []);

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#0B5E36" />
                <Text className="text-gray-500 text-sm mt-2">Loading bills...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50 px-6">
                <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
                <Text className="text-gray-700 text-center font-semibold mt-3 text-base">Cilad farsamo ayaa dhacday</Text>
                <TouchableOpacity
                    onPress={() => {
                        setLoading(true);
                        fetchBills();
                    }}
                    className="bg-[#0B5E36] px-5 py-2.5 rounded-xl mt-4"
                >
                    <Text className="text-white font-bold text-sm">Dib u tijaabi (Retry)</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50">
            <View className="p-4 flex-1">
                <Text className="text-xl font-bold mb-4 text-gray-800">
                    {filterStatus === 'PAID' ? 'Payment History' : 'My Bills'}
                </Text>
                {filteredBills.length === 0 ? (
                    <Text className="text-gray-500 text-center mt-10">
                        {filterStatus === 'PAID' ? 'No payment history found' : 'No bills found'}
                    </Text>
                ) : (
                    <FlatList
                        data={filteredBills}
                        renderItem={filterStatus === 'PAID' ? renderPaymentItem : renderItem}
                        keyExtractor={(item) => item._id}
                        initialNumToRender={10}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    />
                )}
            </View>

            {/* Persistent Footer Aggregate Layout */}
            <View className={`p-4 border-t ${totalBalanceDue > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <Text className={`font-bold text-center ${totalBalanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    Total Lacagta Laguu Leeyahay (Total Balance Due)
                </Text>
                <Text className={`text-2xl font-extrabold text-center mt-1 ${totalBalanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                    ${totalBalanceDue.toFixed(2)}
                </Text>
            </View>
        </View>
    );
};

export default MyBillsScreen;
