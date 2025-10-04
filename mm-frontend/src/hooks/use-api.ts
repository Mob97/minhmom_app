import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { statusApi, userApi, postApi, orderApi } from '@/lib/api-client';
import type {
  CreateStatusRequest,
  UpdateStatusRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UpdatePostRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  UpdateOrderStatusRequest,
  StatusQueryParams,
  UserQueryParams,
  PostQueryParams,
  OrderQueryParams
} from '@/types/api';

// Query keys
export const queryKeys = {
  statuses: (params?: StatusQueryParams) => ['statuses', params] as const,
  status: (statusCode: string) => ['statuses', statusCode] as const,
  users: (params?: UserQueryParams) => ['users', params] as const,
  user: (uid: string) => ['users', uid] as const,
  usersWithOrders: (params?: UserQueryParams) => ['users-with-orders', params] as const,
  posts: (groupId: string, params?: PostQueryParams) => ['posts', groupId, params] as const,
  post: (groupId: string, postId: string) => ['posts', groupId, postId] as const,
  orders: (groupId: string, postId: string) => ['orders', groupId, postId] as const,
  allOrders: (groupId: string, params?: OrderQueryParams) => ['all-orders', groupId, params] as const,
};

// Status hooks
export const useStatuses = (params?: StatusQueryParams) => {
  return useQuery({
    queryKey: queryKeys.statuses(params),
    queryFn: () => statusApi.getAll(params),
  });
};

export const useStatus = (statusCode: string) => {
  return useQuery({
    queryKey: queryKeys.status(statusCode),
    queryFn: () => statusApi.getById(statusCode),
    enabled: !!statusCode,
  });
};

export const useCreateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStatusRequest) => statusApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
};

export const useUpdateStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ statusCode, data }: { statusCode: string; data: UpdateStatusRequest }) =>
      statusApi.update(statusCode, data),
    onSuccess: (_, { statusCode }) => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.status(statusCode) });
    },
  });
};

export const useDeleteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (statusCode: string) => statusApi.delete(statusCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['statuses'] });
    },
  });
};

// User hooks
export const useUsers = (params?: UserQueryParams) => {
  return useQuery({
    queryKey: queryKeys.users(params),
    queryFn: () => userApi.getAll(params),
  });
};

export const useUser = (uid: string) => {
  return useQuery({
    queryKey: queryKeys.user(uid),
    queryFn: () => userApi.getById(uid),
    enabled: !!uid,
  });
};

export const useUsersWithOrders = (groupId: string, params?: UserQueryParams) => {
  return useQuery({
    queryKey: queryKeys.usersWithOrders(params),
    queryFn: () => userApi.getWithOrders(groupId, params),
    enabled: !!groupId,
  });
};

export const useUserOrdersWithStats = (uid: string, groupId: string, page: number = 1, pageSize: number = 50) => {
  return useQuery({
    queryKey: ['user-orders-with-stats', uid, groupId, page, pageSize],
    queryFn: () => userApi.getOrdersWithStats(uid, groupId, page, pageSize),
    enabled: !!uid && !!groupId,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: UpdateUserRequest }) =>
      userApi.update(uid, data),
    onSuccess: (_, { uid }) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user(uid) });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (uid: string) => userApi.delete(uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Post hooks
export const usePosts = (groupId: string, params?: PostQueryParams) => {
  return useQuery({
    queryKey: queryKeys.posts(groupId, params),
    queryFn: () => postApi.getAll(groupId, params),
    enabled: !!groupId,
  });
};

export const usePost = (groupId: string, postId: string) => {
  return useQuery({
    queryKey: queryKeys.post(groupId, postId),
    queryFn: () => postApi.getById(groupId, postId),
    enabled: !!groupId && !!postId,
  });
};

export const useUpdatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, postId, data }: { groupId: string; postId: string; data: UpdatePostRequest }) =>
      postApi.update(groupId, postId, data),
    onSuccess: (_, { groupId, postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', groupId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.post(groupId, postId) });
    },
  });
};

// Order hooks
export const useOrders = (groupId: string, postId: string) => {
  return useQuery({
    queryKey: queryKeys.orders(groupId, postId),
    queryFn: () => orderApi.getAll(groupId, postId),
    enabled: !!groupId && !!postId,
  });
};

