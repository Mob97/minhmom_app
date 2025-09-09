# Authentication System

This document describes the authentication system implemented for the MinhMom application.

## Overview

The application now includes a role-based authentication system with JWT tokens. Users can have two roles:
- **admin**: Full access to all features, including the ability to view and modify `import_price` fields
- **user**: Limited access, can view Posts, Orders, Status, and Customers but cannot see `import_price` fields

## Features

### Backend Authentication

1. **JWT Token-based Authentication**
   - Secure token generation using `python-jose`
   - Password hashing with `bcrypt`
   - Token expiration (30 minutes by default)

2. **Role-based Access Control**
   - Admin users can view and modify `import_price` fields
   - Regular users cannot see `import_price` fields
   - All API endpoints require authentication

3. **User Management**
   - User registration and login endpoints
   - Password hashing and verification
   - User role assignment

### Frontend Authentication

1. **Authentication Context**
   - React context for managing authentication state
   - Automatic token storage in localStorage
   - Role-based UI rendering

2. **Login/Register Forms**
   - Clean, responsive authentication forms
   - Form validation and error handling
   - Role selection during registration

3. **Protected Routes**
   - All screens require authentication
   - Automatic redirect to login page if not authenticated
   - Loading states during authentication

## API Endpoints

### Authentication Endpoints

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `GET /auth/me` - Get current user information
- `GET /auth/users` - List all users (admin only)

### Protected Endpoints

All existing endpoints now require authentication:
- Posts: `GET`, `PATCH` (with role-based `import_price` filtering)
- Orders: `GET`, `POST`, `PATCH`
- Statuses: `GET`, `POST`, `PATCH`, `DELETE`
- Users (customers): `GET`, `POST`, `PATCH`, `DELETE`
- Images: `GET`

## Database Schema

### Users Collection

```json
{
  "_id": "ObjectId",
  "username": "string",
  "hashed_password": "string",
  "role": "admin" | "user",
  "is_active": "boolean",
  "created_at": "string (ISO datetime)"
}
```

### Posts Collection (Updated)

Posts now include an optional `import_price` field:

```json
{
  "_id": "string",
  "description": "string",
  "items": [...],
  "tags": [...],
  "import_price": "number (optional, admin only)",
  "orders_last_update_at": "string",
  "local_images": [...],
  "created_time": "string",
  "updated_time": "string"
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Create Initial Admin User

```bash
cd backend
python create_admin.py
```

This will create an admin user with:
- Username: `admin`
- Password: `admin123`

**Important**: Change the password after first login!

### 3. Start the Backend

```bash
cd backend
uvicorn app.main:app --reload
```

### 4. Start the Frontend

```bash
cd mm-frontend
npm install
npm run dev
```

## Usage

### First Time Setup

1. Start both backend and frontend servers
2. Navigate to the frontend (usually `http://localhost:5173`)
3. You'll see the login page
4. Login with the admin credentials created above
5. Change the admin password through the UI

### Creating New Users

1. Login as an admin user
2. Use the registration form to create new users
3. Assign appropriate roles (admin or user)

### Role-based Access

- **Admin users**: Can see and modify `import_price` fields in posts
- **Regular users**: Cannot see `import_price` fields, all other features work normally

## Security Considerations

1. **Password Security**: Passwords are hashed using bcrypt
2. **Token Security**: JWT tokens expire after 30 minutes
3. **Role Validation**: Server-side validation ensures proper role-based access
4. **Input Validation**: All user inputs are validated using Pydantic schemas

## Configuration

### Environment Variables

You can configure the following in your environment:

- `MONGODB_URI`: MongoDB connection string
- `DB_NAME`: Database name
- `VITE_API_BASE_URL`: Frontend API base URL

### JWT Configuration

JWT settings can be modified in `backend/app/auth.py`:

```python
SECRET_KEY = "your-secret-key-change-this-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
```

**Important**: Change the `SECRET_KEY` in production!

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Check if the backend is running and accessible
2. **Permission Denied**: Ensure the user has the correct role for the operation
3. **Token Expired**: The token expires after 30 minutes, user needs to login again

### Debug Mode

To enable debug logging, set the logging level in your configuration:

```python
logging.basicConfig(level=logging.DEBUG)
```

## Future Enhancements

1. **Token Refresh**: Implement refresh tokens for longer sessions
2. **Password Reset**: Add password reset functionality
3. **User Management**: Admin interface for managing users
4. **Audit Logging**: Log all user actions for security
5. **Multi-factor Authentication**: Add 2FA support
