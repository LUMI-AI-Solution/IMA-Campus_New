import axios from 'axios';

const getBaseURL = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
    return `http://${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(), 
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    if (response.data) {
        let stringData = JSON.stringify(response.data);
        const host = window.location.hostname;
        const targetHost = (host === 'localhost' || host === '127.0.0.1') ? 'localhost' : host;
        
        if (stringData.includes('http://72.62.249.211:5000')) {
            stringData = stringData.replace(/http:\/\/72\.62\.249\.211:5000/g, `http://${targetHost}:5000`);
            response.data = JSON.parse(stringData);
        }
        // Also dynamically map localhost backend URLs if loaded from LAN IP
        if (targetHost !== 'localhost' && stringData.includes('http://localhost:5000')) {
            stringData = stringData.replace(/http:\/\/localhost:5000/g, `http://${targetHost}:5000`);
            response.data = JSON.parse(stringData);
        }
    }
    return response;
}, (error) => {
    // 🔥 NEW FIX: 401 aawoth Auto Logout karanawa
    if (error.response && error.response.status === 401) {
        console.warn("Session Expired or Logged in from another device!");
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        
        // Auto Login Page ekata yawanawa
        window.location.href = '/login'; 
    }
    return Promise.reject(error);
});

export default api;