export const useAllOrders = (groupId: string, params?: OrderQueryParams) => {
  return useQuery({
    queryKey: queryKeys.allOrders(groupId, params),
    queryFn: () => orderApi.getAllPaginated(groupId, params),
    enabled: !!groupId,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, postId, data }: { groupId: string; postId: string; data: CreateOrderRequest }) =>
      orderApi.create(groupId, postId, data),
    onSuccess: (_, { groupId, postId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(groupId, postId) });
      // Invalidate all posts queries for this group
      queryClient.invalidateQueries({
        queryKey: ['posts', groupId],
        exact: false
      });
      // Force refetch of posts to ensure the updated post appears
      queryClient.refetchQueries({
        queryKey: ['posts', groupId],
        exact: false
      });
    },
  });
};

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      postId,
      orderId,
      data
    }: {
      groupId: string;
      postId: string;
      orderId: string;
      data: UpdateOrderRequest
    }) => orderApi.update(groupId, postId, orderId, data),
    onSuccess: (_, { groupId, postId }) => {
      // Invalidate both the specific post's orders and all orders queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(groupId, postId) });
      queryClient.invalidateQueries({ queryKey: ['all-orders', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-orders-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-orders'] });
      // Invalidate all posts queries for this group
      queryClient.invalidateQueries({
        queryKey: ['posts', groupId],
        exact: false
      });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      groupId,
      postId,
      orderId,
      data
    }: {
      groupId: string;
      postId: string;
      orderId: string;
      data: UpdateOrderStatusRequest
    }) => orderApi.updateStatus(groupId, postId, orderId, data),
    onSuccess: (_, { groupId, postId }) => {
      // Invalidate both the specific post's orders and all orders queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(groupId, postId) });
      queryClient.invalidateQueries({ queryKey: ['all-orders', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-orders-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-orders'] });
      // Invalidate all posts queries for this group
      queryClient.invalidateQueries({
        queryKey: ['posts', groupId],
        exact: false
      });
    },
  });
};

export const useOrdersByUser = (groupId: string, uid: string) => {
  return useQuery({
    queryKey: ['orders-by-user', groupId, uid],
    queryFn: () => orderApi.getByUser(groupId, uid),
    enabled: !!groupId && !!uid,
  });
};

// Dashboard hooks
export const useDashboardData = (groupId: string) => {
  return useQuery({
    queryKey: ['dashboard', groupId],
    queryFn: () => orderApi.getDashboardData(groupId),
    enabled: !!groupId,
  });
};

export const useCustomers = (q: string, limit: number = 10) => {
  return useQuery({
    queryKey: ['customers', 'search', q, limit],
    queryFn: () => userApi.search(q, limit),
    enabled: !!q && q.length >= 2,
    staleTime: 30000, // 30 seconds
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, data }: { uid: string; data: { name?: string; phone_number?: string; address?: string; addresses?: string[] } }) =>
      userApi.updateCustomer(uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, postId, orderId }: { groupId: string; postId: string; orderId: string }) =>
      orderApi.delete(groupId, postId, orderId),
    onSuccess: (_, { groupId, postId }) => {
      // Invalidate both the specific post's orders and all orders queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(groupId, postId) });
      queryClient.invalidateQueries({ queryKey: ['all-orders', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-orders-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-orders'] });
      // Invalidate all posts queries for this group
      queryClient.invalidateQueries({
        queryKey: ['posts', groupId],
        exact: false
      });
    },
  });
};

export const useSplitOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, postId, orderId, data }: { groupId: string; postId: string; orderId: string; data: { split_quantity: number; new_status_code: string; note?: string } }) =>
      orderApi.split(groupId, postId, orderId, data),
    onSuccess: (_, { groupId, postId }) => {
      // Invalidate both the specific post's orders and all orders queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders(groupId, postId) });
      queryClient.invalidateQueries({ queryKey: ['all-orders', groupId] });
      queryClient.invalidateQueries({ queryKey: ['user-orders-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-orders'] });
      // Invalidate all posts queries for this group
      queryClient.invalidateQueries({
        queryKey: ['posts', groupId],
        exact: false
      });
    },
  });
};