import axios from "axios";

// Use the appropriate API URL based on environment
// Backend runs on port 3003
const getBackendURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // In Electron production, backend runs on 3003
    return window.location.origin.replace(':3002', ':3003');
  }
  return 'http://localhost:3003';
};

export const API_BASE_URL = getBackendURL();


const instance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // Important for handling cookies
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Request interceptor to include token with every request
instance.interceptors.request.use(
  (config) => {
    // Get token from localStorage or Redux store
    const token = localStorage.getItem('userToken') || 
                  (window.__REDUX_STORE__ && window.__REDUX_STORE__.getState().userState.token);
    
    if (token) {
      config.headers.authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

    // Response interceptor to handle token refresh
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            // If token refresh is in progress, queue the request
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            })
              .then(() => instance(originalRequest))
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Attempt to refresh the token
            // await instance.post("/refresh-token");
            processQueue();
            return instance(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError);
            // If refresh token fails, redirect to login
            window.location.href = "/login";
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
            originalRequest._retry = false;
          }
        }

        return Promise.reject(error);
      }
    );

export default instance;
