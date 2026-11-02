import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/admin/Dashboard';
import CustomersScreen from '../screens/admin/Customers';
import BillsScreen from '../screens/admin/Bills';

import CreateBillScreen from '../screens/admin/CreateBill';
import CreateMeterScreen from '../screens/admin/CreateMeter';
import CreateCustomerScreen from '../screens/admin/CreateCustomer';

const Stack = createStackNavigator();

const AdminNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Customers" component={CustomersScreen} />
            <Stack.Screen name="Bills" component={BillsScreen} />
            <Stack.Screen name="CreateBill" component={CreateBillScreen} options={{ title: 'Generate Bill' }} />
            <Stack.Screen name="CreateMeter" component={CreateMeterScreen} options={{ title: 'Create Meter' }} />
            <Stack.Screen name="CreateCustomer" component={CreateCustomerScreen} options={{ title: 'Register Customer' }} />
        </Stack.Navigator>
    );
};

export default AdminNavigator;
