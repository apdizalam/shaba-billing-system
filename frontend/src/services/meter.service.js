import api from './api';

const USE_MOCK_DATA = false;

const createMeter = async (customerId, meterNumber) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
             setTimeout(() => {
                resolve({
                    message: "Meter created successfully (MOCK)",
                    meter: {
                        _id: 'new_meter_' + Date.now(),
                         customerId,
                         meterNumber
                    }
                });
             }, 500);
        });
    }
    const response = await api.post('/meters', { customerId, meterNumber });
    return response.data;
};

const getMeter = async (meterId) => {
    if (USE_MOCK_DATA) {
         return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    _id: meterId,
                    meterNumber: 'M-' + meterId,
                    readings: [
                        { date: '2026-01-01', reading: 1200 },
                        { date: '2025-12-01', reading: 1150 }
                    ],
                    customer: 'cust_' + meterId
                });
            }, 500);
        });
    }
    const response = await api.get(`/meters/${meterId}`);
    return response.data;
};

const addReading = async (meterId, reading, date) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    message: "Reading added successfully (MOCK)",
                    reading: {
                        date,
                        reading
                    }
                });
            }, 500);
        });
    }
    const response = await api.post(`/meters/${meterId}/readings`, { reading, date });
    return response.data;
};

export default {
    createMeter,
    getMeter,
    addReading,
};
