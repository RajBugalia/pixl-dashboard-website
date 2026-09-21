import axios from 'axios';
import Swal from 'sweetalert2';
import { API_BASE_URL } from '@/config/constants';

const client = axios.create({
  baseURL: API_BASE_URL,
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

// Add a response interceptor to globally handle connection errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // If there is no response, it's likely a network error (backend offline)
    if (!error.response) {
      Swal.fire({
        icon: 'error',
        title: 'Backend Offline',
        text: 'Cannot connect to the server. Please check if the backend is running.',
        confirmButtonColor: '#ef4444'
      });
    } else if (error.response.status >= 500) {
      // Handle generic server errors
      Swal.fire({
        icon: 'error',
        title: 'Server Error',
        text: 'An unexpected error occurred on the server.',
        confirmButtonColor: '#ef4444'
      });
    }
    
    return Promise.reject(error);
  }
);

export default client;
