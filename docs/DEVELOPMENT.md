# 🚀 Tickr - Modern Development Setup Guide

## Overview

This document describes the modern, scalable development environment for Tickr. Everything is orchestrated through **Make** commands and **Docker Compose** for a consistent, reproducible setup.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DEVELOPMENT STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Frontend  │  │ Backend  │  │PostgreSQL│  │  Redis   │  │
│  │Next.js 16│  │  NestJS  │  │  15.4    │  │   7.x    │  │
│  │Port: 3001│  │Port: 3000│  │Port: 5432│  │Port: 6379│  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ pgAdmin  │  │ Maildev  │  │LocalStack│                 │
│  │Port: 5050│  │Port: 1080│  │Port: 4566│                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start (30 seconds)

```bash
# 1. Clone repository
git clone https://github.com/IhebRjeb/Tickr.git
cd Tickr

# 2. Complete setup
make setup

# 3. Start development
make dev
```

**That's it!** 🎉

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API Docs: http://localhost:3000/api/docs

## Features

### ✅ Modern & Optimized

- **Docker Compose**: Multi-stage builds, layer caching
- **Hot Reload**: Instant feedback on code changes
- **Makefile**: Single source of truth for all commands
- **LocalStack**: AWS services running locally
- **Health Checks**: All services monitored
- **Volume Caching**: Fast rebuild times

### ✅ Developer Experience

- **One Command Setup**: `make setup` does everything
- **Colored Output**: Easy to read terminal feedback
- **Helpful Errors**: Clear error messages
- **Auto-Recovery**: Services restart on failure
- **Logs Aggregation**: `make logs` shows everything

### ✅ Production-Ready

- **Multi-Environment**: dev, staging, production configs
- **Resource Limits**: CPU/Memory constraints defined
- **Security**: No hardcoded secrets, env files ignored
- **Monitoring**: Prometheus + Grafana ready
- **Blue/Green Deploy**: Zero-downtime deployments

## Makefile Commands Reference

### 🚀 Quick Commands

```bash
make dev          # Start everything
make stop         # Stop everything
make restart      # Restart everything
make logs         # View logs
make help         # Show all commands
```

### 📦 Setup Commands

```bash
make setup              # Complete setup (one-time)
make install            # Install npm dependencies
make env                # Setup .env files
make check-prerequisites # Verify Docker, Node, etc.
```

### 🗄️ Database Commands

```bash
make db-create    # Create database
make db-migrate   # Run migrations
make db-seed      # Seed test data
make db-reset     # Reset everything (destructive!)
make db-studio    # Open pgAdmin
make shell-db     # psql shell
```

### 🧪 Testing Commands

```bash
make test         # All tests
make test-unit    # Unit tests only
make test-e2e     # E2E tests only
make test-watch   # Watch mode
make test-cov     # With coverage
```

### 🧹 Code Quality

```bash
make lint         # Lint everything
make lint-fix     # Auto-fix issues
make format       # Prettier format
make type-check   # TypeScript check
```

### 🐳 Docker Commands

```bash
make docker-build   # Build images
make docker-up      # Start containers
make docker-down    # Stop containers
make docker-clean   # Remove everything
make docker-prune   # Deep clean (all Docker)
```

### 🔧 Utilities

```bash
make status         # Service status
make health         # Health checks
make version        # Show versions
make info           # Project info
make clean          # Clean build artifacts
```

## Environment Files

### Backend (.env.local)

```bash
# Development
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tickr

# Redis
REDIS_URL=redis://:tickr123@localhost:6379

# JWT
JWT_SECRET=dev-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# AWS Local (LocalStack)
AWS_REGION=eu-west-1
AWS_ENDPOINT=http://localhost:4566
S3_BUCKET=tickr-dev

# Email (Maildev)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=noreply@tickr.local

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env.local)

```bash
# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TIMEOUT=30000

# App Configuration
NEXT_PUBLIC_APP_NAME=Tickr
NEXT_PUBLIC_APP_VERSION=1.0.0
NEXT_PUBLIC_APP_ENV=development

# Feature Flags
NEXT_PUBLIC_ENABLE_DEVTOOLS=true
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

## Docker Compose Files

### Base (docker-compose.yml)

Core services that run in all environments:
- PostgreSQL
- Redis
- pgAdmin
- Maildev
- LocalStack

### Development (docker-compose.dev.yml)

Development-specific services:
- Backend (hot-reload enabled)
- Frontend (Next.js HMR)
- Debug ports exposed
- Volume mounting for live code
- Verbose logging

### Production (docker-compose.prod.yml)

Production-optimized:
- Optimized builds
- Resource limits
- Prometheus monitoring
- Grafana dashboards
- Nginx reverse proxy
- SSL/HTTPS support

## GitHub Actions Workflows

### 🔄 CI Workflow (.github/workflows/ci.yml)

**Triggers**: Pull requests, feature branches

