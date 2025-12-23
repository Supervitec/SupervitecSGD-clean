import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true 
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      console.warn(' Sesión expirada, redirigiendo a login...');
      window.location.href = '/?session=expired';
    }
    return Promise.reject(error);
  }
);

export default api;
