import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import billService from '../../services/bill.service';

const BillsScreen = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchBills = async () => {
        try {
            const data = await billService.getBills();
            setBills(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBills();
    };

    const renderItem = ({ item }) => (
        <View className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100">
            <View className="flex-row justify-between mb-2">
                <Text className="font-bold text-gray-800">{item.customer?.fullName || 'Unknown Customer'}</Text>
                <Text className={`font-bold ${item.status === 'PAID' ? 'text-green-600' : item.status === 'OVERDUE' ? 'text-red-600' : 'text-orange-600'}`}>
                    {item.status}
                </Text>
            </View>
            <View className="flex-row justify-between">
                 <Text className="text-gray-600">Bill ID: {item.billId}</Text>
                 <Text className="text-gray-800 font-semibold">${item.amount}</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-1">Due: {new Date(item.dueDate).toLocaleDateString()}</Text>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <Text className="text-xl font-bold mb-4 text-gray-800">All Bills</Text>
            <FlatList
                data={bills}
                renderItem={renderItem}
                keyExtractor={(item) => item._id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                     <Text className="text-center text-gray-500 mt-10">No bills found</Text>
                }
            />
        </View>
    );
};

export default BillsScreen;
