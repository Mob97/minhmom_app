import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import type {
  Status,
  CreateStatusRequest,
  UpdateStatusRequest,
  User,
  UserWithOrders,
  CreateUserRequest,
  UpdateUserRequest,
  Post,
  UpdatePostRequest,
  Order,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  StatusQueryParams,
  UserQueryParams,
  PostQueryParams,
  PaginatedResponse,
  ApiError,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  AuthResponse
} from '@/types/api';

import { getAppConfig } from '@/config/app-config';

// Get configuration from app config
const getConfig = () => {
  return getAppConfig();
};

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const { apiBaseUrl } = getConfig();

  const client = axios.create({
    baseURL: apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError: ApiError = {
        detail: error.response?.data?.detail || error.message || 'An error occurred',
        status_code: error.response?.status || 500,
      };
      return Promise.reject(apiError);
    }
  );

  return client;
};

const apiClient = createApiClient();

// Auth token management
let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
  apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthToken = () => {
  authToken = null;
  delete apiClient.defaults.headers.common['Authorization'];
};

// Add request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Auth API
export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response: AxiosResponse<AuthResponse> = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<AuthUser> => {
    const response: AxiosResponse<AuthUser> = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  getMe: async (): Promise<AuthUser> => {
    const response: AxiosResponse<AuthUser> = await apiClient.get('/auth/me');
    return response.data;
  },

  getUsers: async (): Promise<AuthUser[]> => {
    const response: AxiosResponse<AuthUser[]> = await apiClient.get('/auth/users');
    return response.data;
  },
};

// Status API
export const statusApi = {
  getAll: async (params?: StatusQueryParams): Promise<Status[]> => {
    const response: AxiosResponse<Status[]> = await apiClient.get('/statuses', { params });
    return response.data;
  },

  getById: async (statusCode: string): Promise<Status> => {
    const response: AxiosResponse<Status> = await apiClient.get(`/statuses/${statusCode}`);
    return response.data;
  },

  create: async (data: CreateStatusRequest): Promise<Status> => {
    const response: AxiosResponse<Status> = await apiClient.post('/statuses', data);
    return response.data;
  },

  update: async (statusCode: string, data: UpdateStatusRequest): Promise<Status> => {
    const response: AxiosResponse<Status> = await apiClient.patch(`/statuses/${statusCode}`, data);
    return response.data;
  },

  delete: async (statusCode: string): Promise<void> => {
    await apiClient.delete(`/statuses/${statusCode}`);
  },
};

// User API
export const userApi = {
  getAll: async (params?: UserQueryParams): Promise<PaginatedResponse<User>> => {
    const response: AxiosResponse<PaginatedResponse<User>> = await apiClient.get('/users', { params });
    return response.data;
  },

  getById: async (uid: string): Promise<User> => {
    const response: AxiosResponse<User> = await apiClient.get(`/users/${uid}`);
    return response.data;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const response: AxiosResponse<User> = await apiClient.post('/users', data);
    return response.data;
  },

  update: async (uid: string, data: UpdateUserRequest): Promise<User> => {
    const response: AxiosResponse<User> = await apiClient.patch(`/users/${uid}`, data);
    return response.data;
  },

  delete: async (uid: string): Promise<void> => {
    await apiClient.delete(`/users/${uid}`);
  },

  getWithOrders: async (groupId: string, params?: UserQueryParams): Promise<PaginatedResponse<UserWithOrders>> => {
    const response: AxiosResponse<PaginatedResponse<UserWithOrders>> = await apiClient.get('/users/with-orders/', {
      params: { group_id: groupId, ...params }
    });
    return response.data;
  },

  getOrdersWithStats: async (uid: string, groupId: string, page: number = 1, pageSize: number = 50): Promise<UserWithOrders> => {
    const response: AxiosResponse<UserWithOrders> = await apiClient.get(`/users/${uid}/orders`, {
      params: { group_id: groupId, page, page_size: pageSize }
    });
    return response.data;
  },
};

