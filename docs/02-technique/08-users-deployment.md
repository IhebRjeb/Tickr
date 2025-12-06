# Users Module Deployment Checklist

## Pre-Deployment Checklist

### Environment Variables

- [ ] `JWT_SECRET` - Strong 256+ bit secret (NOT default value)
- [ ] `JWT_ACCESS_EXPIRATION` - Set to 15m for production
- [ ] `JWT_REFRESH_EXPIRATION` - Set to 7d for production
- [ ] `BCRYPT_ROUNDS` - Set to 12 for production (10 for staging)
- [ ] `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` - Configured
- [ ] `NODE_ENV` - Set to 'production'

### Database

- [ ] PostgreSQL 14+ is running and accessible
- [ ] `users` schema exists
- [ ] All migrations have been run: `npm run migration:run`
- [ ] Indexes are created and verified
- [ ] Database user has appropriate permissions (not superuser)
- [ ] Connection pooling is configured
- [ ] SSL connection enabled for production

### Security

- [ ] JWT secret is unique per environment
- [ ] JWT secret is stored in secure secrets manager
- [ ] Rate limiting is configured and tested
- [ ] CORS origins are restricted to known domains
- [ ] HTTPS is enforced
- [ ] Security headers are configured (Helmet.js)
- [ ] Password policy meets requirements

### Monitoring

- [ ] Health check endpoint is working: `GET /api/health`
- [ ] Logging is configured (structured JSON logs)
- [ ] Error tracking service connected (e.g., Sentry)
- [ ] Performance monitoring enabled
- [ ] Audit logging enabled for security events

---

## Deployment Steps

### 1. Pre-Deployment

```bash
# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Run architecture tests
npm run test:arch

# Build application
npm run build

# Lint and format check
npm run lint:check
```

### 2. Database Migration

```bash
# Verify pending migrations
npm run typeorm -- migration:show

# Run migrations (in deployment script)
npm run migration:run

# Verify migration success
npm run typeorm -- migration:show
```

### 3. Environment Configuration

```bash
# Verify environment variables are set
echo $JWT_SECRET        # Should not be empty
echo $NODE_ENV          # Should be 'production'
echo $BCRYPT_ROUNDS     # Should be 12 or higher

# Test database connection
npm run typeorm -- query "SELECT 1"
```

### 4. Application Deployment

```bash
# Using Docker
docker build -t tickr-backend:latest .
docker run -d \
  --env-file .env.production \
  -p 3000:3000 \
  tickr-backend:latest

# Or using Node.js directly
NODE_ENV=production node dist/main.js
```

### 5. Post-Deployment Verification

```bash
# Health check
curl -f http://localhost:3000/api/health

# Test registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"Test","lastName":"User"}'

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

---

## Rollback Plan

### If Migration Fails

```bash
# Revert last migration
npm run migration:revert

# Restore from backup if needed
pg_restore -d tickr users_backup.sql
```

### If Application Fails

```bash
# Docker rollback
docker stop tickr-backend
docker run -d tickr-backend:previous-version

# Kubernetes rollback
kubectl rollout undo deployment/tickr-backend
```

---

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor error rates
- [ ] Check login success rate
- [ ] Verify no rate limiting false positives
- [ ] Review slow queries
- [ ] Check memory and CPU usage
- [ ] Monitor database connections

### First Week

- [ ] Analyze user registration patterns
- [ ] Review security audit logs
- [ ] Check for unusual login attempts
- [ ] Validate email verification flow
- [ ] Monitor password reset usage

---

## Scaling Considerations

### Horizontal Scaling

```yaml
# Kubernetes HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tickr-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tickr-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Database Read Replicas

```env
# Use read replica for queries
DB_READ_HOST=read-replica.example.com
```

### Caching Layer

```env
# Redis configuration
REDIS_HOST=redis.example.com
REDIS_PORT=6379
CACHE_TTL=300
```

---

## Disaster Recovery

### Backup Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full backup | Daily | 30 days |
| WAL archive | Continuous | 7 days |
| Point-in-time | On-demand | 24 hours |

### Recovery Time Objectives

| Scenario | RTO | RPO |
|----------|-----|-----|
| Pod restart | 30s | 0 |
| Node failure | 5m | 0 |
| Database restore | 1h | 15m |
| Full disaster | 4h | 1h |

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| JWT validation fails | Wrong secret | Verify JWT_SECRET matches |
| Login always fails | Password hash issue | Check BCRYPT_ROUNDS |
| Rate limit too aggressive | Wrong config | Adjust throttler settings |
| Database connection refused | Network/firewall | Check security groups |
| Migrations fail | Lock issue | Check for stuck transactions |

### Diagnostic Commands

```bash
# Check application logs
docker logs tickr-backend --tail 100

# Check database connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'tickr';

# Check rate limit status
# (via application metrics endpoint)
curl http://localhost:3000/metrics | grep throttle
```

---

## Contact & Escalation

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 - General issues | DevOps on-call | 15 min |
| L2 - Security issues | Security team | Immediate |
| L3 - Data issues | DBA team | 30 min |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Development Lead | | | |
| QA Lead | | | |
| DevOps Lead | | | |
| Security Lead | | | |