**Jobs**:
1. ✅ Lint & Format Check
2. ✅ Unit Tests (Backend + Frontend)
3. ✅ Integration Tests (Backend)
4. ✅ E2E Tests (Playwright)
5. ✅ Build Validation
6. ✅ Docker Build (cache only)
7. ✅ Security Scan (npm audit + Snyk)
8. ✅ Quality Gates

**Duration**: ~8-12 minutes

### 🚀 CD Staging (.github/workflows/cd-staging.yml)

**Triggers**: Push to `develop`

**Jobs**:
1. Run CI Pipeline
2. Build & Push to ECR
3. Deploy Backend to ECS
4. Deploy Frontend to ECS
5. Smoke Tests
6. Slack/Email Notifications

**Environment**: https://staging.tickr.tn
**Duration**: ~15-20 minutes

### 🎯 CD Production (.github/workflows/cd-production.yml)

**Triggers**: Push to `main`

**Jobs**:
1. Run CI Pipeline
2. Semantic Versioning & Changelog
3. Build, Sign & Push Images
4. ⏸️ Manual Approval Gate
5. Blue/Green Deployment (Backend)
6. Blue/Green Deployment (Frontend)
7. Production Tests
8. Create GitHub Release
9. Notifications

**Environment**: https://tickr.tn
**Duration**: ~25-30 minutes
**Rollback**: One-click via GitHub Actions

## Best Practices

### Development Workflow

```bash
# 1. Start your day
git checkout develop
git pull
make restart

# 2. Create feature branch
git checkout -b feature/awesome-feature

# 3. Code with hot-reload
# Edit files, changes appear instantly

# 4. Run tests frequently
make test-watch

# 5. Before committing
make lint-fix
make test
make type-check

# 6. Commit and push
git add .
git commit -m "feat: add awesome feature"
git push origin feature/awesome-feature

# 7. Create PR
# CI runs automatically

# 8. After merge to develop
# CD deploys to staging automatically
```

### Database Workflow

```bash
# Create migration
cd backend
npm run migration:create AddUserTable

# Edit migration in backend/migrations/

# Run migration
make db-migrate

# If issues, reset
make db-reset
```

### Debugging

```bash
# View all logs
make logs

# View specific service
make logs-backend
make logs-frontend

# Shell into container
make shell-backend
make shell-db

# Check service health
make health
make status

# Debug backend with Node inspector
# Backend exposes port 9229 for debugging
# Connect VSCode debugger to localhost:9229
```

## Performance Optimization

### Docker Build Cache

- Multi-stage builds minimize image size
- Layer caching speeds up rebuilds
- GitHub Actions cache for CI/CD
- npm dependencies cached in volumes

### Hot Reload

- **Backend**: Nodemon watches for changes
- **Frontend**: Vite HMR (<100ms updates)
- **Database**: Migrations auto-run in watch mode

### Resource Limits

```yaml
Production limits:
  Backend:  1 CPU, 1GB RAM
  Frontend: 0.5 CPU, 256MB RAM
  
Development: Unlimited (for best DX)
```

## Monitoring

### Local Development

- **pgAdmin**: http://localhost:5050
- **Maildev**: http://localhost:1080
- **Health Check**: http://localhost:3000/health

### Production

- **Prometheus**: Metrics collection
- **Grafana**: Dashboards
- **CloudWatch**: AWS metrics
- **X-Ray**: Distributed tracing

## Troubleshooting

### Services won't start

```bash
# Check prerequisites
make check-prerequisites

# Clean everything
make docker-prune
make clean

# Fresh start
make setup
make dev
```

### Database connection issues

```bash
# Check if postgres is running
docker ps | grep postgres

# Check logs
make logs-db

# Reset database
make db-reset
```

### Port conflicts

```bash
# Check what's using ports
lsof -i :5173  # Frontend
lsof -i :3000  # Backend
lsof -i :5432  # Postgres

# Kill process
kill -9 <PID>
```

### Out of disk space

```bash
# Clean Docker
make docker-prune

# This removes:
# - Stopped containers
# - Unused images
# - Unused volumes
# - Build cache
```

## Next Steps

1. ✅ Read documentation in `/docs`
2. ✅ Explore API docs at http://localhost:3000/api/docs
3. ✅ Check out example tests in `/backend/test` and `/frontend/test`
4. ✅ Review code style in `.eslintrc` and `.prettierrc`
5. ✅ Join the team chat (Slack/Discord)

## Resources

- **Documentation**: [docs/README.md](../docs/README.md)
- **Architecture**: [docs/03-architecture/](../docs/03-architecture/)
- **API Contract**: [docs/02-technique/02-api-contract.md](../docs/02-technique/02-api-contract.md)
- **GitHub**: https://github.com/IhebRjeb/Tickr

---

**Questions?** Open an issue or contact the team!

🚀 Happy coding!
