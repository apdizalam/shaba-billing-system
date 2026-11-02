import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import Input from '../../components/Input';
import Button from '../../components/Button';
import billService from '../../services/bill.service';

const CreateBillScreen = ({ navigation }) => {
    const [meterNumber, setMeterNumber] = useState('');
    const [month, setMonth] = useState('');
    const [currentReading, setCurrentReading] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!meterNumber || !month || !currentReading || !amount) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const result = await billService.generateBill({
                meterNumber,
                month,
                currentReading: Number(currentReading),
                amount: Number(amount)
            });

            Alert.alert(
                'Success',
                `Bill generated successfully!\nBill ID: ${result.billId}\nAmount: $${result.amount}`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to generate bill');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <Text className="text-xl font-bold mb-6 text-gray-800">Generate New Bill</Text>

            <Input
                label="Meter Number"
                value={meterNumber}
                onChangeText={setMeterNumber}
                placeholder="Enter Meter Number (e.g., M1001)"
                autoCapitalize="characters"
            />

            <Input
                label="Billing Month"
                value={month}
                onChangeText={setMonth}
                placeholder="YYYY-MM (e.g. 2024-01)"
            />

            <Input
                label="Current Reading"
                value={currentReading}
                onChangeText={setCurrentReading}
                placeholder="Enter numerical reading"
                keyboardType="numeric"
            />
            
            <Input
                label="Bill Amount ($)"
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter bill amount"
                keyboardType="numeric"
            />

            <Button
                title="Generate Bill"
                onPress={handleCreate}
                isLoading={loading}
            />
        </ScrollView>
    );
};

export default CreateBillScreen;
