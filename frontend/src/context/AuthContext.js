import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import authService from '../services/auth.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [userToken, setUserToken] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [globalThemeState, setGlobalThemeState] = useState('light');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('globalThemeState');
                if (storedTheme) {
                    setGlobalThemeState(storedTheme);
                }
            } catch (e) {
                console.log("Error loading theme:", e);
            }
        };
        loadTheme();
    }, []);

    const updateTheme = async (theme) => {
        setGlobalThemeState(theme);
        try {
            await AsyncStorage.setItem('globalThemeState', theme);
        } catch (e) {
            console.log("Error saving theme:", e);
        }
    };

    const login = async (username, password) => {
        setIsLoading(true);
        try {
            const data = await authService.login(username, password);
            setUserToken(data.token);
            setUserInfo(data);
            setIsLoading(false);
            return data;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const register = async (username, password, role, fullName, phoneNumber, address, email, group) => {
        setIsLoading(true);
        try {
            const data = await authService.register(username, password, role, fullName, phoneNumber, address, email, group);
            setUserToken(data.token);
            setUserInfo(data);
            setIsLoading(false);
            return data;
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        setIsLoading(true);
        await authService.logout();
        setUserToken(null);
        setUserInfo(null);
        setIsLoading(false);
    };

    const isLoggedIn = async () => {
        try {
            setIsLoading(true);
            let userToken = await AsyncStorage.getItem('userToken');
            let userInfo = await AsyncStorage.getItem('userData');
            userInfo = JSON.parse(userInfo);

            if (userInfo) {
                setUserToken(userToken);
                setUserInfo(userInfo);
            }

            setIsLoading(false);
        } catch (e) {
            console.log(`isLoggedIn error ${e}`);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        isLoggedIn();
    }, []);

    return (
        <AuthContext.Provider value={{ login, register, logout, isLoading, userToken, userInfo, setUserToken, setUserInfo, globalThemeState, setGlobalThemeState: updateTheme }}>
            {children}
        </AuthContext.Provider>
    );
};
