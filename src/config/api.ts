//API configurations
export const API_CONFIG = {
    baseURL: import.meta.env.API_BASE_URL || 'http://localhost:5000/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
};

//API endpoints
export const API_ENDPOINTS = {
    //authentication:
    auth:{
        login: '/auth/login',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
        me: '/auth/me'
    },
    users:{
        list: '/users'
    }
}

