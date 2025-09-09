import { create } from 'zustand';
import { getAppConfig } from '@/config/app-config';

interface AppState {
  // UI State
  activeTab: 'dashboard' | 'posts' | 'orders' | 'userOrders' | 'statuses' | 'users';
  selectedGroupId: string;
  selectedPostId: string | null;
  selectedUserId: string | null;
  isOrdersDrawerOpen: boolean;
  isUserOrdersDrawerOpen: boolean;

  // Modals
  isCreateOrderModalOpen: boolean;
  isCreateStatusModalOpen: boolean;
  isCreateUserModalOpen: boolean;
  isEditStatusModalOpen: boolean;
  isEditUserModalOpen: boolean;

  // Filters
  postsSearchQuery: string;
  usersSearchQuery: string;
  ordersStatusFilter: string;
  userOrdersStatusFilter: string;

  // Actions
  setActiveTab: (tab: 'dashboard' | 'posts' | 'orders' | 'userOrders' | 'statuses' | 'users') => void;
  setSelectedGroupId: (groupId: string) => void;
  setSelectedPostId: (postId: string | null) => void;
  setSelectedUserId: (userId: string | null) => void;
  setOrdersDrawerOpen: (open: boolean) => void;
  setUserOrdersDrawerOpen: (open: boolean) => void;

  // Modal actions
  setCreateOrderModalOpen: (open: boolean) => void;
  setCreateStatusModalOpen: (open: boolean) => void;
  setCreateUserModalOpen: (open: boolean) => void;
  setEditStatusModalOpen: (open: boolean) => void;
  setEditUserModalOpen: (open: boolean) => void;

  // Filter actions
  setPostsSearchQuery: (query: string) => void;
  setUsersSearchQuery: (query: string) => void;
  setOrdersStatusFilter: (status: string) => void;
  setUserOrdersStatusFilter: (status: string) => void;

  // Reset actions
  resetFilters: () => void;
  closeAllModals: () => void;
}

const { groupId: defaultGroupId } = getAppConfig();

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  activeTab: 'posts',
  selectedGroupId: defaultGroupId,
  selectedPostId: null,
  selectedUserId: null,
  isOrdersDrawerOpen: false,
  isUserOrdersDrawerOpen: false,

  // Modals
  isCreateOrderModalOpen: false,
  isCreateStatusModalOpen: false,
  isCreateUserModalOpen: false,
  isEditStatusModalOpen: false,
  isEditUserModalOpen: false,

  // Filters
  postsSearchQuery: '',
  usersSearchQuery: '',
  ordersStatusFilter: '',
  userOrdersStatusFilter: '',

  // Actions
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedGroupId: (groupId) => set({ selectedGroupId: groupId }),
  setSelectedPostId: (postId) => set({ selectedPostId: postId }),
  setSelectedUserId: (userId) => set({ selectedUserId: userId }),
  setOrdersDrawerOpen: (open) => set({ isOrdersDrawerOpen: open }),
  setUserOrdersDrawerOpen: (open) => set({ isUserOrdersDrawerOpen: open }),

  // Modal actions
  setCreateOrderModalOpen: (open) => set({ isCreateOrderModalOpen: open }),
  setCreateStatusModalOpen: (open) => set({ isCreateStatusModalOpen: open }),
  setCreateUserModalOpen: (open) => set({ isCreateUserModalOpen: open }),
  setEditStatusModalOpen: (open) => set({ isEditStatusModalOpen: open }),
  setEditUserModalOpen: (open) => set({ isEditUserModalOpen: open }),

  // Filter actions
  setPostsSearchQuery: (query) => set({ postsSearchQuery: query }),
  setUsersSearchQuery: (query) => set({ usersSearchQuery: query }),
  setOrdersStatusFilter: (status) => set({ ordersStatusFilter: status }),
  setUserOrdersStatusFilter: (status) => set({ userOrdersStatusFilter: status }),

  // Reset actions
  resetFilters: () => set({
    postsSearchQuery: '',
    usersSearchQuery: '',
    ordersStatusFilter: '',
    userOrdersStatusFilter: '',
  }),

  closeAllModals: () => set({
    isCreateOrderModalOpen: false,
    isCreateStatusModalOpen: false,
    isCreateUserModalOpen: false,
    isEditStatusModalOpen: false,
    isEditUserModalOpen: false,
    isOrdersDrawerOpen: false,
    isUserOrdersDrawerOpen: false,
  }),
}));
