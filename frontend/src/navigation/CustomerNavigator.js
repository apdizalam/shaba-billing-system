import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

// Import Screens Safely
import HomeScreen from '../screens/customer/HomeScreen';
import PayBillScreen from '../screens/customer/PayBill';
import ViewBillsScreen from '../screens/customer/ViewBillsScreen';
import PaymentHistoryScreen from '../screens/customer/PaymentHistoryScreen';
import ProfileScreen from '../screens/customer/Profile';

const Tab = createBottomTabNavigator();

export default function CustomerNavigator() {
  const authContext = useContext(AuthContext) || {};
  const userInfo = authContext.userInfo?.user ?? authContext.userInfo ?? {};

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Pay Bill') iconName = focused ? 'card' : 'card-outline';
          else if (route.name === 'ViewBills') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'PaymentHistory') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#28a745',
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Home', { userInfo });
          },
        })}
      />
      <Tab.Screen 
        name="Pay Bill" 
        component={PayBillScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Pay Bill', { userInfo });
          },
        })}
      />
      <Tab.Screen 
        name="ViewBills" 
        component={ViewBillsScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('ViewBills', { userInfo });
          },
        })}
      />
      <Tab.Screen 
        name="PaymentHistory" 
        component={PaymentHistoryScreen} 
        initialParams={{ filterStatus: 'PAID' }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('PaymentHistory', { userInfo });
          },
        })}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Profile', { userInfo });
          },
        })}
      />
    </Tab.Navigator>
  );
}
