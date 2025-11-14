# Admin Dashboard - React + Tailwind CSS v4

A complete, production-ready admin dashboard built with React, Vite, and Tailwind CSS v4 (Oxide engine).

## Features

- ✅ **Authentication System** - Login/logout with JWT token management
- ✅ **Protected Routes** - Access control for authenticated users
- ✅ **Responsive Layout** - Sidebar + Topbar layout with mobile support
- ✅ **Users Management** - Full CRUD operations for users
- ✅ **Events Management** - Full CRUD operations for events
- ✅ **Orders Management** - Ready for implementation
- ✅ **Dashboard Analytics** - Stats cards and activity feed
- ✅ **API Integration** - Axios client with interceptors
- ✅ **Global State** - Context API for authentication
- ✅ **Toast Notifications** - Success/error messages
- ✅ **Loading States** - Skeleton screens and spinners
- ✅ **Pagination** - Server-side pagination support
- ✅ **Search & Filters** - Advanced filtering capabilities
- ✅ **Modern UI** - Clean design with Tailwind CSS v4

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Dashboard will be available at `http://localhost:5173`

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### Demo Credentials

- Email: `admin@example.com`
- Password: `password123`

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── api/           # API integration
├── components/    # UI components
├── context/       # React Context
├── hooks/         # Custom hooks
├── pages/         # Page components
├── routes/        # Routing
└── utils/         # Utilities
```

## Backend API

Configure your backend API in `.env`. Expected endpoints:

- `POST /auth/login` - Authentication
- `GET /users` - Get users (with pagination)
- `POST /users` - Create user
- `GET /events` - Get events
- And more...

## Customization

Edit `src/index.css` to customize Tailwind theme colors and styles.

---

Built with React, Vite, and Tailwind CSS v4
