import api from './api';

const USE_MOCK_DATA = false;

const getBills = async () => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        _id: 'bill_1',
                        billId: 'BILL-202601-001',
                        customer: { fullName: 'Ali Ahmed' },
                        amount: 25.50,
                        status: 'UNPAID',
                        dueDate: '2026-02-15',
                        month: '2026-01',
                        consumption: 15,
                        currentReading: 1500,
                        previousReading: 1485
                    },
                    {
                        _id: 'bill_2',
                        billId: 'BILL-202512-045',
                        customer: { fullName: 'Maryan Olad' },
                        amount: 18.00,
                        status: 'PAID',
                        dueDate: '2026-01-15',
                        month: '2025-12',
                        consumption: 10,
                        currentReading: 1485,
                        previousReading: 1475
                    },
                     {
                        _id: 'bill_3',
                        billId: 'BILL-202511-089',
                        customer: { fullName: 'John Doe' },
                        amount: 32.00,
                        status: 'OVERDUE',
                        dueDate: '2025-12-15',
                        month: '2025-11',
                        consumption: 20,
                        currentReading: 1475,
                        previousReading: 455
                    },
                ]);
            }, 500);
        });
    }
    const response = await api.get('/bills');
    return response.data;
};

const getCustomerBills = async (customerId, status) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        _id: 'bill_customer_1',
                        billId: 'BILL-202601-111',
                        amount: 22.00,
                        status: 'UNPAID',
                        dueDate: '2026-02-10',
                        month: '2026-01',
                        consumption: 12,
                        currentReading: 500,
                        previousReading: 488
                    },
                    {
                        _id: 'bill_customer_2',
                        billId: 'BILL-202512-222',
                        amount: 20.00,
                        status: 'PAID',
                        dueDate: '2026-01-10',
                        month: '2025-12',
                        consumption: 11,
                        currentReading: 488,
                        previousReading: 477
                    }
                ]);
            }, 500);
        });
    }
    if (!customerId) {
        throw new Error('Customer ID is required to fetch customer bills');
    }

    const response = await api.get('/bills', {
        params: {
            customerId,
            ...(status ? { status } : {}),
        },
    });
    return response.data;
};

const generateBill = async (billData) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
             setTimeout(() => {
                resolve({
                    message: 'Bill generated successfully (MOCK)',
                    bill: {
                        _id: 'new_bill_' + Date.now(),
                        ...billData,
                        billId: 'BILL-MOCK-' + Math.floor(Math.random() * 1000),
                        status: 'UNPAID',
                        createdAt: new Date().toISOString()
                    }
                });
             }, 500);
        });
    }
    const response = await api.post('/bills', billData);
    return response.data;
};

const payBill = async (billId) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ message: 'Bill paid successfully (MOCK)' });
            }, 500);
        });
    }
    const response = await api.post(`/bills/${billId}/pay`);
    return response.data;
};

export default {
    getBills,
    getCustomerBills,
    generateBill,
    payBill,
};
