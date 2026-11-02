import React, { useContext, useState } from 'react';
import { View, Text, Alert, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { AuthContext } from '../../context/AuthContext';

const LoginScreen = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true);
    const [loading, setLoading] = useState(false);
    const { login, setUserToken, setUserInfo } = useContext(AuthContext) || {};

    const handleLogin = async () => {
        const trimmedUser = username.trim();
        if (!trimmedUser || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            if (login) {
                // The backend routes might dynamically check email or username.
                // Our authService login payload maps both keys to double-check both authentication styles.
                await login(trimmedUser, password);
            } else {
                throw new Error('Authentication context is not ready.');
            }
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            const message = apiMessage || (
                error?.response
                    ? 'The login service could not complete your request. Please try again.'
                    : 'Could not reach the login server. Check your connection and try again.'
            );
            console.warn('Login request failed:', error?.response?.status || error?.message);
            Alert.alert('Cilad', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center px-6 bg-white">
            <Text className="text-3xl font-bold text-blue-600 mb-8 text-center">Shaba Water</Text>

            <Input
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Enter your username"
            />

            {/* Password input with absolute right positioning for Show/Hide Eye icon */}
            <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-1">Password</Text>
                <View style={{ justifyContent: 'center', position: 'relative' }}>
                    <TextInput
                        className="bg-gray-100 border border-gray-300 rounded-lg pl-4 pr-12 py-3 text-gray-800 text-base"
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Enter your password"
                        secureTextEntry={secureText}
                        autoCapitalize="none"
                        style={{ height: 50 }}
                    />
                    <TouchableOpacity 
                        onPress={() => setSecureText(!secureText)} 
                        style={{ position: 'absolute', right: 15, height: '100%', justifyContent: 'center' }}
                    >
                        <Ionicons 
                            name={secureText ? "eye-off-outline" : "eye-outline"} 
                            size={22} 
                            color="#4B5563" 
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <Button
                title="Login"
                onPress={handleLogin}
                isLoading={loading}
            />
        </View>
    );
};

export default LoginScreen;
