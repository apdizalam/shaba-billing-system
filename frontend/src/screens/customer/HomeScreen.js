import React, { useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import billService from '../../services/bill.service';
import { Ionicons } from '@expo/vector-icons';
import { resolveCustomerUserInfo } from '../../utils/customerSession';
import api from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ route, navigation }) {
  const authContext = useContext(AuthContext) || {};
  const { globalThemeState } = authContext;
  const userInfo = useMemo(
    () => resolveCustomerUserInfo(route, authContext),
    [route?.params?.userInfo, authContext?.userInfo]
  );

  const [loading, setLoading] = useState(true);
  const [latestBill, setLatestBill] = useState(null);
  const [error, setError] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    const rawUser = userInfo;
    return {
      ...rawUser,
      profileImage: rawUser?.avatar || rawUser?.profileImage || null
    };
  });

  const [customerAvatar, setCustomerAvatar] = useState("https://via.placeholder.com/40");
  const [customerName, setCustomerName] = useState("abdisalam");

  const loadHeaderMetadata = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = JSON.parse(window.localStorage.getItem('user') || '{}');
        if (stored.name) setCustomerName(stored.name);
        if (stored.avatar) setCustomerAvatar(stored.avatar);
      }
    } catch (e) {
      console.log("localStorage error:", e.message);
    }
    try {
      const stored = await AsyncStorage.getItem('userData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const u = parsed.user || parsed;
        if (u.fullName || u.name) setCustomerName(u.fullName || u.name);
        if (u.avatar || u.profileImage) setCustomerAvatar(u.avatar || u.profileImage);
      }
    } catch (e) {
      console.log("AsyncStorage error:", e.message);
    }
  }, []);

  useEffect(() => {
    loadHeaderMetadata();

    const handleAvatarChange = () => {
      loadHeaderMetadata();
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener("customer_avatar_changed", handleAvatarChange);
    }
    return () => {
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener("customer_avatar_changed", handleAvatarChange);
      }
    };
  }, [loadHeaderMetadata]);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data) {
        setUserProfile({
          ...response.data,
          profileImage: response.data.avatar || response.data.profileImage || null
        });
      }
    } catch (err) {
      console.warn("Failed to fetch profile on Home:", err.message);
    }
  }, []);

  const fetchLatestBill = useCallback(async () => {
    const customerId = userInfo?._id || userInfo?.user?._id;
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      setError(false);
      const bills = await billService.getCustomerBills(customerId);
      if (Array.isArray(bills) && bills.length > 0) {
        // Sort by date or id, but getCustomerBills is already sorted by createdAt desc
        setLatestBill(bills[0]);
      } else {
        setLatestBill(null);
      }
    } catch (err) {
      console.warn("Failed to fetch latest bill on Home:", err.message);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [userInfo]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProfile();
      fetchLatestBill();
      loadHeaderMetadata();
    }, [fetchProfile, fetchLatestBill, loadHeaderMetadata])
  );

  const displayName = userProfile?.fullName || userProfile?.name || 'Customer';
  const fullName = userInfo?.fullName || userInfo?.name || '';


  const isDarkMode = globalThemeState === 'dark';
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDarkMode ? '#121212' : '#F1F7F3',
    },
    text: {
      color: isDarkMode ? '#FFFFFF' : '#000000',
    },
    welcomeText: {
      color: isDarkMode ? '#FFFFFF' : '#0A4D2E',
      fontWeight: '600',
      fontSize: 18,
    }
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor="transparent" translucent={true} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <View className="flex-row justify-between items-center mb-8 mt-4 px-6">
          <View className="flex-row items-center">
            <Text style={styles.welcomeText}>{customerName || fullName}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
            style={{ width: 45, height: 45, borderRadius: 22.5, overflow: 'hidden', borderWidth: 1.5, borderColor: '#34D399', marginLeft: 10 }}
          >
            <Image 
              source={{ uri: customerAvatar || 'https://via.placeholder.com/40' }}
              style={{ width: 45, height: 45, borderRadius: 22.5 }}
            />
          </TouchableOpacity>
        </View>

        <View className="px-6 mb-6">
        </View>

        <View style={{ backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff' }} className="rounded-[24px] p-6 mx-6 mb-6 shadow-sm">
          <View className="flex-row justify-between items-center mb-6">
            <Text style={{ color: isDarkMode ? '#ffffff' : '#111827' }} className="text-[17px] font-medium">Account Overview</Text>
            <Ionicons name="wallet-outline" size={24} color={isDarkMode ? '#aaaaaa' : '#6b7280'} />
          </View>

          <View className="gap-y-3">
            <TouchableOpacity
              onPress={() => navigation.navigate('Pay Bill', { userInfo })}
              className="w-full bg-[#0B5E36] rounded-xl flex-row items-center justify-center py-4"
            >
              <Ionicons name="cash-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-semibold text-base">Pay Bill Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ViewBills', { userInfo })}
              className="w-full bg-[#e5e7eb] rounded-xl flex-row items-center justify-center py-4"
            >
              <Ionicons name="receipt-outline" size={20} color="#1f2937" style={{ marginRight: 8 }} />
              <Text className="text-gray-800 font-semibold text-base">View My Bills</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('PaymentHistory', { userInfo })}
              className="w-full bg-transparent border-[1.5px] border-[#0B5E36] rounded-xl flex-row items-center justify-center py-4"
            >
              <Ionicons name="time-outline" size={20} color="#0B5E36" style={{ marginRight: 8 }} />
              <Text className="text-[#0B5E36] font-semibold text-base">Payment History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Profile', { userInfo })}
              className="w-full bg-transparent border-[1.5px] border-[#0B5E36] rounded-xl flex-row items-center justify-center py-4"
            >
              <Ionicons name="person-outline" size={20} color="#0B5E36" style={{ marginRight: 8 }} />
              <Text className="text-[#0B5E36] font-semibold text-base">My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
