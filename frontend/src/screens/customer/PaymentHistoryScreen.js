import React, { useState, useContext, useMemo, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import billService from '../../services/bill.service';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

const PaymentHistoryScreen = ({ route, navigation }) => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(false);
    
    const authContext = useContext(AuthContext) || {};
    const { globalThemeState } = authContext;
    const isDarkMode = globalThemeState === 'dark';

    const routeParams = route?.params || {};
    const userInfo = useMemo(() => {
        return routeParams.userInfo ?? authContext.userInfo?.user ?? authContext.userInfo ?? {};
    }, [routeParams.userInfo, authContext.userInfo]);

    const userProfile = userInfo;
    const loggedInUserId = userProfile?._id || userProfile?.user?._id;

    const fetchLiveHistory = useCallback(async () => {
        if (!loggedInUserId) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            setError(false);
            const response = await api.get(`/bills?customerId=${loggedInUserId}&status=Paid`);
            const data = response.data;
            if (Array.isArray(data)) {
                setBills(data);
            } else {
                setBills([]);
            }
        } catch (err) {
            console.warn("Backend API fetching error:", err.message);
            setError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loggedInUserId]);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            fetchLiveHistory();
        }, [fetchLiveHistory])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchLiveHistory();
    }, [fetchLiveHistory]);

    const paidBills = useMemo(() => {
        return bills.filter(bill => String(bill.status).toUpperCase() === 'PAID');
    }, [bills]);

    const totalPaidAmount = useMemo(() => {
        return paidBills.reduce((sum, b) => {
            const amt = b.amountDue !== undefined ? b.amountDue : (b.amount !== undefined ? b.amount : 0);
            return sum + parseFloat(amt || 0);
        }, 0);
    }, [paidBills]);

    const themeStyles = StyleSheet.create({
        screenContainer: {
            flex: 1,
            backgroundColor: isDarkMode ? '#121212' : '#f9fafb',
        },
        headerBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDarkMode ? '#2a2a2a' : '#e5e7eb',
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
        },
        headerTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: isDarkMode ? '#34D399' : '#0B5E36',
        },
        card: {
            backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
            padding: 20,
            borderRadius: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: isDarkMode ? '#2a2a2a' : '#f3f4f6',
        },
        periodText: {
            color: isDarkMode ? '#ffffff' : '#111827',
            fontWeight: 'bold',
            fontSize: 15,
        },
        labelText: {
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            fontSize: 12,
        },
        valueText: {
            color: isDarkMode ? '#e5e7eb' : '#1f2937',
            fontSize: 12,
        },
        valueBold: {
            color: isDarkMode ? '#e5e7eb' : '#1f2937',
            fontSize: 12,
            fontWeight: '600',
        },
        amountLabel: {
            color: isDarkMode ? '#6b7280' : '#9ca3af',
            fontSize: 10,
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: 1,
        },
        amountValue: {
            color: isDarkMode ? '#6ee7b7' : '#15803d',
            fontWeight: '800',
            fontSize: 20,
        },
        divider: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: isDarkMode ? '#2a2a2a' : '#f3f4f6',
            paddingVertical: 12,
            marginVertical: 8,
        },
        loadingText: {
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            fontSize: 14,
            marginTop: 8,
            fontWeight: '500',
        },
        errorTitle: {
            color: isDarkMode ? '#e5e7eb' : '#374151',
            textAlign: 'center',
            fontWeight: '600',
            marginTop: 12,
            fontSize: 15,
        },
        errorSubtitle: {
            color: isDarkMode ? '#9ca3af' : '#6b7280',
            textAlign: 'center',
            marginTop: 4,
            fontSize: 12,
        },
        emptyTitle: {
            color: isDarkMode ? '#e5e7eb' : '#374151',
            textAlign: 'center',
            fontWeight: '600',
            marginTop: 12,
        },
        emptySubtitle: {
            color: isDarkMode ? '#6b7280' : '#9ca3af',
            textAlign: 'center',
            fontSize: 12,
            marginTop: 4,
        },
        paidBadge: {
            backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
        },
        paidBadgeText: {
            color: isDarkMode ? '#6ee7b7' : '#15803d',
            fontSize: 12,
            fontWeight: 'bold',
        },
        footerContainer: {
            padding: 20,
            borderTopWidth: 1,
            backgroundColor: isDarkMode ? '#0a1a0f' : '#f0fdf4',
            borderTopColor: isDarkMode ? '#14532d' : '#bbf7d0',
        },
        footerLabel: {
            fontWeight: 'bold',
            textAlign: 'center',
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: 1,
            color: isDarkMode ? '#6ee7b7' : '#15803d',
        },
        footerAmount: {
            fontSize: 28,
            fontWeight: '800',
            textAlign: 'center',
            marginTop: 6,
            color: isDarkMode ? '#6ee7b7' : '#15803d',
        },
    });

    const renderItem = useCallback(({ item }) => {
        const amt = item.amountDue !== undefined ? item.amountDue : (item.amount !== undefined ? item.amount : 0);
        const uNo = item.supplyNo || userInfo?.supplyNumber || userInfo?.meterNumber || userInfo?.user?.supplyNumber || userInfo?.user?.meterNumber || '—';
        const units = item.unitsUsed !== undefined ? item.unitsUsed : (item.units !== undefined ? item.units : (item.consumption !== undefined ? item.consumption : 0));
        
        return (
            <View style={themeStyles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={themeStyles.periodText}>Period: {item.period || item.month || '—'}</Text>
                    <View style={themeStyles.paidBadge}>
                        <Text style={themeStyles.paidBadgeText}>Guulaystay (Paid)</Text>
                    </View>
                </View>

                {item.billId && (
                    <Text style={[themeStyles.labelText, { marginBottom: 8 }]}>Bill ID: {item.billId}</Text>
                )}

                <View style={themeStyles.divider}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={themeStyles.labelText}>Supply No:</Text>
                        <Text style={themeStyles.valueBold}>{uNo}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={themeStyles.labelText}>Reading:</Text>
                        <Text style={themeStyles.valueBold}>
                            {item.prevReading ?? item.previousReading ?? '0'} → {item.currReading ?? item.currentReading ?? '0'} ({units} units)
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={themeStyles.labelText}>Prev Date:</Text>
                        <Text style={themeStyles.valueText}>
                            {item.prevDate ? new Date(item.prevDate).toLocaleDateString() : '—'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={themeStyles.labelText}>Curr Date:</Text>
                        <Text style={themeStyles.valueText}>
                            {item.currDate ? new Date(item.currDate).toLocaleDateString() : '—'}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={themeStyles.labelText}>Settle Date:</Text>
                        <Text style={themeStyles.valueText}>
                            {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—')}
                        </Text>
                    </View>
                </View>

                <View style={{ marginTop: 8 }}>
                    <Text style={themeStyles.amountLabel}>Amount Paid</Text>
                    <Text style={themeStyles.amountValue}>${parseFloat(amt).toFixed(2)}</Text>
                </View>
            </View>
        );
    }, [userInfo, isDarkMode]);

    return (
        <View style={themeStyles.screenContainer}>
            {/* Header */}
            <View style={themeStyles.headerBar}>
                <TouchableOpacity onPress={() => navigation.navigate('Home', { userInfo })} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#34D399' : '#0B5E36'} />
                </TouchableOpacity>
                <Text style={themeStyles.headerTitle}>Payment History</Text>
                <View style={{ width: 32 }} />
            </View>

            {/* Paid Invoice List */}
            <View style={{ padding: 16, flex: 1 }}>
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={isDarkMode ? '#34D399' : '#0B5E36'} />
                        <Text style={themeStyles.loadingText}>Loading payment history...</Text>
                    </View>
                ) : error ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
                        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
                        <Text style={themeStyles.errorTitle}>Cilad farsamo ayaa dhacday</Text>
                        <Text style={themeStyles.errorSubtitle}>Fadlan hubi internetkaaga ama dib u tijaabi.</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setLoading(true);
                                fetchLiveHistory();
                            }}
                            style={{ backgroundColor: '#0B5E36', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 16 }}
                        >
                            <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>Dib u tijaabi (Retry)</Text>
                        </TouchableOpacity>
                    </View>
                ) : paidBills.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                        <Ionicons name="document-text-outline" size={48} color={isDarkMode ? '#6b7280' : '#9ca3af'} />
                        <Text style={themeStyles.emptyTitle}>Ma jiraan biilal la bixiyay</Text>
                        <Text style={themeStyles.emptySubtitle}>Halkan waxaa lagu soo bandhigi doonaa biilasha aad bixisay.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={paidBills}
                        renderItem={renderItem}
                        keyExtractor={(item) => item._id}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    />
                )}
            </View>

            {/* Footer */}
            <View style={themeStyles.footerContainer}>
                <Text style={themeStyles.footerLabel}>
                    Total Paid Amount
                </Text>
                <Text style={themeStyles.footerAmount}>
                    ${totalPaidAmount.toFixed(2)}
                </Text>
            </View>
        </View>
    );
};

export default PaymentHistoryScreen;
