import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = '/api/physical-finance';

export const physicalFinanceService = {
  getTransactions: async (date) => {
    try {
      const response = await axios.get(`${API_URL}/transactions`, { params: { date } });
      return response.data;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  },
  addTransaction: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/transactions`, data);
      return response.data;
    } catch (error) {
      console.error("Error adding transaction:", error);
      throw error;
    }
  },
  deleteTransaction: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/transactions/${id}`);
      return response.data;
    } catch (error) {
      console.error("Error deleting transaction:", error);
      throw error;
    }
  },
  getDefaultRegFee: async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/default-reg-fee`);
      return response.data;
    } catch (error) {
      console.error("Error fetching default reg fee:", error);
      throw error;
    }
  },
  setDefaultRegFee: async (amount) => {
    try {
      const response = await axios.post(`${API_URL}/settings/default-reg-fee`, { amount });
      return response.data;
    } catch (error) {
      console.error("Error setting default reg fee:", error);
      throw error;
    }
  }
};
