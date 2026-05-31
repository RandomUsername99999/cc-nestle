import axios from 'axios';

const api = axios.create({
    baseURL: 'https://UnderpaidWorker.pythonanywhere.com/api/',
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Identity Fallback for session-less/debugging scenarios
        const userId = localStorage.getItem('user_id');
        if (userId) {
            if (config.method === 'get') {
                config.params = { ...config.params, user_id: userId };
            } else if (['post', 'put', 'patch'].includes(config.method)) {
                // Ensure data is an object
                if (typeof config.data !== 'object') config.data = {};
                config.data = { ...config.data, user_id: userId };
            }
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            // Prevent infinite loop if already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
