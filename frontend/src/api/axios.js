import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || hostname.startsWith('172.')) {
    return `http://${hostname}:5000/api`;
  }
  // Production VPS with domain loaded over HTTPS
  if (window.location.protocol === 'https:') {
    return `https://${hostname}/api`;
  }
  // Fallback for custom dev domains / IPs accessed over HTTP
  return `http://${hostname}:5000/api`;
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
        const protocol = window.location.protocol;
        
        // Dynamically choose secure HTTPS url or local port-based URL
        const replacementBase = import.meta.env.VITE_API_URL
            ? import.meta.env.VITE_API_URL.replace('/api', '')
            : (protocol === 'https:') 
                ? `https://${host}` 
                : (host === 'localhost' || host === '127.0.0.1') 
                    ? 'http://localhost:5000' 
                    : `http://${host}:5000`;

        if (stringData.includes('http://72.62.249.211:5000')) {
            stringData = stringData.replace(/http:\/\/72\.62\.249\.211:5000/g, replacementBase);
            response.data = JSON.parse(stringData);
        }
        // Also dynamically map localhost backend URLs if loaded from LAN IP or VPS
        if (host !== 'localhost' && stringData.includes('http://localhost:5000')) {
            stringData = stringData.replace(/http:\/\/localhost:5000/g, replacementBase);
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