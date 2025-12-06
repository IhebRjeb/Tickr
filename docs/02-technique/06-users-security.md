# Users Module Security Documentation

## Overview

This document describes the security measures implemented in the Users module, including authentication, authorization, password policies, and protection against common attacks.

---

## Authentication

### JWT (JSON Web Tokens)

The module uses JWT for stateless authentication with a dual-token approach:

#### Token Types

| Token Type | Expiration | Purpose |
|------------|------------|---------|
| Access Token | 15 minutes | API authentication |
| Refresh Token | 7 days | Obtain new access tokens |

#### Token Structure

```typescript
// Access Token Payload
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "PARTICIPANT",
  "iat": 1704067200,
  "exp": 1704068100
}

// Refresh Token Payload
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1704067200,
  "exp": 1704672000
}
```

#### Configuration

```env
# Environment Variables
JWT_SECRET=your-256-bit-secret-key-minimum-32-characters
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
```

> ⚠️ **Security Note:** Always use a strong, randomly generated secret with at least 256 bits of entropy.

---

## Password Security

### Password Policy

Passwords must meet the following requirements:

| Requirement | Minimum |
|-------------|---------|
| Length | 8 characters |
| Uppercase letters | 1 |
| Lowercase letters | 1 |
| Numbers | 1 |
| Special characters | 1 (!@#$%^&*) |

### Password Hashing

Passwords are hashed using **bcrypt** with configurable cost factor:

```typescript
// Configuration
BCRYPT_ROUNDS=10  // 2^10 = 1024 iterations

// Hashing process
const hash = await bcrypt.hash(password, saltRounds);
// Result: $2b$10$N9qo8uLOickgx2ZMRZoMy...
```

#### Bcrypt Cost Factor Recommendations

| Environment | Rounds | Approximate Time |
|-------------|--------|------------------|
| Development | 10 | ~100ms |
| Production | 12 | ~400ms |
| High Security | 14 | ~1.5s |

### Password Change Flow

```
1. User submits current password + new password
2. Verify current password against stored hash
3. Validate new password meets policy
4. Hash new password with fresh salt
5. Update database
6. Invalidate all existing sessions (optional)
7. Publish PasswordChangedEvent
```

---

## Rate Limiting

### ThrottlerModule Configuration

```typescript
ThrottlerModule.forRoot([
  {
    name: 'short',
    ttl: 1000,    // 1 second
    limit: 3,     // 3 requests
  },
  {
    name: 'medium',
    ttl: 10000,   // 10 seconds
    limit: 20,    // 20 requests
  },
  {
    name: 'long',
    ttl: 60000,   // 1 minute
    limit: 100,   // 100 requests
  },
]),
```

### Endpoint-Specific Limits

| Endpoint | Limit | Window | Reason |
|----------|-------|--------|--------|
| `/auth/register` | 3 | 1 hour | Prevent mass account creation |
| `/auth/login` | 5 | 15 min | Prevent brute force attacks |
| `/auth/request-reset` | 3 | 1 hour | Prevent email spam |
| Other endpoints | 100 | 1 min | General protection |

---

## Authorization (RBAC)

### Role Hierarchy

```
ADMIN
  └── ORGANIZER
        └── PARTICIPANT
```

### Role Definitions

```typescript
export enum UserRole {
  PARTICIPANT = 'PARTICIPANT',
  ORGANIZER = 'ORGANIZER',
  ADMIN = 'ADMIN',
}
```

### Guard Implementation

```typescript
// Protecting routes with roles
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin/users')
async getAllUsers() { ... }

// Multiple roles allowed
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('events/manage')
async manageEvents() { ... }
```

### Email Verification Guard

```typescript
// Require verified email for sensitive operations
@RequireEmailVerified()
@UseGuards(JwtAuthGuard, EmailVerifiedGuard)
@Post('purchases')
async makePurchase() { ... }
```

---

## Security Headers

Recommended headers for the API:

```typescript
// Applied via Helmet middleware
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'"
}
```

---

## Attack Mitigation

### Brute Force Prevention

1. **Rate limiting** on login endpoints
2. **Account lockout** after 5 failed attempts (30 min)
3. **Progressive delays** on repeated failures
4. **CAPTCHA** integration option for suspicious IPs

### SQL Injection

1. **Parameterized queries** via TypeORM
2. **Input validation** with class-validator
3. **No raw SQL** in application code

### Cross-Site Scripting (XSS)

1. **Output encoding** in all responses
2. **Content-Type headers** set correctly
3. **No user input** in error messages

### Email Enumeration

1. **Consistent responses** for password reset
2. **Same timing** for existing/non-existing emails
3. **Generic messages**: "If an account exists..."

### Session Management

1. **Stateless JWT** (no server-side sessions)
2. **Short-lived access tokens** (15 min)
3. **Refresh token rotation** on use
4. **Secure token storage** guidelines

---

## Sensitive Data Handling

### Data Classification

| Field | Classification | Storage | Transmission |
|-------|---------------|---------|--------------|
| Password | Critical | Hashed (bcrypt) | HTTPS only |
| Email | PII | Encrypted at rest | HTTPS only |
| Phone | PII | Encrypted at rest | HTTPS only |
| JWT Secret | Critical | Environment var | Never |

### Response Sanitization

```typescript
// Never return sensitive fields in API responses
{
  "id": "...",
  "email": "...",
  "firstName": "...",
  "lastName": "...",
  "role": "...",
  // NO: passwordHash, refreshToken, internalId
}
```

---

## Audit Logging

### Events Logged

| Event | Data Captured |
|-------|---------------|
| Login Success | userId, IP, timestamp |
| Login Failure | email, IP, timestamp, reason |
| Password Change | userId, IP, timestamp |
| Password Reset Request | email, IP, timestamp |
| Account Deactivation | userId, adminId, timestamp |
| Role Change | userId, oldRole, newRole, adminId |

### Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "event": "LOGIN_SUCCESS",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "context": {
    "method": "POST",
    "path": "/api/auth/login"
  }
}
```

---

## Security Checklist

### Before Deployment

- [ ] JWT secret is strong (256+ bits)
- [ ] HTTPS is enforced
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Environment variables secured
- [ ] bcrypt rounds set appropriately
- [ ] Audit logging enabled

### Regular Maintenance

- [ ] Rotate JWT secrets periodically
- [ ] Review failed login attempts
- [ ] Update dependencies for security patches
- [ ] Audit permission changes
- [ ] Review rate limit effectiveness

---

## Incident Response

### Suspected Breach

1. **Immediately**: Rotate JWT secret
2. **Force**: All users to re-authenticate
3. **Review**: Audit logs for suspicious activity
4. **Notify**: Affected users if data exposed
5. **Document**: Incident for post-mortem

### Suspicious Activity

1. **Monitor**: Unusual login patterns
2. **Alert**: On multiple failed attempts
3. **Block**: IPs with excessive failures
4. **Notify**: Users of login from new location
