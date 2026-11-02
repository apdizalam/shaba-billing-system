import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Match the admin dashboard's account database; set EXPO_PUBLIC_API_BASE for local development.
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE || 'https://backend-q2g2.onrender.com/api';

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
