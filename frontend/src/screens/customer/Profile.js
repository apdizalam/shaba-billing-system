import React, { useState, useEffect, useContext, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Switch, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

const ProfileScreen = ({ route, navigation }) => {
  const authContext = useContext(AuthContext) || {};
  const { logout, setUserInfo, globalThemeState, setGlobalThemeState } = authContext;
  const routeParams = route?.params || {};
  const userInfo = routeParams.userInfo ?? authContext.userInfo?.user ?? authContext.userInfo ?? {};

  const user = userInfo || {};

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const [fullName, setFullName] = useState(userInfo?.fullName || ''); 
  const [supplyNo, setSupplyNo] = useState(userInfo?.supplyNumber || userInfo?.supplyNo || userInfo?.meterNumber || '');
  const [email, setEmail] = useState(userInfo?.email || '');
  const [username, setUsername] = useState(userInfo?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(userInfo?.phone || userInfo?.phoneNumber || '');
  const [address, setAddress] = useState(userInfo?.address || '');
  const [group, setGroup] = useState(userInfo?.group || 'Guuri');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState(userInfo?.avatar || userInfo?.profileImage || null);
  const isDarkMode = globalThemeState === 'dark';

  const fetchProfile = useCallback(async () => {
    try {
      setError(false);

      // 1. Immediately read from cache so fields are NEVER blank
      try {
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const parsed = JSON.parse(stored);
          const u = parsed.user || parsed;
          if (u) {
            if (u.fullName || u.name) setFullName(u.fullName || u.name);
            if (u.username) setUsername(u.username);
            if (u.email) setEmail(u.email);
            if (u.phone || u.phoneNumber) setPhoneNumber(u.phone || u.phoneNumber);
            if (u.address) setAddress(u.address);
            if (u.group) setGroup(u.group);
            if (u.supplyNo || u.supplyNumber || u.meterNumber) setSupplyNo(u.supplyNo || u.supplyNumber || u.meterNumber);
            if (u.avatar || u.profileImage) setAvatarUri(u.avatar || u.profileImage);
          }
        }
      } catch (cacheErr) {
        console.warn("Error reading cache profile:", cacheErr.message);
      }

      // 2. Pull live database metrics securely
      const response = await api.get('/auth/me');
      const u = response.data;
      if (u) {
        setFullName(u.fullName || u.name || '');
        setUsername(u.username || '');
        setEmail(u.email || '');
        setPhoneNumber(u.phone || u.phoneNumber || '');
        setAddress(u.address || '');
        setGroup(u.group || 'Guuri');
        setSupplyNo(u.supplyNo || u.supplyNumber || u.meterNumber || '');
        setAvatarUri(u.avatar || null);

        // Also update local storage/context with latest live data
        const stored = await AsyncStorage.getItem('userData');
        if (stored) {
          const storedData = JSON.parse(stored);
          storedData.user = { ...storedData.user, ...u, supplyNumber: u.supplyNo || u.supplyNumber };
          await AsyncStorage.setItem('userData', JSON.stringify(storedData));
          if (setUserInfo) setUserInfo(storedData);
        }
      }
    } catch (err) {
      console.warn("Falling back to local cached storage due to connection delay:", err.message);
    } finally {
      setLoading(false);
    }
  }, [setUserInfo]);

  useFocusEffect(
    useCallback(() => {
      if (!fullName && !username) {
        setLoading(true);
      }
      fetchProfile();
    }, [fetchProfile, fullName, username])
  );

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ogolaansho Ayaa Laga Maarmaan Ah', 'Fadlan ogolaan nidaamka gallery-ga si aad u beddesho sawirka.');
        return;
      }
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true
      });
      if (!result.canceled) {
        const base64Str = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setAvatarUri(base64Str);
        Alert.alert('Guul', 'Sawirka waa la badalay!');
      }
    } catch (error) {
      console.error('Image Picker Error:', error);
      Alert.alert('Cilad', 'Sawirka lama dooranin.');
    }
  };

  const handleUpdateCustomerProfile = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // If the customer attempts to alter the password inputs
    if (newPassword) {
      if (!oldPassword) {
        if (typeof Alert !== 'undefined' && Alert.alert) {
          Alert.alert("Cilad", "Waa qasab inaad geliso password-kaagii hore si aad u beddesho!");
        } else {
          alert("Waa qasab inaad geliso password-kaagii hore si aad u beddesho!");
        }
        return;
      }
      if (newPassword !== confirmPassword) {
        if (typeof Alert !== 'undefined' && Alert.alert) {
          Alert.alert("Cilad", "Password-ka cusub iyo kan xaqiijinta isku mid maaha!");
        } else {
          alert("Password-ka cusub iyo kan xaqiijinta isku mid maaha!");
        }
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { fullName, email, username, oldPassword, newPassword, avatar: avatarUri, address, phone: phoneNumber };
      const response = await axios.put('http://192.168.8.52:5000/api/customer/profile/update', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer shaba-${userInfo?._id || ''}`
        }
      });
      
      if (response.data.success) {
        const updatedUser = response.data.user;

        // Sync local storage for web
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            const currentSession = JSON.parse(window.localStorage.getItem('user') || '{}');
            const updatedSession = { ...currentSession, name: fullName, email, username, avatar: avatarUri };
            window.localStorage.setItem('user', JSON.stringify(updatedSession));
            window.dispatchEvent(new Event("customer_avatar_changed"));
          }
        } catch (e) {
          console.log("localStorage sync skipped:", e.message);
        }

        // Sync AsyncStorage for Native
        try {
          const stored = await AsyncStorage.getItem('userData');
          if (stored) {
            const storedData = JSON.parse(stored);
            storedData.user = { 
              ...storedData.user, 
              ...updatedUser,
              avatar: avatarUri
            };
            await AsyncStorage.setItem('userData', JSON.stringify(storedData));
            if (setUserInfo) setUserInfo(storedData);
          }
        } catch (e) {
          console.log("AsyncStorage sync skipped:", e.message);
        }

        if (typeof Alert !== 'undefined' && Alert.alert) {
          Alert.alert("Guul", "Xogtii Profile-ka waa lagu guuleystay in la cusboonaysiiyo.");
        } else {
          alert("Xogtii Profile-ka waa lagu guuleystay in la cusboonaysiiyo.");
        }
        
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      console.error("Save Profile Error:", err);
      if (typeof Alert !== 'undefined' && Alert.alert) {
        Alert.alert("Cilad", "old password is in correct");
      } else {
        alert("old password is in correct");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      } else {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userData');
      }
    } catch (error) {
      console.error('Logout error:', error);
      await AsyncStorage.removeItem('userToken').catch(() => {});
      await AsyncStorage.removeItem('userData').catch(() => {});
    }
  };



  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text className="text-gray-700 font-semibold mt-3 text-base">Cilad farsamo ayaa dhacday</Text>
        <TouchableOpacity
          onPress={() => {
            setLoading(true);
            fetchProfile();
          }}
          className="bg-[#0B5E36] px-5 py-2.5 rounded-xl mt-4"
        >
          <Text className="text-white font-bold text-sm">Dib u tijaabi (Retry)</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, isDarkMode ? styles.darkBg : styles.lightBg]}>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={pickImage} activeOpacity={0.8} disabled={saving}>
          <Image 
            source={{ uri: avatarUri || 'https://via.placeholder.com/150' }} 
            style={styles.avatarImage} 
          />
          <View style={styles.editBadge}>
            <Text style={styles.badgeText}>+</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Full Name</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={fullName} 
          onChangeText={setFullName}
          placeholder="Geli magacaaga oo buuxa"
          placeholderTextColor="#999"
        />

      <View style={{ marginBottom: 15 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: isDarkMode ? '#ffffff' : '#374151', marginBottom: 5 }}>Supply Number</Text>
        <TextInput 
          style={{ width: '100%', padding: 12, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#e5e7eb', borderRadius: 8, backgroundColor: isDarkMode ? '#1e1e1e' : '#f3f4f6', color: isDarkMode ? '#ffffff' : '#4b5563' }}
          value={supplyNo}
          editable={false}
        />
      </View>

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Phone Number</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={phoneNumber} 
          onChangeText={setPhoneNumber}
          placeholder="Geli lambarkaaga telefoonka"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Group</Text>
        <TextInput 
          style={[styles.input, styles.readOnlyInput]} 
          value={group} 
          editable={false}
          readOnly={true}
          disabled={true}
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Email Address</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={email} 
          onChangeText={setEmail}
          placeholder="Geli email-kaaga"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Address</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={address} 
          onChangeText={setAddress}
          placeholder="Geli cinwaankaaga"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Username</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={username} 
          onChangeText={setUsername}
          placeholder="Geli username cusub"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Old Password</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={oldPassword} 
          onChangeText={setOldPassword}
          secureTextEntry={true}
          placeholder="Password-kaagi hore"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>New Password</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={newPassword} 
          onChangeText={setNewPassword}
          secureTextEntry={true}
          placeholder="Password cusub"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, isDarkMode ? styles.textWhite : styles.textBlack]}>Xaqiiji Password-ka Cusub</Text>
        <TextInput 
          style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]} 
          value={confirmPassword} 
          onChangeText={setConfirmPassword}
          secureTextEntry={true}
          placeholder="Xaqiiji Password"
          placeholderTextColor="#999"
        />
      </View>

      <View style={[styles.themeRow, isDarkMode ? styles.darkRow : styles.lightRow]}>
        <Text style={isDarkMode ? styles.textWhite : styles.textBlack}>Dark Mode Theme</Text>
        <Switch value={isDarkMode} onValueChange={(value) => setGlobalThemeState && setGlobalThemeState(value ? 'dark' : 'light')} />
      </View>

      <TouchableOpacity onPress={handleUpdateCustomerProfile} style={styles.saveButton} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Cusboonaysii Profile</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Log Out Account</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  lightBg: { backgroundColor: '#f8f9fa' },
  darkBg: { backgroundColor: '#121212' },
  textWhite: { color: '#ffffff' },
  textBlack: { color: '#333333' },
  avatarContainer: { alignItems: 'center', marginTop: 10, marginBottom: 15 },
  avatarImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#cbd5e1' },
  editBadge: { position: 'absolute', bottom: 0, right: 5, backgroundColor: '#0B5E36', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: 'white', fontWeight: 'bold', fontSize: 18, marginTop: -2 },
  formGroup: { marginTop: 5 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, marginTop: 12 },
  input: { height: 50, borderRadius: 8, paddingHorizontal: 15, fontSize: 16, borderWidth: 1 },
  lightInput: { backgroundColor: '#fff', borderColor: '#e2e8f0', color: '#000' },
  darkInput: { backgroundColor: '#1e1e1e', borderColor: '#333', color: '#fff' },
  readOnlyInput: { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', color: '#64748b' },
  themeRow: { flexDirection: 'row', justifySpaceBetween: 'space-between', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 8, marginTop: 20, borderWidth: 1 },
  lightRow: { backgroundColor: '#fff', borderColor: '#e2e8f0' },
  darkRow: { backgroundColor: '#1e1e1e', borderColor: '#333' },
  saveButton: { backgroundColor: '#28a745', height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  saveButtonText: { color: 'white', fontSize: 16, fontStyle: 'normal', fontWeight: 'bold' },
  logoutButton: { height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: '#dc3545' },
  logoutButtonText: { color: '#dc3545', fontSize: 16, fontWeight: 'bold' }
});
