import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

const BillCard = ({ bill, onPayPress }) => {
    if (!bill) return null;

    const {
        month,
        period,
        prevReading,
        currReading,
        unitsUsed,
        units,
        consumption,
        amountDue,
        amount,
        status,
        billId,
        dueDate,
        billDate
    } = bill;

    // normalize values with fallbacks
    const displayMonth = period || month || (billDate ? new Date(billDate).toLocaleDateString() : '—');
    const prev = prevReading ?? bill.previousReading ?? null;
    const curr = currReading ?? bill.currentReading ?? null;
    const used = unitsUsed ?? units ?? consumption ?? null;
    const amt = amountDue ?? amount ?? null;

    return (
        <View className="bg-white p-4 rounded-lg mb-3 shadow-sm border border-gray-100">
            <View className="flex-row justify-between mb-2">
                <Text className="font-bold text-gray-800">Bisha: {displayMonth}</Text>
                <Text className={`font-bold ${String(status || '').toLowerCase() === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                    {status}
                </Text>
            </View>

            <View className="mb-2">
                <Text className="text-gray-600">Bill ID: {billId}</Text>
                <Text className="text-xs text-gray-400 mt-1">Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}</Text>
            </View>

            <View className="flex-row justify-between mb-1">
                <Text className="text-gray-600">Akhriskii Hore: {prev ?? '—'}</Text>
                <Text className="text-gray-600">Akhriskii Cusub: {curr ?? '—'}</Text>
            </View>

            <View className="flex-row justify-between">
                <Text className="text-gray-600">Unugyada la Isticmaalay: {used ?? '—'}</Text>
                <Text className="text-gray-800 font-semibold">Qiimaha: ${amt?.toFixed ? amt.toFixed(2) : amt}</Text>
            </View>

            {onPayPress && String(status || '').toLowerCase() !== 'paid' && (
                <View className="mt-3">
                    <TouchableOpacity onPress={onPayPress} className="bg-blue-600 py-2 rounded-md items-center">
                        <Text className="text-white font-semibold">Pay Now</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export default React.memo(BillCard);
