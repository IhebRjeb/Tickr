#!/bin/bash

# LocalStack initialization script
# Creates AWS resources for local development

set -e

echo "🚀 Initializing LocalStack resources..."

# Wait for LocalStack to be ready
until curl -s http://localhost:4566/_localstack/health | grep -q "running"; do
  echo "⏳ Waiting for LocalStack..."
  sleep 2
done

echo "✅ LocalStack is ready!"

# Create S3 bucket for event images
echo "📦 Creating S3 bucket: tickr-dev..."
awslocal s3 mb s3://tickr-dev || echo "Bucket already exists"
awslocal s3api put-bucket-cors --bucket tickr-dev --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }]
}'

# Create SES verified email
echo "📧 Setting up SES..."
awslocal ses verify-email-identity --email-address noreply@tickr.local
awslocal ses verify-email-identity --email-address support@tickr.local

# Create SNS topic for notifications
echo "📢 Creating SNS topic..."
awslocal sns create-topic --name tickr-notifications || echo "Topic already exists"

# Create Secrets Manager secrets
echo "🔐 Creating secrets..."
awslocal secretsmanager create-secret \
  --name tickr/jwt/secret \
  --secret-string "dev-super-secret-jwt-key" || echo "Secret already exists"

awslocal secretsmanager create-secret \
  --name tickr/db/password \
  --secret-string "postgres" || echo "Secret already exists"

echo "✅ LocalStack initialization complete!"
