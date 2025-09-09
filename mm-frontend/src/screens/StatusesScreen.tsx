import React, { useState } from 'react';
import { useStatuses, useCreateStatus, useUpdateStatus, useDeleteStatus } from '@/hooks/use-api';
import { useAppStore } from '@/store/app-store';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, RefreshCw, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { CreateStatusModal } from '@/components/statuses/CreateStatusModal';
import { EditStatusModal } from '@/components/statuses/EditStatusModal';
import { DeleteStatusDialog } from '@/components/statuses/DeleteStatusDialog';
import { useToast } from '@/hooks/use-toast';

export const StatusesScreen: React.FC = () => {
  const {
    isCreateStatusModalOpen,
    setCreateStatusModalOpen,
    isEditStatusModalOpen,
    setEditStatusModalOpen
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<string | null>(null);

  const { data: statuses, isLoading, error, refetch } = useStatuses({
    active: showActiveOnly ? true : undefined,
  });

  const createStatusMutation = useCreateStatus();
  const updateStatusMutation = useUpdateStatus();
  const deleteStatusMutation = useDeleteStatus();
  const { toast } = useToast();

  const filteredStatuses = statuses?.filter(status =>
    status.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    status.status_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    status.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCreateStatus = async (data: any) => {
    try {
      await createStatusMutation.mutateAsync(data);
      setCreateStatusModalOpen(false);
      toast({
        title: t.success.statusCreated,
        description: `${t.statuses.statusName}: ${data.display_name}`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (statusCode: string, data: any) => {
    try {
      await updateStatusMutation.mutateAsync({ statusCode, data });
      setEditStatusModalOpen(false);
      setEditingStatus(null);
      toast({
        title: t.success.statusUpdated,
        description: `${t.statuses.statusName}: ${data.display_name || statusCode}`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStatus = async (statusCode: string) => {
    try {
      await deleteStatusMutation.mutateAsync(statusCode);
      setDeletingStatus(null);
      toast({
        title: t.success.statusDeleted,
        description: `${t.statuses.statusCode}: ${statusCode}`,
      });
    } catch (error: any) {
      toast({
        title: t.common.error,
        description: error.detail || t.errors.unknownError,
        variant: 'destructive',
      });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t.statuses.title}</h2>
          <p className="text-muted-foreground">
            {filteredStatuses.length} {t.statuses.title.toLowerCase()}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t.common.refresh}
          </Button>
          <Button onClick={() => setCreateStatusModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t.statuses.createStatus}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`${t.common.search} ${t.statuses.title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showActiveOnly ? "default" : "outline"}
          onClick={() => setShowActiveOnly(!showActiveOnly)}
        >
          {showActiveOnly ? t.statuses.active : 'Tất cả'}
        </Button>
      </div>

      {/* Statuses Table */}
      {filteredStatuses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">{t.statuses.noStatuses}</p>
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.statuses.statusCode}</TableHead>
                <TableHead>{t.statuses.statusName}</TableHead>
                <TableHead>Thứ tự</TableHead>
                <TableHead>{t.common.description}</TableHead>
                <TableHead>{t.common.status}</TableHead>
                <TableHead className="text-right">{t.common.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStatuses.map((status) => (
                <TableRow key={status.status_code}>
                  <TableCell className="font-medium">
                    <Badge variant="outline">{status.status_code}</Badge>
                  </TableCell>
                  <TableCell>{status.display_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {status.view_order || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {status.description || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {status.is_active ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={status.is_active ? 'text-green-700' : 'text-red-700'}>
                        {status.is_active ? t.statuses.active : t.statuses.inactive}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingStatus(status.status_code);
                          setEditStatusModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingStatus(status.status_code)}
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

      {/* Modals */}
      <CreateStatusModal
        open={isCreateStatusModalOpen}
        onOpenChange={setCreateStatusModalOpen}
        onSubmit={handleCreateStatus}
        loading={createStatusMutation.isPending}
      />

      <EditStatusModal
        open={isEditStatusModalOpen}
        onOpenChange={(open) => {
          setEditStatusModalOpen(open);
          if (!open) setEditingStatus(null);
        }}
        statusCode={editingStatus}
        onSubmit={handleUpdateStatus}
        loading={updateStatusMutation.isPending}
      />

      <DeleteStatusDialog
        open={!!deletingStatus}
        onOpenChange={(open) => {
          if (!open) setDeletingStatus(null);
        }}
        statusCode={deletingStatus}
        onConfirm={handleDeleteStatus}
        loading={deleteStatusMutation.isPending}
      />
    </div>
  );
};
