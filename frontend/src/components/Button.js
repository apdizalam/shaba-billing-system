import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

const Button = ({ title, onPress, isLoading, variant = 'primary' }) => {
    let bgClass = 'bg-[#0A5C36]';
    let textClass = 'text-white';
    let borderClass = '';

    if (variant === 'secondary') {
        bgClass = 'bg-gray-200';
        textClass = 'text-gray-800';
    } else if (variant === 'outline') {
        bgClass = 'bg-transparent';
        textClass = 'text-[#0A5C36]';
        borderClass = 'border border-[#0A5C36]';
    } else if (variant === 'danger') {
        bgClass = 'bg-red-50';
        textClass = 'text-red-600';
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={isLoading}
            className={`py-3 rounded-lg items-center justify-center ${bgClass} ${borderClass} ${isLoading ? 'opacity-70' : ''}`}
            style={{ minHeight: 48 }}
        >
            {isLoading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : 'black'} />
            ) : (
                <Text className={`font-bold text-lg ${textClass}`}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

export default Button;
