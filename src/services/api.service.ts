import { API_CONFIG } from '../config/api';

interface RequestOptions extends RequestInit {
    params?: Record<string, string | number | boolean>;
}

class ApiService {
    private baseURL: string;
    private timeout: number;
    private defaultHeaders: HeadersInit;

    constructor() {
        this.baseURL = API_CONFIG.baseURL;
        this.timeout = API_CONFIG.timeout;
        this.defaultHeaders = API_CONFIG.headers;
    }

    // Get auth token from localStorage
    private getAuthToken(): string | null {
        return localStorage.getItem('authToken');
    }

    // Build headers with auth token
    private buildHeaders(customHeaders?: HeadersInit): HeadersInit {
        const token = this.getAuthToken();
        const headers: HeadersInit = {
            ...this.defaultHeaders,
            ...customHeaders,
        };
        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Build URL with query parameters
    private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
        const url = new URL(`${this.baseURL}${endpoint}`);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
            });
        }

        return url.toString();
    }

    // Handle API errors
    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                message: response.statusText || 'An error occurred',
            }));

            throw {
                status: response.status,
                message: error.message || 'Request failed',
                data: error,
            };
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }

        return response.text() as Promise<T>;
    }

    // Generic request method with timeout
    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const { params, ...fetchOptions } = options;
        const url = this.buildURL(endpoint, params);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: this.buildHeaders(fetchOptions.headers),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return this.handleResponse<T>(response);
        } catch (error: unknown) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw { status: 408, message: 'Request timeout' };
                }
                throw { status: 0, message: error.message || 'Network error' };
            }

            throw error;
        }
    }

    // HTTP Methods
    async get<T>(endpoint: string, params?: Record<string, string | number | boolean>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    // Upload file with FormData
    async upload<T>(endpoint: string, formData: FormData): Promise<T> {
        const token = this.getAuthToken();
        const headers: HeadersInit = {};

        if (token) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers,
                body: formData,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            return this.handleResponse<T>(response);
        } catch (error: unknown) {
            clearTimeout(timeoutId);

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw { status: 408, message: 'Request timeout' };
                }
                throw { status: 0, message: error.message || 'Network error' };
            }

            throw error;
        }
    }

    // Set auth token
    setAuthToken(token: string): void {
        localStorage.setItem('authToken', token);
    }

    // Clear auth token
    clearAuthToken(): void {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('firstConnection');
    }

    // Update base URL
    setBaseURL(url: string): void {
        this.baseURL = url;
    }
}

const apiService = new ApiService();
export default apiService;
