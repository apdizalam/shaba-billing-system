import api from './api';

const USE_MOCK_DATA = false;

const getCustomers = async () => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    { _id: 'cust_1', fullName: 'Ali Ahmed', phoneNumber: '615550001', address: 'Hodan, Mogadishu', meterNumber: 'M001' },
                    { _id: 'cust_2', fullName: 'Maryan Olad', phoneNumber: '615550002', address: 'Waberi, Mogadishu', meterNumber: 'M002' },
                    { _id: 'cust_3', fullName: 'Farah Abdi', phoneNumber: '615550003', address: 'Karan, Mogadishu', meterNumber: 'M003' },
                    { _id: 'cust_4', fullName: 'Amina Yussuf', phoneNumber: '615550004', address: 'Daynile, Mogadishu', meterNumber: 'M004' }
                ]);
            }, 500);
        });
    }
    const response = await api.get('/customers');
    return response.data;
};

const createCustomer = async (customerData) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    message: "Customer created successfully (MOCK)",
                    customer: {
                        _id: 'new_cust_' + Date.now(),
                        ...customerData
                    }
                });
            }, 500);
        });
    }
    const response = await api.post('/customers', customerData);
    return response.data;
};

const updateCustomer = async (customerId, customerData) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                 resolve({
                    message: "Customer updated successfully (MOCK)",
                    customer: {
                        _id: customerId,
                        ...customerData
                    }
                });
            }, 500);
        });
    }
    const response = await api.put(`/customers/${customerId}`, customerData);
    return response.data;
};

const deleteCustomer = async (customerId) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ message: "Customer deleted successfully (MOCK)" });
            }, 500);
        });
    }
    const response = await api.delete(`/customers/${customerId}`);
    return response.data;
};

export default {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
};
