# MinhMom Admin Frontend

A React + shadcn/ui admin interface for managing posts, orders, statuses, and users.

## Features

- **Posts & Orders Management**: View posts and manage orders with status tracking
- **Status Management**: CRUD operations for order statuses
- **User Management**: Search and manage users
- **Vietnamese-first UI**: Localized interface with Vietnamese labels
- **Real-time Updates**: React Query for efficient data fetching and caching

## Tech Stack

- React 19 + TypeScript
- Vite for build tooling
- shadcn/ui + TailwindCSS for UI components
- React Query for server state management
- Zustand for client state management
- Lucide React for icons

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
# Create .env file with:
VITE_API_BASE_URL=http://localhost:8000
VITE_GROUP_ID=default
```

3. Start development server:
```bash
npm run dev
```

## API Integration

The frontend expects a backend API with the following endpoints:

- `GET /statuses` - List all statuses
- `POST /statuses` - Create status
- `PATCH /statuses/{status_code}` - Update status
- `DELETE /statuses/{status_code}` - Delete status

- `GET /users` - List users
- `POST /users` - Create/upsert user
- `PATCH /users/{uid}` - Update user
- `DELETE /users/{uid}` - Delete user

- `GET /groups/{group_id}/posts` - List posts
- `GET /groups/{group_id}/posts/{post_id}` - Get post details
- `PATCH /groups/{group_id}/posts/{post_id}` - Update post

- `GET /groups/{group_id}/posts/{post_id}/orders` - List orders
- `POST /groups/{group_id}/posts/{post_id}/orders` - Create order
- `PATCH /groups/{group_id}/posts/{post_id}/orders/{order_id}/status` - Update order status

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (TopBar, NavigationTabs)
│   ├── orders/         # Order-related components
│   ├── statuses/       # Status management components
│   ├── users/          # User management components
│   └── ui/             # shadcn/ui components
├── hooks/              # Custom React hooks
├── lib/                # Utility libraries
│   ├── api-client.ts   # API client with axios
│   ├── i18n.ts         # Internationalization
│   └── utils.ts        # Utility functions
├── screens/            # Main screen components
├── store/              # Zustand stores
├── types/              # TypeScript type definitions
└── App.tsx             # Main app component
```

## Development

The app uses:
- **React Query** for server state management with automatic caching and refetching
- **Zustand** for client state (modals, filters, selected items)
- **shadcn/ui** for consistent, accessible UI components
- **TailwindCSS** for styling with CSS variables for theming
- **TypeScript** for type safety

## Building

```bash
npm run build
```

The built files will be in the `dist/` directory.