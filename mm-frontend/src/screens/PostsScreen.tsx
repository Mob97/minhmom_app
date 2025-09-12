import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { usePosts } from '@/hooks/use-api';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Eye, ExternalLink } from 'lucide-react';
import { OrdersDrawer } from '@/components/orders/OrdersDrawer';
import { ImageGallery } from '@/components/ui/image-gallery';
import { Pagination } from '@/components/ui/pagination';
import { SortableHeader, type SortConfig } from '@/components/ui/sortable-header';

export const PostsScreen: React.FC = () => {
  const {
    selectedGroupId,
    postsSearchQuery,
    setPostsSearchQuery,
    setSelectedPostId,
    setOrdersDrawerOpen
  } = useAppStore();

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'orders_last_update_at',
    direction: 'desc'
  });

  // Local state for search input (immediate UI update)
  const [searchInput, setSearchInput] = useState(postsSearchQuery || '');
  // Debounced search query for API calls
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(postsSearchQuery || '');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchInput);
      setPostsSearchQuery(searchInput);
    }, 2000); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchInput, setPostsSearchQuery]);

  // Sync local input with global state when it changes externally
  useEffect(() => {
    setSearchInput(postsSearchQuery || '');
  }, [postsSearchQuery]);

  const { data: postsResponse, isLoading, error, refetch } = usePosts(selectedGroupId, {
    q: debouncedSearchQuery || undefined,
    page: currentPage,
    page_size: pageSize,
    sort_by: sortConfig.field,
    sort_direction: sortConfig.direction || 'desc',
  });

  const posts = postsResponse?.data || [];
  const totalPages = postsResponse?.total_pages || 1;
  const total = postsResponse?.total || 0;

  const handlePostClick = (postId: string) => {
    setSelectedPostId(postId);
    setOrdersDrawerOpen(true);
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
        // Cycle through: desc -> asc -> null -> desc
        if (prev.direction === 'desc') return { field, direction: 'asc' };
        if (prev.direction === 'asc') return { field, direction: null };
        return { field, direction: 'desc' };
      }
      return { field, direction: 'desc' };
    });
    setCurrentPage(1); // Reset to first page when sorting
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
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


  const getPostUrl = (postId: string) => {
    return `https://www.facebook.com/groups/${selectedGroupId}/posts/${postId}/`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{t.posts.title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {total} {t.common.post.toLowerCase()} ({t.common.page} {currentPage} / {totalPages})
          </p>
        </div>
        <Button onClick={() => refetch()} className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.common.refresh}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t.common.search} ${t.common.post.toLowerCase()}...`}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Posts Table */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{t.posts.noPosts}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-3">
                    <SortableHeader
                      field="created_time"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    >
                      {t.posts.itemName}
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="px-6 py-3">{t.posts.itemType}</TableHead>
                  <TableHead className="px-6 py-3">{t.common.description}</TableHead>
                  <TableHead className="px-6 py-3">Images</TableHead>
                  <TableHead className="px-6 py-3">
                    <SortableHeader
                      field="created_time"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    >
                      Thời gian tạo
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="px-6 py-3">
                    <SortableHeader
                      field="updated_time"
                      sortConfig={sortConfig}
                      onSort={handleSort}
                    >
                      Thời gian cập nhật
                    </SortableHeader>
                  </TableHead>
                  <TableHead className="px-6 py-3 text-right">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell className="px-6 py-4 font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 h-auto font-normal text-left justify-start"
                          onClick={() => window.open(getPostUrl(post.id), '_blank')}
                        >
                          {post.items[0]?.name || 'No item name'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(getPostUrl(post.id), '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="outline">
                        {post.items[0]?.type || 'No type'}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="max-w-48">
                        <p className="truncate">
                          {post.description || 'No description'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <ImageGallery
                        images={post.local_images || []}
                        postId={post.id}
                        maxDisplay={2}
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(post.created_time)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(post.updated_time)}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePostClick(post.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto font-medium text-left justify-start text-blue-600 hover:text-blue-800"
                      onClick={() => window.open(getPostUrl(post.id), '_blank')}
                    >
                      <p className="truncate text-sm sm:text-base">
                        {post.items[0]?.name || 'No item name'}
                      </p>
                    </Button>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {post.items[0]?.type || 'No type'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => window.open(getPostUrl(post.id), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePostClick(post.id)}
                    className="flex-shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>

                {post.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {post.description}
                  </p>
                )}

                {post.local_images && post.local_images.length > 0 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    <ImageGallery
                      images={post.local_images}
                      postId={post.id}
                      maxDisplay={3}
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:justify-between text-xs text-muted-foreground space-y-1 sm:space-y-0">
                  <span>Tạo: {formatDateTime(post.created_time)}</span>
                  <span>Cập nhật: {formatDateTime(post.updated_time)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Orders Drawer */}
      <OrdersDrawer />

    </div>
  );
};
