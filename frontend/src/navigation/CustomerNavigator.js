import React, { useContext } from 'react';
import { View } from 'react-native';
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
          
          return (
            <View
              style={{
                width: 52,
                height: 32,
                borderRadius: 18,
                backgroundColor: focused ? '#A3EDB2' : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarLabel:
          route.name === 'Pay Bill'
            ? 'Pay bill'
            : route.name === 'ViewBills'
              ? 'Bills'
              : route.name === 'PaymentHistory'
                ? 'History'
                : route.name,
        tabBarActiveTintColor: '#2436B2',
        tabBarInactiveTintColor: '#626D79',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarStyle: route.name === 'Pay Bill'
          ? { display: 'none' }
          : {
              backgroundColor: '#ffffff',
              borderTopWidth: 1,
              borderTopColor: '#e4e9ef',
              height: 76,
              paddingTop: 6,
              paddingBottom: 6,
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
