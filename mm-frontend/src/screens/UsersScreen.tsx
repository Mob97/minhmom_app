import React, { useState, useEffect } from 'react';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-api';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import type { CreateUserRequest, UpdateUserRequest } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { CreateUserModal } from '@/components/users/CreateUserModal';
import { EditUserModal } from '@/components/users/EditUserModal';
import { DeleteUserDialog } from '@/components/users/DeleteUserDialog';
import { UserOrdersDrawer } from '@/components/orders/UserOrdersDrawer';
import { Pagination } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { SortableHeader, type SortConfig } from '@/components/ui/sortable-header';

export const UsersScreen: React.FC = () => {
  const {
    usersSearchQuery,
    setUsersSearchQuery,
    isCreateUserModalOpen,
    setCreateUserModalOpen,
    isEditUserModalOpen,
    setEditUserModalOpen,
    setSelectedUserId,
    setUserOrdersDrawerOpen
  } = useAppStore();

  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'name',
    direction: 'asc'
  });

  // Local state for search input (immediate UI update)
  const [searchInput, setSearchInput] = useState(usersSearchQuery || '');
  // Debounced search query for API calls
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(usersSearchQuery || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
      setUsersSearchQuery(searchInput);
    }, 2000); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput, setUsersSearchQuery]);

  // Sync local input with global state when it changes externally
  useEffect(() => {
    setSearchInput(usersSearchQuery || '');
  }, [usersSearchQuery]);

  const { data: usersResponse, isLoading, error, refetch } = useUsers({
    q: debouncedSearchQuery || undefined,
    page: currentPage,
    page_size: pageSize,
    sort_by: sortConfig.field,
    sort_direction: sortConfig.direction || 'asc',
  });

  const users = usersResponse?.data || [];
  const totalPages = usersResponse?.total_pages || 1;
  const total = usersResponse?.total || 0;

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const { toast } = useToast();

  const handleCreateUser = async (data: CreateUserRequest) => {
    try {
      await createUserMutation.mutateAsync(data);
      setCreateUserModalOpen(false);
      toast({
        title: t.success.userCreated,
        description: `${t.users.name}: ${data.name}`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUser = async (uid: string, data: UpdateUserRequest) => {
    try {
      await updateUserMutation.mutateAsync({ uid, data });
      setEditUserModalOpen(false);
      setEditingUser(null);
      toast({
        title: t.success.userUpdated,
        description: `${t.users.name}: ${data.name || uid}`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    try {
      await deleteUserMutation.mutateAsync(uid);
      setDeletingUser(null);
      toast({
        title: t.success.userDeleted,
        description: `${t.users.fbUid}: ${uid}`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
    }
  };

  const handleViewUserOrders = (uid: string) => {
    setSelectedUserId(uid);
    setUserOrdersDrawerOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleSort = (field: string) => {
    setSortConfig(prev => {
      if (prev.field === field) {
        // Cycle through: asc -> desc -> null -> asc
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return { field, direction: null };
        return { field, direction: 'asc' };
      }
      return { field, direction: 'asc' };
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">{t.errors.networkError}</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.common.refresh}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t.users.title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {total} {t.users.title.toLowerCase()} ({t.common.page} {currentPage} / {totalPages})
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Button onClick={() => refetch()} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.common.refresh}
          </Button>
          <Button onClick={() => setCreateUserModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t.users.createUser}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t.common.search} ${t.users.title.toLowerCase()}...`}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Users Table */}
      {!users || users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{t.users.noUsers}</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeader
                    field="fb_uid"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {t.users.fbUid}
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    field="name"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {t.users.name}
                  </SortableHeader>
                </TableHead>
                <TableHead>
                  <SortableHeader
                    field="fb_username"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                  >
                    {t.users.fbUsername}
                  </SortableHeader>
                </TableHead>
                <TableHead>{t.users.address}</TableHead>
                <TableHead>{t.users.phoneNumber}</TableHead>
                <TableHead>{t.users.notes}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.fb_uid}>
                  <TableCell className="font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://www.facebook.com/${user.fb_uid}`, '_blank')}
                      className="p-0 h-auto"
                    >
                      <Badge variant="outline">{user.fb_uid}</Badge>
                    </Button>
                  </TableCell>
                  <TableCell>
                    {user.name ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(user.fb_url || `https://www.facebook.com/${user.fb_uid}`, '_blank')}
                        className="p-0 h-auto text-left justify-start"
                      >
                        {user.name}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.fb_username || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {user.addresses && user.addresses.length > 0 ? user.addresses[0] : '—'}
                    {user.addresses && user.addresses.length > 1 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (+{user.addresses.length - 1})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.phone_number || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {user.notes || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewUserOrders(user.fb_uid)}
                        title="Xem đơn hàng"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user.fb_uid);
                          setEditUserModalOpen(true);
                        }}
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingUser(user.fb_uid)}
                        title="Xóa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Modals */}
      <CreateUserModal
        open={isCreateUserModalOpen}
        onOpenChange={setCreateUserModalOpen}
        onSubmit={handleCreateUser}
        loading={createUserMutation.isPending}
      />

      <EditUserModal
        open={isEditUserModalOpen}
        onOpenChange={(open) => {
          setEditUserModalOpen(open);
          if (!open) setEditingUser(null);
        }}
        uid={editingUser}
        onSubmit={handleUpdateUser}
        loading={updateUserMutation.isPending}
      />

      <DeleteUserDialog
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
        uid={deletingUser}
        onConfirm={handleDeleteUser}
        loading={deleteUserMutation.isPending}
      />

      <UserOrdersDrawer />
    </div>
  );
};
