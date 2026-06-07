import React, { useContext } from 'react';
import { View, TextInput, Text } from 'react-native';
import { AuthContext } from '../context/AuthContext';

const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, editable = true }) => {
    const authContext = useContext(AuthContext) || {};
    const { globalThemeState } = authContext;
    const isDarkMode = globalThemeState === 'dark';

    return (
        <View className="mb-4">
            <Text className="font-medium mb-1" style={{ color: isDarkMode ? '#cccccc' : '#374151' }}>{label}</Text>
            <TextInput
                style={{
                    backgroundColor: !editable 
                        ? (isDarkMode ? '#121212' : '#e2e8f0') 
                        : (isDarkMode ? '#1e1e1e' : '#f3f4f6'),
                    borderColor: isDarkMode ? '#333333' : '#d1d5db',
                    color: !editable 
                        ? (isDarkMode ? '#888888' : '#64748b') 
                        : (isDarkMode ? '#ffffff' : '#1f2937'),
                    borderWidth: 1,
                    height: 50
                }}
                className="rounded-lg px-4 py-3"
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={isDarkMode ? '#666666' : '#9ca3af'}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize="none"
                editable={editable}
            />
        </View>
    );
};

export default Input;
