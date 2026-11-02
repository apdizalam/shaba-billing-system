import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import Input from '../../components/Input';
import Button from '../../components/Button';
import meterService from '../../services/meter.service';
import customerService from '../../services/customer.service';

const CreateMeterScreen = ({ navigation, route }) => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedCustomerName, setSelectedCustomerName] = useState('-- Select a Customer --');
    const [meterNumber, setMeterNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [fetchingCustomers, setFetchingCustomers] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    useEffect(() => {
        // If navigated with a customerId, preselect that customer
        const pre = route?.params?.customerId;
        if (pre && customers.length > 0) {
            const found = customers.find(c => c._id === pre);
            if (found) {
                setSelectedCustomerId(found._id);
                setSelectedCustomerName(`${found.fullName} (${found.username})`);
            }
        }
    }, [route, customers]);

    const fetchCustomers = async () => {
        try {
            console.log('Fetching customers...');
            const data = await customerService.getCustomers();
            console.log('Customers fetched:', data);

            if (!data || data.length === 0) {
                Alert.alert('Info', 'No customers found. Please register customers first.');
            }

            setCustomers(data || []);
        } catch (error) {
            console.error('Error fetching customers:', error);
            console.error('Error response:', error.response?.data);

            const errorMessage = error.response?.data?.message
                || error.message
                || 'Failed to load customers. Please check your connection.';

            Alert.alert('Error', errorMessage);
        } finally {
            setFetchingCustomers(false);
        }
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomerId(customer._id);
        setSelectedCustomerName(`${customer.fullName} (${customer.username})`);
        setModalVisible(false);
    };

    const handleCreate = async () => {
        if (!selectedCustomerId || !meterNumber) {
            Alert.alert('Error', 'Please select a customer and enter a meter number');
            return;
        }

        setLoading(true);
        try {
            const result = await meterService.createMeter(selectedCustomerId, meterNumber);

            Alert.alert(
                'Success',
                `Meter created successfully!\nMeter Number: ${result.meterNumber}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create meter');
        } finally {
            setLoading(false);
        }
    };

    if (fetchingCustomers) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <Text className="text-gray-600">Loading customers...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <Text className="text-xl font-bold mb-6 text-gray-800">Create New Meter</Text>

            {customers.length === 0 ? (
                <View className="bg-yellow-50 p-4 rounded-lg mb-4 border border-yellow-200">
                    <Text className="text-yellow-800 font-semibold">No customers available</Text>
                    <Text className="text-yellow-700 text-sm mt-1">
                        Please register customers first before creating meters.
                    </Text>
                </View>
            ) : null}

            <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Select Customer</Text>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="border border-gray-300 rounded-lg p-4 bg-white"
                >
                    <Text className={selectedCustomerId ? "text-gray-800" : "text-gray-400"}>
                        {selectedCustomerName}
                    </Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white rounded-lg w-[90%] max-h-[70%]">
                        <View className="p-4 border-b border-gray-200">
                            <Text className="text-lg font-bold text-gray-800">Select Customer</Text>
                        </View>
                        <FlatList
                            data={customers}
                            keyExtractor={(item) => item._id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectCustomer(item)}
                                    className="p-4 border-b border-gray-100"
                                >
                                    <Text className="text-gray-800 font-semibold">{item.fullName}</Text>
                                    <Text className="text-gray-500 text-sm">{item.username}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity
                            onPress={() => setModalVisible(false)}
                            className="p-4 border-t border-gray-200"
                        >
                            <Text className="text-center text-blue-600 font-semibold">Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Input
                label="Meter Number"
                value={meterNumber}
                onChangeText={setMeterNumber}
                placeholder="Enter unique meter number (e.g., M1001)"
                autoCapitalize="characters"
            />

            <Button
                title="Create Meter"
                onPress={handleCreate}
                isLoading={loading}
            />
        </ScrollView>
    );
};

export default CreateMeterScreen;
