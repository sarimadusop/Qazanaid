# Stockify - Inventory Management & Stock Opname

## Overview
A full-stack inventory management application for stock opname (stock counting/auditing). Built with Express + Vite + React + PostgreSQL + Drizzle ORM.

## Recent Changes
- **2026-02-11**: Switched to username/password auth (bcryptjs). Every registered user is admin (superuser). Admin can create sub-users (sku_manager, stock_counter) from Role Management page.
- **2026-02-11**: Team-based data isolation: admin creates sub-users, all team members see admin's data. Other admins can't see each other's data.
- **2026-02-11**: Edit Profile page (change name, username, password)
- **2026-02-11**: Inline edit product name and stock in Products table
- **2026-02-11**: Excel template download & bulk import for products (with validation: duplicate SKU, missing fields, error reporting)

## Architecture

### Backend
- **server/routes.ts** - API routes with authentication, role-based middleware, team-based data access via getTeamAdminId()
- **server/storage.ts** - Database CRUD operations via IStorage interface
- **server/replit_integrations/auth/routes.ts** - Username/password auth (register, login, logout, profile update, create sub-user)
- **server/replit_integrations/auth/storage.ts** - User CRUD operations
- **server/replit_integrations/auth/replitAuth.ts** - Session middleware (express-session + connect-pg-simple)
- **shared/schema.ts** - Drizzle ORM schema definitions + Zod validation
- **shared/models/auth.ts** - User & session table definitions
- **shared/routes.ts** - Typed API route definitions shared between frontend and backend

### Frontend (client/src/)
- **App.tsx** - Main app with auth-gated routing, login/register forms
- **pages/Dashboard.tsx** - Overview with stats, active sessions, low stock alerts
- **pages/Products.tsx** - Product catalog with search, category filter, photo upload, inline edit (name/stock)
- **pages/Sessions.tsx** - Stock opname session list with create dialog
- **pages/SessionDetail.tsx** - Individual session with inline stock counting, category filter, Excel export
- **pages/RoleManagement.tsx** - Admin-only: manage team users, create sub-users with role assignment
- **pages/Profile.tsx** - Edit profile (name, username, password)
- **components/Sidebar.tsx** - Navigation sidebar with user info and role display
- **hooks/use-auth.ts** - Authentication state hook (login, register, logout)
- **hooks/use-role.ts** - User role and permissions hook
- **hooks/use-products.ts** - Product CRUD hooks (including useUpdateProduct)
- **hooks/use-sessions.ts** - Session/record CRUD hooks

### Database Tables
- **users** - User accounts with username, password (hashed), adminId (null for admins, admin's ID for sub-users)
- **sessions** - Express session storage (connect-pg-simple)
- **user_roles** - Role assignments (admin, sku_manager, stock_counter)
- **products** - Inventory items with SKU, name, category, stock, photo. userId = adminId (team owner)
- **opname_sessions** - Stock counting audit sessions. userId = adminId (team owner)
- **opname_records** - Individual stock count entries per session/product

### Auth & Team System
- Every user who registers via the public form becomes an admin
- Admin can create sub-users (sku_manager, stock_counter) from Role Management
- Sub-users have adminId pointing to their creator admin
- Data access: getTeamAdminId() returns admin's own ID or sub-user's adminId
- Products and sessions are stored with userId = adminId, so all team members see same data
- Admin A cannot see Admin B's data

### Roles
- **admin** - Full access: products, sessions, user management
- **sku_manager** - Can manage products/SKUs only
- **stock_counter** - Can create sessions and count stock only

### Photo Upload
- Photos uploaded via multer to client/public/uploads/
- Naming: NamaProduk_TanggalInput.ext

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
- `npm run db:push` syncs schema to database
