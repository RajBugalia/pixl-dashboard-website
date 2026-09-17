import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8766/api',
});

// Add a request interceptor to attach JWT token
client.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default client;
