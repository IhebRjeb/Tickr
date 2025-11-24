# Tickr Frontend

Plateforme de billetterie en ligne - Interface utilisateur moderne construite avec Next.js 16.

## 🛠️ Stack Technique

- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4
- **State Management**: 
  - React Query (TanStack Query) - Server state
  - Zustand - Client state
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Testing**: Vitest + Testing Library

## 🚀 Getting Started

### Prerequisites

- Node.js 20 LTS or higher
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001).

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (port 3001)
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Run TypeScript type checking

# Testing
npm run test             # Run unit tests with Vitest
npm run test:ui          # Run tests with UI
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── events/            # Events routes
│   ├── tickets/           # Tickets routes
│   ├── auth/              # Auth routes
│   └── dashboard/         # Dashboard routes
│
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── layout/           # Layout components
│
├── lib/                  # Utilities & configurations
│   ├── api/             # API client
│   ├── hooks/           # Custom React hooks
│   └── utils.ts         # Helper functions
│
└── types/               # TypeScript type definitions
```

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

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

## 🐳 Docker

### Development

```bash
docker build -f Dockerfile.dev -t tickr-frontend:dev .
docker run -p 3001:3001 -v $(pwd):/app tickr-frontend:dev
```

### Production

```bash
docker build -f Dockerfile -t tickr-frontend:prod .
docker run -p 3001:3001 tickr-frontend:prod
```

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

## 🤝 Contributing

Please read the main project README for contribution guidelines.

## 📄 License

This project is proprietary and confidential.

