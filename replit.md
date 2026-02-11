# Stockify - Inventory Management & Stock Opname

## Overview
A full-stack inventory management application for stock opname (stock counting/auditing). Built with Express + Vite + React + PostgreSQL + Drizzle ORM.

## Recent Changes
- **2026-02-11**: Added Replit Auth login, role-based access control (admin, sku_manager, stock_counter), user-scoped data, photo upload for products, category filtering on products and session detail pages
- **2026-02-11**: User roles page for admin to manage user access levels

## Architecture

### Backend
- **server/routes.ts** - API routes with authentication and role-based middleware
- **server/storage.ts** - Database CRUD operations via IStorage interface
- **server/replit_integrations/auth.ts** - Replit Auth integration (OIDC)
- **shared/schema.ts** - Drizzle ORM schema definitions + Zod validation
- **shared/routes.ts** - Typed API route definitions shared between frontend and backend

### Frontend (client/src/)
- **App.tsx** - Main app with auth-gated routing
- **pages/Dashboard.tsx** - Overview with stats, active sessions, low stock alerts
- **pages/Products.tsx** - Product catalog with search, category filter, photo upload
- **pages/Sessions.tsx** - Stock opname session list with create dialog
- **pages/SessionDetail.tsx** - Individual session with inline stock counting, category filter, Excel export
- **pages/RoleManagement.tsx** - Admin-only user role management
- **hooks/use-auth.ts** - Authentication state hook
- **hooks/use-role.ts** - User role and permissions hook
- **hooks/use-products.ts** - Product CRUD hooks
- **hooks/use-sessions.ts** - Session/record CRUD hooks

### Database Tables
- **users** - Replit Auth user storage
- **sessions** - Express session storage
- **user_roles** - Role assignments (admin, sku_manager, stock_counter)
- **products** - Inventory items with SKU, name, category, stock, photo
- **opname_sessions** - Stock counting audit sessions
- **opname_records** - Individual stock count entries per session/product

### Roles
- **admin** - Full access to everything
- **sku_manager** - Can manage products/SKUs only
- **stock_counter** - Can create sessions and count stock only

### Photo Upload
- Photos uploaded via multer to client/public/uploads/
- Naming: NamaProduk_TanggalInput.ext

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
- `npm run db:push` syncs schema to database
