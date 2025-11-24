import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
    baseURL: API_URL,
});

// Add token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if(token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth endpoints
export const authAPI = {
    register: (username, email, password) =>
        api.post('/auth/register', { username, email, password }),
    login: (email, password) => api.post('/auth/login', { email, password }),
    getMe: () => api.get('/auth/me'), 
};

// User endpoints
export const userAPI = {
    addBalance: (amount) => api.post('/user/add-balance', { amount }),
    getBalance: () => api.get('/user/balance'),
};

// Slots endpoints
export const slotsAPI = {
    spin: (betAmount, isBoughtBonusSpin = false, isFirstBoughtSpin = false, bonusMultiplier = 1) =>
        api.post('/slots/spin', { betAmount, isBoughtBonusSpin, isFirstBoughtSpin, bonusMultiplier }),
    buyBonus: (betAmount) => api.post('/slots/buy-bonus', { betAmount }),
};

export default api;