import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/use-api';
import { useAppStore } from '@/store/app-store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, XCircle, CheckCircle, Clock, Truck, ShoppingCart, AlertCircle } from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const { isAdmin } = useAuth();
  const selectedGroupId = useAppStore((state) => state.selectedGroupId);
  const { data: dashboardData, isLoading, error } = useDashboardData(selectedGroupId);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-muted-foreground">Truy Cập Bị Từ Chối</h2>
          <p className="text-muted-foreground">Bảng điều khiển này chỉ dành cho quản trị viên.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu bảng điều khiển...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-destructive">Lỗi Tải Bảng Điều Khiển</h2>
          <p className="text-muted-foreground">Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại sau.</p>
        </div>
      </div>
    );
  }

  const statusCards = [
    {
      title: 'Đơn Hàng Chờ Xử Lý',
      description: 'Đơn hàng chưa hoàn thành hoặc hủy',
      value: dashboardData?.pendingOrders || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Đơn Hàng Đã Hủy',
      description: 'Đơn hàng đã bị hủy',
      value: dashboardData?.cancelledOrders || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Đơn Hàng Mới',
      description: 'Đơn hàng vừa được tạo',
      value: dashboardData?.newOrders || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Đã Đặt Hàng',
      description: 'Đơn hàng đã được đặt',
      value: dashboardData?.orderedOrders || 0,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Đã Nhận Hàng',
      description: 'Đơn hàng đã được nhà cung cấp nhận',
      value: dashboardData?.receivedOrders || 0,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Đang Giao Hàng',
      description: 'Đơn hàng đang được giao',
      value: dashboardData?.deliveringOrders || 0,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Hoàn Thành',
      description: 'Đơn hàng đã hoàn thành thành công',
      value: dashboardData?.doneOrders || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bảng Điều Khiển</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Tổng quan đơn hàng và lãi năm {new Date().getFullYear()}
        </p>
      </div>

      {/* Yearly Overview */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Tổng Quan Năm {new Date().getFullYear()}</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Lãi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(dashboardData?.totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Năm nay
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Thu Nhập</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(dashboardData?.totalIncome || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Năm nay
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng Đơn Hàng</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                Tất cả thời gian
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tỷ Lệ Lãi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dashboardData?.totalIncome || 0) > 0
                  ? `${(((dashboardData?.totalRevenue || 0) / (dashboardData?.totalIncome || 1)) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Lãi / Thu nhập
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Overview */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Tổng Quan Tháng {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lãi Tháng Này</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(dashboardData?.monthlyRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Thu Nhập Tháng Này</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('vi-VN', {
                  style: 'currency',
                  currency: 'VND'
                }).format(dashboardData?.monthlyIncome || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đơn Hàng Tháng Này</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.monthlyOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tỷ Lệ Lãi Tháng</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dashboardData?.monthlyIncome || 0) > 0
                  ? `${(((dashboardData?.monthlyRevenue || 0) / (dashboardData?.monthlyIncome || 1)) * 100).toFixed(1)}%`
                  : '0%'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Lãi / Thu nhập
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profit and Income Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
          <CardTitle>Lãi Theo Tháng</CardTitle>
          <CardDescription>
            Lãi hàng tháng được tính bằng (Tổng Đơn Hàng - Giá Nhập) cho năm {new Date().getFullYear()}
          </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData?.monthlyRevenueData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => new Date(2024, value - 1).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis
                    tickFormatter={(value) => new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(value),
                      'Lãi'
                    ]}
                    labelFormatter={(label) => `Tháng ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thu Nhập Theo Tháng</CardTitle>
            <CardDescription>
              Tổng giá trị đơn hàng hàng tháng cho năm {new Date().getFullYear()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData?.monthlyIncomeData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => new Date(2024, value - 1).toLocaleDateString('en-US', { month: 'short' })}
                  />
                  <YAxis
                    tickFormatter={(value) => new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(value)}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(value),
                      'Thu Nhập'
                    ]}
                    labelFormatter={(label) => `Tháng ${label}`}
                  />
                  <Bar dataKey="income" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Status Cards */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-3 sm:mb-4">Tổng Quan Trạng Thái Đơn Hàng</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {statusCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
