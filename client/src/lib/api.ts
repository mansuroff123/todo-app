import axios from 'axios';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);


export const todoApi = {
  getAll: () => api.get('/todo'),
  create: (data: { title: string; description?: string; remindAt?: string; isRepeatable?: boolean; repeatDays?: string }) => 
    api.post('/todo', data),
  update: (id: number, data: any) => api.patch(`/todo/${id}`, data),
  delete: (id: number) => api.delete(`/todo/${id}`),
  share: (data: { todoId: number; email: string; canEdit: boolean }) => 
    api.post('/todo/share', data),
};

export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/user/me'),
};

export default api;