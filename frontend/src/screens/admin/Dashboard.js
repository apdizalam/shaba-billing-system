import React, { useContext } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import Button from '../../components/Button';

const DashboardScreen = ({ navigation }) => {
    const { userInfo, logout } = useContext(AuthContext);

    return (
        <SafeAreaView className="flex-1 bg-gray-50" edges={['top', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                {/* Header */}
                <View className="flex-row justify-between items-center mb-8 mt-2">
                    <View>
                        <Text className="text-gray-500 font-medium text-sm">Welcome back,</Text>
                        <Text className="text-2xl font-bold text-gray-900">{userInfo?.username}</Text>
                    </View>
                     <View className="px-3 py-1 rounded-full border" style={{ backgroundColor: '#e6f6ee', borderColor: '#b3e6cc' }}>
                         <Text className="font-bold text-xs uppercase" style={{ color: '#00A859' }}>Admin</Text>
                    </View>
                </View>

                {/* Recent Transactions placeholder - Kept and colored green per instructions */}
                <View className="mb-8">
                    <Text className="text-lg font-bold mb-4" style={{ color: '#00A859' }}>Recent Transactions</Text>
                    <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 items-center">
                         <Text className="text-gray-500">No recent transactions to display.</Text>
                    </View>
                </View>

                <View style={{ marginTop: 20 }}>
                     <Button 
                         title="Sign Out" 
                         variant="danger" 
                         onPress={logout} 
                     />
                </View>
                 <View className="h-4" />
            </ScrollView>
        </SafeAreaView>
    );
};

export default DashboardScreen;