// Post API
export const postApi = {
  getAll: async (groupId: string, params?: PostQueryParams): Promise<PaginatedResponse<Post>> => {
    const response: AxiosResponse<PaginatedResponse<Post>> = await apiClient.get(
      `/groups/${groupId}/posts`,
      { params }
    );
    return response.data;
  },

  getById: async (groupId: string, postId: string): Promise<Post> => {
    const response: AxiosResponse<Post> = await apiClient.get(`/groups/${groupId}/posts/${postId}`);
    return response.data;
  },

  update: async (groupId: string, postId: string, data: UpdatePostRequest): Promise<Post> => {
    const response: AxiosResponse<Post> = await apiClient.patch(
      `/groups/${groupId}/posts/${postId}`,
      data
    );
    return response.data;
  },
};

// Order API
export const orderApi = {
  getAll: async (groupId: string, postId: string): Promise<Order[]> => {
    const response: AxiosResponse<Order[]> = await apiClient.get(
      `/groups/${groupId}/posts/${postId}/orders`
    );
    return response.data;
  },

  getAllPaginated: async (groupId: string, params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<Order>> => {
    const response: AxiosResponse<PaginatedResponse<Order>> = await apiClient.get(
      `/groups/${groupId}/posts/all-orders`,
      { params }
    );
    return response.data;
  },

  create: async (groupId: string, postId: string, data: CreateOrderRequest): Promise<Order> => {
    const response: AxiosResponse<Order> = await apiClient.post(
      `/groups/${groupId}/posts/${postId}/orders`,
      data
    );
    return response.data;
  },

  updateStatus: async (
    groupId: string,
    postId: string,
    orderId: string,
    data: UpdateOrderStatusRequest
  ): Promise<Order> => {
    const response: AxiosResponse<Order> = await apiClient.patch(
      `/groups/${groupId}/posts/${postId}/orders/${orderId}/status`,
      data
    );
    return response.data;
  },

  getByUser: async (groupId: string, uid: string): Promise<Order[]> => {
    const response: AxiosResponse<Order[]> = await apiClient.get(
      `/groups/${groupId}/posts/orders/by-user/${uid}`
    );
    return response.data;
  },

  getDashboardData: async (groupId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    totalOrders: number;
    monthlyOrders: number;
    monthlyRevenueData: Array<{ month: number; revenue: number }>;
    pendingOrders: number;
    cancelledOrders: number;
    newOrders: number;
    orderedOrders: number;
    receivedOrders: number;
    deliveringOrders: number;
    doneOrders: number;
  }> => {
    const response: AxiosResponse<{
      totalRevenue: number;
      monthlyRevenue: number;
      totalOrders: number;
      monthlyOrders: number;
      monthlyRevenueData: Array<{ month: number; revenue: number }>;
      pendingOrders: number;
      cancelledOrders: number;
      newOrders: number;
      orderedOrders: number;
      receivedOrders: number;
      deliveringOrders: number;
      doneOrders: number;
    }> = await apiClient.get(`/dashboard/groups/${groupId}`);
    return response.data;
  },
};

// Image API
export const imageApi = {
  getPostImages: async (postId: string): Promise<{ images: Array<{ filename: string; url: string; local_path: string }> }> => {
    const response: AxiosResponse<{ images: Array<{ filename: string; url: string; local_path: string }> }> =
      await apiClient.get(`/images/posts/${postId}`);
    return response.data;
  },

  getImageUrl: (postId: string, filename: string): string => {
    const { apiBaseUrl } = getConfig();
    return `${apiBaseUrl}/images/posts/${postId}/${filename}`;
  },

  health: async (): Promise<{ images_path: string; exists: boolean; posts_dir: string; posts_dir_exists: boolean }> => {
    const response: AxiosResponse<{ images_path: string; exists: boolean; posts_dir: string; posts_dir_exists: boolean }> =
      await apiClient.get('/images/health');
    return response.data;
  },
};

export { getConfig, apiClient };
