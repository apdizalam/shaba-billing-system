import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import Input from '../../components/Input';
import Button from '../../components/Button';
import customerService from '../../services/customer.service';

const CreateCustomerScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [group, setGroup] = useState('');
    const [address, setAddress] = useState('');
    const [meterNumber, setMeterNumber] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        // Validate all fields
        if (!fullName || !phoneNumber || !address || !meterNumber || !username || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        if (!group) {
            Alert.alert('Error', 'Please select customer group (Guuri, Ganacsi, Dawladd)');
            return;
        }

        setLoading(true);
        try {
            // normalize Somali group labels to backend enum values
            const groupMap = {
                'guuri': 'Households',
                'ganacsi': 'Commercial',
                'dawladd': 'Shops',
                'dawladdh': 'Shops'
            };
            const groupKey = (group || '').toString().trim().toLowerCase();
            const normalizedGroup = groupMap[groupKey] || (['households','commercial','shops'].includes(groupKey) ? (groupKey === 'households' ? 'Households' : groupKey === 'commercial' ? 'Commercial' : 'Shops') : null);
            if (!normalizedGroup) {
                Alert.alert('Error', 'Group should be one of: Guuri, Ganacsi, Dawladd');
                setLoading(false);
                return;
            }

            const customerData = {
                fullName,
                phone: phoneNumber,
                address,
                meterNumber,
                username,
                password,
                group: normalizedGroup
            };

            const result = await customerService.createCustomer(customerData);

            Alert.alert(
                'Success',
                `Customer created successfully!\nName: ${result.fullName}\nUsername: ${result.username}`,
                [{
                    text: 'OK',
                    onPress: () => {
                        // Clear form
                        setFullName('');
                        setPhoneNumber('');
                        setAddress('');
                        setMeterNumber('');
                        setUsername('');
                        setPassword('');
                        navigation.goBack();
                    }
                }]
            );
        } catch (error) {
            console.error('Error creating customer:', error);
            const errorMessage = error.response?.data?.message || 'Failed to create customer';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView className="flex-1 bg-white p-6">
            <Text className="text-xl font-bold mb-6 text-gray-800">Register New Customer</Text>

            <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter customer's full name"
            />

            <Input
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
            />

            <Input
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Enter customer's address"
            />

            <Input
                label="Group"
                value={group}
                onChangeText={setGroup}
                placeholder="Guuri / Ganacsi / Dawladd"
                autoCapitalize="words"
            />

            <Input
                label="Meter Number"
                value={meterNumber}
                onChangeText={setMeterNumber}
                placeholder="Enter meter number (e.g., M1001)"
                autoCapitalize="characters"
            />

            <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
                autoCapitalize="none"
            />

            <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a password"
                secureTextEntry
            />

            <Button
                title="Create Customer"
                onPress={handleCreate}
                isLoading={loading}
            />
        </ScrollView>
    );
};

export default CreateCustomerScreen;
