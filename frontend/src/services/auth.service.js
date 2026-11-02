import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// MOCK DATA SWITCH
const USE_MOCK_DATA = false;

const login = async (username, password) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(async () => {
                const role = username.toLowerCase().includes('admin') ? 'admin' : 'customer';
                const mockUser = {
                    user: {
                        _id: role === 'admin' ? 'admin_id' : 'customer_id',
                        username: username,
                        role: role,
                        fullName: role === 'admin' ? 'Admin User' : 'John Doe',
                    },
                    token: 'mock-jwt-token-123456'
                };
                await AsyncStorage.setItem('userToken', mockUser.token);
                await AsyncStorage.setItem('userData', JSON.stringify(mockUser));
                resolve(mockUser);
            }, 500);
        });
    }

    const response = await api.post('/auth/login', { username: username.trim(), email: username.trim(), password });
    if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
};

const register = async (username, password, role, fullName, phoneNumber, address, email, group) => {
    if (USE_MOCK_DATA) {
         return new Promise((resolve) => {
            setTimeout(async () => {
                const mockUser = {
                    user: {
                        _id: 'new_user_id',
                        username: username,
                        role: role || 'customer',
                        fullName: fullName,
                        phoneNumber: phoneNumber,
                        address: address,
                    },
                    token: 'mock-register-token-789'
                };
                await AsyncStorage.setItem('userToken', mockUser.token);
                await AsyncStorage.setItem('userData', JSON.stringify(mockUser));
                resolve(mockUser);
            }, 500);
        });
    }

    const response = await api.post('/auth/register', {
        username,
        password,
        role,
        fullName,
        phoneNumber,
        address,
        email,
        group
    });
    if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data));
    }
    return response.data;
};

const logout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
};

const getCurrentUser = async () => {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
};

export default {
    login,
    register,
    logout,
    getCurrentUser,
};
