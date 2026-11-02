import React from 'react';
import { View, ActivityIndicator } from 'react-native';

const Loader = () => {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <ActivityIndicator size="large" color="#2563EB" />
        </View>
    );
};

export default Loader;
