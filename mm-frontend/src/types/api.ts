// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Status types
export interface Status {
  id: string;
  status_code: string;
  display_name: string;
  description?: string;
  is_active: boolean;
  view_order?: number;
}

export interface CreateStatusRequest {
  status_code: string;
  display_name: string;
  description?: string;
  is_active?: boolean;
  view_order?: number;
}

export interface UpdateStatusRequest {
  display_name?: string;
  description?: string;
  is_active?: boolean;
  view_order?: number;
}

// Authentication types
export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// User types (customers)
export interface User {
  id: string;
  fb_uid: string;
  fb_username?: string;
  name?: string;
  fb_url?: string;
  addresses: string[];
  phone_number?: string;
  avatar_url?: string;
  notes?: string;
  is_active: boolean;
  created_date?: string;
}

// User as it appears in orders (single address for shipping)
export interface OrderUser {
  fb_uid?: string;
  fb_username?: string;
  name?: string;
  fb_url?: string;
  address?: string;
  phone_number?: string;
  avatar_url?: string;
  addresses?: string[]; // All addresses for selection
  // Legacy properties for backward compatibility
  username?: string;
  uid?: string;
  url?: string;
}

export interface CreateUserRequest {
  fb_uid: string;
  fb_username?: string;
  name?: string;
  fb_url?: string;
  addresses?: string[];
  phone_number?: string;
  avatar_url?: string;
  notes?: string;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  fb_username?: string;
  name?: string;
  fb_url?: string;
  addresses?: string[];
  phone_number?: string;
  avatar_url?: string;
  notes?: string;
  is_active?: boolean;
}

// User with orders types
export interface UserWithOrders {
  id: string;
  fb_uid: string;
  fb_username?: string;
  name?: string;
  fb_url?: string;
  addresses: string[];
  phone_number?: string;
  avatar_url?: string;
  order_count: number;
  total_revenue: number;
  cancelled_orders_count?: number;
  created_date?: string;
  orders?: Array<{
    order: Order;
    post_id: string;
    post_description: string;
  }>;
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Post types
export interface Post {
  id: string;
  description?: string;
  items: PostItem[];
  tags: string[];
  import_price?: number;
  orders_last_update_at?: string;
  local_images?: string[];
  created_time?: string;
  updated_time?: string;
}

export interface PostItem {
  name?: string;
  type?: string;
  prices: PricePack[];
}

export interface PricePack {
  qty: number;
  bundle_price: number;
}

export interface UpdatePostRequest {
  description?: string;
  items?: PostItem[];
  tags?: string[];
  import_price?: number;
}

// Order types
export interface OrderSource {
  comment_id?: string;
  comment_url?: string;
  comment_text?: string;
  comment_created_time?: string;
}

export interface OrderCustomer {
  fb_uid?: string;
  fb_username?: string;
  name?: string;
  fb_url?: string;
  created_date?: string;
  addresses: string[];
  address?: string;
  phone_number?: string;
  avatar_url?: string;
  note?: string;
}

export interface OrderDeliveryInfo {
  name?: string;
  phone_number?: string;
  address?: string;
}

export interface OrderItem {
  item_id: number;
  item_name?: string;
  item_type?: string;
  unit_price: number;
  qty: number;
  total_price: number;
  price_calculation?: PriceCalculation;
}

export interface OrderStatusHistory {
  status: string;
  note?: string;
  at: string;
}

export interface Order {
  order_id: string;
  parsed_at?: string;
  currency: string;
  raw_url?: string;
  source?: OrderSource;
  customer?: OrderCustomer;
  delivery_info?: OrderDeliveryInfo;
  item?: OrderItem;
  status_code: string;
  status_history: OrderStatusHistory[];
  note?: string;
  post_id?: string;
  post_description?: string;

