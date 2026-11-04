import React, { useContext, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';

const COLORS = {
    blue: '#2436B2',
    green: '#A3EDB2',
    ink: '#111A3A',
    muted: '#626D79',
    border: '#BBC4CF',
};

const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [secureText, setSecureText] = useState(true);
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext) || {};
    const { height, width } = useWindowDimensions();
    const headerHeight = Math.max(240, Math.min(height * 0.38, 360));
    const logoSize = Math.min(width * 0.46, 190);

    const handleLogin = async () => {
        const trimmedUser = username.trim();
        if (!trimmedUser || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);

        try {
            if (login) {
                await login(trimmedUser, password);
            } else {
                throw new Error('Authentication context is not ready.');
            }
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            const message = apiMessage || (
                error?.response
                    ? 'The login service could not complete your request. Please try again.'
                    : 'Could not reach the login server. Check your connection and try again.'
            );
            console.warn('Login request failed:', error?.response?.status || error?.message);
            Alert.alert('Cilad', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    <View style={[styles.brandHeader, { height: headerHeight }]}>
                        <Image
                            source={require('../../../assets/shaba-brand-mark.png')}
                            style={{ width: logoSize, height: logoSize }}
                            resizeMode="contain"
                            accessibilityLabel="Shaba Water emblem"
                        />
                        <Text style={styles.brandName}>WATER COMPANY</Text>
                    </View>

                    <View style={[styles.form, { paddingHorizontal: Math.min(width * 0.062, 28) }]}>
                        <Text style={styles.title}>Welcome back</Text>
                        <Text style={styles.subtitle}>Log in to view and pay your water bills.</Text>

                        <View style={styles.usernameGroup}>
                            <Text style={styles.label}>Username</Text>
                            <TextInput
                                style={styles.input}
                                value={username}
                                onChangeText={setUsername}
                                placeholder="Enter your username"
                                placeholderTextColor="#7A7A7A"
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="next"
                                textContentType="username"
                                accessibilityLabel="Username"
                            />
                        </View>

                        <View style={styles.passwordGroup}>
                            <View style={styles.passwordHeading}>
                                <Text style={styles.label}>Password</Text>
                                <TouchableOpacity
                                    onPress={() => Alert.alert(
                                        'Forgot password?',
                                        'Please contact Shaba Water support to reset your password.'
                                    )}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.forgotPassword}>Forgot password?</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.passwordInputWrapper}>
                                <TextInput
                                    style={[styles.input, styles.passwordInput]}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter your password"
                                    placeholderTextColor="#7A7A7A"
                                    secureTextEntry={secureText}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="done"
                                    textContentType="password"
                                    onSubmitEditing={handleLogin}
                                    accessibilityLabel="Password"
                                />
                                <TouchableOpacity
                                    onPress={() => setSecureText(!secureText)}
                                    style={styles.visibilityButton}
                                    accessibilityRole="button"
                                    accessibilityLabel={secureText ? 'Show password' : 'Hide password'}
                                >
                                    <Ionicons
                                        name={secureText ? 'eye-outline' : 'eye-off-outline'}
                                        size={24}
                                        color={COLORS.muted}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            accessibilityRole="button"
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.loginButtonText}>Log in</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Need help? Call <Text style={styles.supportNumber}>[SUPPORT NUMBER]</Text>
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    flex: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
    },
    brandHeader: {
        width: '100%',
        backgroundColor: COLORS.green,
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 8,
    },
    brandName: {
        color: COLORS.ink,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 4.5,
        marginTop: 8,
    },
    form: {
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
        flexGrow: 1,
        paddingTop: 24,
    },
    title: {
        color: COLORS.blue,
        fontSize: 30,
        lineHeight: 37,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: COLORS.muted,
        fontSize: 16,
        lineHeight: 23,
        marginTop: 2,
        marginBottom: 22,
    },
    usernameGroup: {
        marginBottom: 20,
    },
    label: {
        color: COLORS.ink,
        fontSize: 15,
        lineHeight: 21,
        fontWeight: '600',
        marginBottom: 7,
    },
    input: {
        height: 52,
        borderWidth: 1.25,
        borderColor: COLORS.border,
        borderRadius: 13,
        paddingHorizontal: 16,
        color: COLORS.ink,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
    },
    passwordGroup: {
        marginBottom: 25,
    },
    passwordHeading: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 7,
    },
    forgotPassword: {
        color: COLORS.blue,
        fontSize: 15,
        fontWeight: '600',
    },
    passwordInputWrapper: {
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: 52,
    },
    visibilityButton: {
        position: 'absolute',
        right: 12,
        height: 48,
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButton: {
        height: 58,
        borderRadius: 32,
        backgroundColor: COLORS.blue,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 28,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    footerText: {
        color: COLORS.muted,
        fontSize: 15,
        textAlign: 'center',
    },
    supportNumber: {
        color: COLORS.blue,
        fontWeight: '700',
    },
});

export default LoginScreen;
