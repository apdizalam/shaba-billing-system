import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import customerService from '../../services/customer.service';
import { useNavigation } from '@react-navigation/native';

const CustomersScreen = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const data = await customerService.getCustomers();
            setCustomers(data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchCustomers();
    };

    const navigation = useNavigation();

    const renderItem = ({ item }) => (
        <View className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100 flex-row justify-between items-center">
            <View>
                <Text className="font-bold text-gray-800">{item.fullName || item.username}</Text>
                <Text className="text-gray-500">Phone: {item.phone || item.phoneNumber || 'N/A'}</Text>
                <Text className="text-gray-500">Meter: {item.meterNumber || item.supplyNo || ''}
                    {!(item.meterNumber || item.supplyNo) ? (
                        <Text className="text-red-600 font-semibold">  Unassigned / Sugaya Mitir</Text>
                    ) : null}
                </Text>
            </View>
            <View className="flex-row items-center">
                {!(item.meterNumber || item.supplyNo) && (
                    <TouchableOpacity
                        onPress={() => navigation.navigate('CreateMeter', { customerId: item._id })}
                        className="bg-blue-600 px-3 py-2 rounded-lg mr-2"
                    >
                        <Text className="text-white">Assign Meter</Text>
                    </TouchableOpacity>
                )}
                <Text className={`font-bold ${item.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {item.isActive ? 'Active' : (item.registrationStatus || 'Pending')}
                </Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-600 mt-2">Loading customers...</Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 p-4">
            <Text className="text-xl font-bold mb-4 text-gray-800">Customers</Text>

            {customers.length === 0 ? (
                <View className="flex-1 justify-center items-center">
                    <Text className="text-gray-500 text-center">No customers found</Text>
                    <Text className="text-gray-400 text-sm text-center mt-2">
                        Customers will appear here once they register
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={customers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                />
            )}
        </View>
    );
};

export default CustomersScreen;