  // Legacy fields for backward compatibility
  comment_id?: string;
  comment_url?: string;
  comment_text?: string;
  comment_created_time?: string;
  url?: string;
  qty?: number;
  type?: string;
  matched_item?: PostItem;
  price_calc?: PriceCalculation;
  user?: OrderUser;
  address?: string;
}

export interface PriceCalculation {
  total: number;
  method: string;
  packs: PriceCalcPack[];
}

export interface PriceCalcPack {
  qty: number;
  count: number;
  bundle_price: number;
  subtotal: number;
}

export interface CreateOrderRequest {
  source?: OrderSource;
  customer?: OrderCustomer;
  delivery_info?: OrderDeliveryInfo;
  item?: OrderItem;
  status_code?: string;
  note?: string;

  // Price fields
  unit_price?: number;
  total_price?: number;

  // Legacy fields for backward compatibility
  comment_id?: string;
  comment_url?: string;
  comment_text?: string;
  comment_created_time?: string;
  url?: string;
  qty?: number;
  type?: string;
  currency?: string;
  matched_item?: PostItem;
  price_calc?: PriceCalculation;
  user?: {
    name?: string;
    address?: string;
    phone_number?: string;
  };
}

export interface UpdateOrderRequest {
  source?: OrderSource;
  customer?: OrderCustomer;
  delivery_info?: OrderDeliveryInfo;
  item?: OrderItem;
  status_code?: string;
  note?: string;

  // Price fields
  unit_price?: number;
  total_price?: number;

  // Legacy fields for backward compatibility
  comment_id?: string;
  comment_url?: string;
  comment_text?: string;
  comment_created_time?: string;
  url?: string;
  qty?: number;
  type?: string;
  currency?: string;
  matched_item?: PostItem;
  price_calc?: PriceCalculation;
  user?: {
    name?: string;
    address?: string;
    phone_number?: string;
  };
}

export interface UpdateOrderStatusRequest {
  new_status_code: string;
  note?: string;
  actor?: string;
}

// Helper functions for backward compatibility
export const getOrderCustomerName = (order: Order): string => {
  return order.customer?.name || order.customer?.fb_username || order.user?.name || order.user?.fb_username || 'Unknown User';
};

export const getOrderCustomerUrl = (order: Order): string => {
  return order.customer?.fb_url || order.raw_url || order.url || '';
};

export const getOrderQuantity = (order: Order): number => {
  return order.item?.qty || order.qty || 0;
};

export const getOrderType = (order: Order): string => {
  return order.item?.item_type || order.type || '';
};

export const getOrderTotalPrice = (order: Order): number => {
  return order.item?.total_price || order.price_calc?.total || 0;
};

export const getOrderPriceCalc = (order: Order): PriceCalculation | undefined => {
  return order.item?.price_calculation || order.price_calc;
};

export const getOrderAddress = (order: Order): string => {
  return order.delivery_info?.address || order.customer?.address || order.user?.address || order.address || '';
};

export const getOrderPhoneNumber = (order: Order): string => {
  return order.delivery_info?.phone_number || order.customer?.phone_number || order.user?.phone_number || '';
};

export const getOrderCommentId = (order: Order): string | undefined => {
  return order.source?.comment_id || order.comment_id;
};

export const getOrderCommentUrl = (order: Order): string | undefined => {
  return order.source?.comment_url || order.comment_url;
};

export const getOrderCommentText = (order: Order): string | undefined => {
  return order.source?.comment_text || order.comment_text;
};

export const getOrderCommentCreatedTime = (order: Order): string | undefined => {
  return order.source?.comment_created_time || order.comment_created_time;
};

// API Error types
export interface ApiError {
  detail: string;
  status_code: number;
}

// Query parameters
export interface StatusQueryParams {
  active?: boolean;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface UserQueryParams {
  q?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  active_orders_only?: boolean;
}

export interface PostQueryParams {
  page?: number;
  page_size?: number;
  q?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

export interface OrderQueryParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// Environment configuration
export interface AppConfig {
  apiBaseUrl: string;
  groupId: string;
  environment: 'development' | 'staging' | 'production';
}
