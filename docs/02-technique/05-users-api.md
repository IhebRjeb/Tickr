# Users Module API Documentation

## Overview

The Users module provides comprehensive authentication and user management functionality for the Tickr platform. This document describes all REST API endpoints, request/response formats, and usage examples.

## Base URL

All endpoints are prefixed with `/api`.

---

## Authentication Endpoints (`/api/auth`)

### POST /api/auth/register

Register a new user account.

**Rate Limit:** 3 requests per hour

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+33612345678" // optional
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*)

**Success Response (201):**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Registration successful. Please check your email to verify your account."
}
```

**Error Responses:**
- `400 Bad Request` - Validation error (weak password, invalid email format)
- `422 Unprocessable Entity` - Email already exists
- `429 Too Many Requests` - Rate limit exceeded

---

### POST /api/auth/login

Authenticate with email and password.

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PARTICIPANT"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Email not verified or account deactivated
- `429 Too Many Requests` - Too many login attempts

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or expired refresh token

---

### POST /api/auth/request-reset

Request password reset email.

**Rate Limit:** 3 requests per hour per email

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

> **Security Note:** Always returns success to prevent email enumeration attacks.

---

### POST /api/auth/reset-password

Reset password with token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword456!"
}
```

**Success Response (200):**
```json
{
  "message": "Password has been reset successfully."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid token or weak password
- `410 Gone` - Token expired

---

### POST /api/auth/verify-email

Verify email address with token.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Success Response (200):**
```json
{
  "message": "Email verified successfully."
}
```

**Error Responses:**
- `400 Bad Request` - Invalid token
- `410 Gone` - Token expired

---

## User Management Endpoints (`/api/users`)

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### GET /api/users/me

Get current user's profile.

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "PARTICIPANT",
  "phone": "+33612345678",
  "isActive": true,
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

### PUT /api/users/me

Update current user's profile.

**Request Body:**
```json
{
  "firstName": "Johnny",
  "lastName": "Doe",
  "phone": "+33698765432"
}
```

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "Johnny",
  "lastName": "Doe",
  "role": "PARTICIPANT",
  "phone": "+33698765432",
  "isActive": true,
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T11:00:00Z"
}
```

---

### PATCH /api/users/me/password

Change current user's password.

**Request Body:**
```json
{
  "currentPassword": "CurrentPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid current password or weak new password

---

### DELETE /api/users/me

Deactivate current user's account.

**Success Response (200):**
```json
{
  "message": "Account deactivated successfully"
}
```

> **Note:** This soft-deletes the account. Data is retained but account cannot be used.

---

## Admin Endpoints (`/api/users`)

Requires `ADMIN` role.

### GET /api/users

List users with pagination.

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 10, max: 100)
- `role` (optional, filter by role)

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "PARTICIPANT",
      "isActive": true
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### GET /api/users/:id

Get user by ID.

**Success Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "PARTICIPANT",
  "phone": "+33612345678",
  "isActive": true,
  "lastLoginAt": "2024-01-15T10:30:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Responses:**
- `404 Not Found` - User not found

---

## Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `PARTICIPANT` | Standard user | Register for events, manage own profile |
| `ORGANIZER` | Event organizer | Create/manage events, all participant permissions |
| `ADMIN` | Administrator | Full system access, user management |

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/register` | 3 | 1 hour |
| `/api/auth/login` | 5 | 15 minutes |
| `/api/auth/request-reset` | 3 | 1 hour |
| Other endpoints | 100 | 1 minute |

---

## Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## OpenAPI/Swagger

Interactive API documentation is available at:
- Development: `http://localhost:3000/api/docs`
- Production: `https://api.tickr.com/api/docs`
