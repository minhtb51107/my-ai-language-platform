import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// REQUEST INTERCEPTOR: Gắn Token và Log
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    
    // LOG: Xem request gửi đi có bị dính chuỗi "undefined" không
    console.log(`[🚀 API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, { token });
    
    if (token && token !== 'undefined' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR: Bắt lỗi và Log
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[✅ API SUCCESS] ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    // LOG: Xem chính xác Backend chửi lỗi gì (401, 404, 500...)
    console.error(`[❌ API ERROR] ${error.config?.url}`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.warn('⚠️ Token hết hạn hoặc không hợp lệ -> Bắn sự kiện auth:unauthorized');
      localStorage.removeItem('access_token');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);