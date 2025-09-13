// Vietnamese-first internationalization
export const t = {
  // Common
  common: {
    loading: 'Đang tải...',
    error: 'Lỗi',
    success: 'Thành công',
    info: 'Thông tin',
    cancel: 'Hủy',
    save: 'Lưu',
    delete: 'Xóa',
    edit: 'Sửa',
    create: 'Tạo mới',
    search: 'Tìm kiếm',
    refresh: 'Làm mới',
    close: 'Đóng',
    confirm: 'Xác nhận',
    yes: 'Có',
    no: 'Không',
    total: 'Tổng cộng',
    actions: 'Hành động',
    status: 'Trạng thái',
    name: 'Tên',
    description: 'Mô tả',
    date: 'Ngày',
    time: 'Thời gian',
    quantity: 'Số lượng',
    price: 'Giá',
    type: 'Loại',
    user: 'Người dùng',
    order: 'Đơn hàng',
    post: 'Bài đăng',
    group: 'Nhóm',
    page: 'Trang',
  },

  // Navigation
  nav: {
    posts: 'Bài đăng & Đơn hàng',
    statuses: 'Trạng thái',
    users: 'Người dùng',
    userOrders: 'Người dùng có đơn hàng',
    admin: 'MinhMom Admin',
  },

  // Posts & Orders
  posts: {
    title: 'Bài đăng & Đơn hàng',
    noPosts: 'Chưa có bài đăng nào',
    noOrders: 'Chưa có đơn hàng nào cho bài đăng này',
    itemsCount: 'Số mặt hàng',
    lastUpdate: 'Cập nhật cuối',
    openOrders: 'Xem đơn hàng',
    createOrder: 'Tạo đơn hàng',
    orderDetails: 'Chi tiết đơn hàng',
    commentId: 'ID bình luận',
    commentText: 'Nội dung bình luận',
    userUrl: 'URL người dùng',
    total: 'Tổng tiền',
    statusHistory: 'Lịch sử trạng thái',
    addOrder: 'Thêm đơn hàng',
    updateStatus: 'Cập nhật trạng thái',
    itemName: 'Tên sản phẩm',
    itemType: 'Loại sản phẩm',
  },

  // Statuses
  statuses: {
    title: 'Quản lý trạng thái',
    noStatuses: 'Chưa có trạng thái nào',
    createStatus: 'Tạo trạng thái mới',
    editStatus: 'Sửa trạng thái',
    deleteStatus: 'Xóa trạng thái',
    statusCode: 'Mã trạng thái',
    statusName: 'Tên trạng thái',
    statusDescription: 'Mô tả trạng thái',
    active: 'Hoạt động',
    inactive: 'Không hoạt động',
    confirmDelete: 'Bạn có chắc chắn muốn xóa trạng thái này?',
  },

  // Users
  users: {
    title: 'Quản lý người dùng',
    noUsers: 'Chưa có người dùng nào',
    createUser: 'Tạo người dùng mới',
    editUser: 'Sửa người dùng',
    deleteUser: 'Xóa người dùng',
    fbUid: 'Facebook UID',
    name: 'Tên',
    fbUsername: 'Tên đăng nhập Facebook',
    fbUrl: 'URL Facebook',
    address: 'Địa chỉ',
    phoneNumber: 'Số điện thoại',
    avatarUrl: 'URL ảnh đại diện',
    notes: 'Ghi chú',
    confirmDelete: 'Bạn có chắc chắn muốn xóa người dùng này?',
  },

  // User Orders
  userOrders: {
    title: 'Người dùng có đơn hàng',
    noUsers: 'Chưa có người dùng nào có đơn hàng',
    orderCount: 'Số đơn hàng',
    totalRevenue: 'Tổng doanh thu',
    activeOrders: 'Đơn hàng đang xử lý',
    userInfo: 'Thông tin người dùng',
    adminSummary: 'Tổng kết (Admin)',
    selectAll: 'Chọn tất cả',
    noActiveOrders: 'Không có đơn hàng đang xử lý',
  },

  // Errors
  errors: {
    networkError: 'Lỗi kết nối mạng',
    serverError: 'Lỗi máy chủ',
    validationError: 'Lỗi xác thực',
    duplicateOrder: 'Đơn hàng đã tồn tại',
    statusNotFound: 'Trạng thái không tồn tại',
    userNotFound: 'Người dùng không tồn tại',
    postNotFound: 'Bài đăng không tồn tại',
    orderNotFound: 'Đơn hàng không tồn tại',
    unknownError: 'Lỗi không xác định',
  },

  // Success messages
  success: {
    statusCreated: 'Tạo trạng thái thành công',
    statusUpdated: 'Cập nhật trạng thái thành công',
    statusDeleted: 'Xóa trạng thái thành công',
    userCreated: 'Tạo người dùng thành công',
    userUpdated: 'Cập nhật người dùng thành công',
    userDeleted: 'Xóa người dùng thành công',
    orderCreated: 'Tạo đơn hàng thành công',
    orderUpdated: 'Cập nhật đơn hàng thành công',
    postUpdated: 'Cập nhật bài đăng thành công',
  },

  // Authentication
  auth: {
    login: 'Đăng nhập',
    register: 'Đăng ký',
    logout: 'Đăng xuất',
    username: 'Tên đăng nhập',
    password: 'Mật khẩu',
    confirmPassword: 'Xác nhận mật khẩu',
    email: 'Email',
    fullName: 'Họ và tên',
    enterUsername: 'Nhập tên đăng nhập',
    enterPassword: 'Nhập mật khẩu',
    enterEmail: 'Nhập email',
    enterFullName: 'Nhập họ và tên',
    enterConfirmPassword: 'Nhập lại mật khẩu',
    loginTitle: 'Đăng nhập',
    loginDescription: 'Nhập thông tin đăng nhập để truy cập hệ thống',
    registerTitle: 'Đăng ký',
    registerDescription: 'Tạo tài khoản mới để sử dụng hệ thống',
    loggingIn: 'Đang đăng nhập...',
    registering: 'Đang đăng ký...',
    noAccount: 'Chưa có tài khoản? Đăng ký',
    haveAccount: 'Đã có tài khoản? Đăng nhập',
    loginSuccess: 'Đăng nhập thành công',
    registerSuccess: 'Đăng ký thành công',
    loginFailed: 'Đăng nhập thất bại',
    registerFailed: 'Đăng ký thất bại',
    invalidCredentials: 'Thông tin đăng nhập không hợp lệ',
    fillAllFields: 'Vui lòng điền đầy đủ thông tin',
    passwordsNotMatch: 'Mật khẩu không khớp',
    systemTitle: 'Hệ thống quản lý MinhMom',
    signInToAccount: 'Đăng nhập vào tài khoản của bạn',
    createNewAccount: 'Tạo tài khoản mới',
  },

  // Form validation
  validation: {
    required: 'Trường này là bắt buộc',
    invalidEmail: 'Email không hợp lệ',
    invalidUrl: 'URL không hợp lệ',
    minLength: 'Tối thiểu {min} ký tự',
    maxLength: 'Tối đa {max} ký tự',
    invalidNumber: 'Số không hợp lệ',
    positiveNumber: 'Số phải lớn hơn 0',
  },

  // Currency and numbers
  currency: {
    vnd: 'VND',
    format: (amount: number) => new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount),
    formatNumber: (number: number) => new Intl.NumberFormat('vi-VN').format(number),
  },

  // Date and time
  datetime: {
    format: (date: string | Date) => new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date)),
    formatDate: (date: string | Date) => new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date)),
    formatTime: (date: string | Date) => new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date)),
  },
};

// Helper function to get nested translation
export const getTranslation = (path: string, params?: Record<string, any>): string => {
  const keys = path.split('.');
  let value: any = t;

  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) {
      console.warn(`Translation key not found: ${path}`);
      return path;
    }
  }

  if (typeof value === 'function') {
    return value(params);
  }

  if (typeof value === 'string' && params) {
    return value.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? params[key] : match;
    });
  }

  return value;
};

export default t;
