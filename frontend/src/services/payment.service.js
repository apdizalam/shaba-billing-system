import api from './api';

const USE_MOCK_DATA = false;

const initiatePayment = async (paymentData) => {
    if (USE_MOCK_DATA) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const isSuccess = Math.random() > 0.2; // 80% success chance
                resolve({
                    payment: {
                        _id: 'pay_' + Date.now(),
                        status: isSuccess ? 'SUCCESS' : 'FAILED',
                        amount: paymentData.amount,
                        transactionId: 'TRANS_' + Date.now()
                    },
                    sifaloResponse: {
                        code: isSuccess ? '601' : '600',
                        sid: 'SID_' + Date.now(),
                        message: isSuccess ? 'Success' : 'Failed'
                    },
                    billInfo: {
                        billId: 'BILL-MOCK',
                        month: '2026-01'
                    }
                });
            }, 1000);
        });
    }
    const response = await api.post('/payments/initiate', paymentData);
    return response.data;
};

export default {
    initiatePayment,
};
