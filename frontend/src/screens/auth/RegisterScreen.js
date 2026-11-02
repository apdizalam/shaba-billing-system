import React, { useContext, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { AuthContext } from '../../context/AuthContext';

const RegisterScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [group, setGroup] = useState('');
    const { register, isLoading } = useContext(AuthContext);

    const handleRegister = async () => {
        if (!username || !password || !fullName || !phoneNumber || !address || !group) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            // Register customer (no meter info) — admin will assign meters later
            await register(username, password, 'customer', fullName, phoneNumber, address, email, group);
            // clear form state on success
            setUsername(''); setPassword(''); setFullName(''); setPhoneNumber(''); setAddress(''); setEmail(''); setGroup('');
        } catch (error) {
            Alert.alert(
                'Registration Failed',
                error.response?.data?.message || error.message || 'Something went wrong. Check your connection.'
            );
        }
    };

    return (
        <View className="flex-1 justify-center px-6 bg-white">
            <Text className="text-3xl font-bold text-blue-600 mb-8 text-center">Create Account</Text>

            <Input
                label="Full Name"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
            />

            <Input
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
            />

            <Input
                label="Address"
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your address"
            />

            <Input
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
            />

            <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Dooro Nooca Macaamilka...</Text>
                <View className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <Picker
                        selectedValue={group}
                        onValueChange={(val) => setGroup(val)}
                    >
                        <Picker.Item label="Dooro Nooca Macaamilka..." value="" />
                        <Picker.Item label="Guuri" value="Guuri" />
                        <Picker.Item label="Ganacsi" value="Ganacsi" />
                        <Picker.Item label="Dawladd" value="Dawladd" />
                    </Picker>
                </View>
            </View>

            {/* Meter number removed from self-registration. Admin will assign meters later. */}

            <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
            />

            <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a password"
                secureTextEntry
            />

            <Button
                title="Register"
                onPress={handleRegister}
                isLoading={isLoading}
            />

            <View className="flex-row justify-center mt-6">
                <Text className="text-gray-600">Already have an account? </Text>
                <Text
                    className="text-blue-600 font-bold"
                    onPress={() => navigation.navigate('Login')}
                >
                    Login
                </Text>
            </View>
        </View>
    );
};

export default RegisterScreen;
