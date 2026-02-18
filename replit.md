# Stockify - Inventory Management & Stock Opname

## Overview
A full-stack inventory management application for stock opname (stock counting/auditing). Built with Express + Vite + React + PostgreSQL + Drizzle ORM. Supports location-based access control (Toko/Gudang), multi-photo with compression, hierarchical units, staff management, announcements, feedback, and motivation messages.

## Recent Changes
- **2026-02-18**: Batch photo upload with in-app camera (WebRTC) - kamera langsung terbuka di dalam app, bisa foto berkali-kali, preview semua foto, hapus yang tidak diinginkan, upload semua sekaligus. Diterapkan di Products dan SessionDetail.
- **2026-02-18**: Fixed logout to reliably redirect to login screen via page reload
- **2026-02-13**: Announcements with image support - admin can upload images to announcements, displayed prominently at top of Dashboard as banners with big header text and images, also shown in popup dialog
- **2026-02-13**: Announcement popup - active announcements show as popup dialog when user opens the app
- **2026-02-13**: Selective ZIP download dialog (filter by product or date) using POST endpoint
- **2026-02-13**: Bulk delete products (checkbox selection, select all, confirm dialog)
- **2026-02-13**: Category priority ordering per-user (all users including stock counter can set their own order, falls back to admin's order)
- **2026-02-12**: Added location-based access (Toko/Gudang) for products and sessions
- **2026-02-12**: New roles: stock_counter_toko (only toko), stock_counter_gudang (only gudang)
- **2026-02-12**: Multi-photo support per product and per opname record with client-side compression
- **2026-02-12**: Unit hierarchy (unit beranak) for gudang products (e.g., 1 Dus = 24 Pack)
- **2026-02-12**: Staff Management page - manage SO staff with location assignment
- **2026-02-12**: "Siapa yang Stock Opname?" dialog with staff selection and motivation messages
- **2026-02-12**: Announcements page (admin-only), displayed on Dashboard
- **2026-02-12**: Kritik & Saran (Feedback) page for all users
- **2026-02-12**: Motivation Messages page (admin-only) - customizable messages for SO dialog
- **2026-02-16**: Migrated photo storage from local /uploads to Replit Object Storage for permanent persistence across server restarts. Old /uploads URLs still served for backward compatibility.
- **2026-02-16**: Database migrated to Supabase - server/db.ts uses SUPABASE_DATABASE_URL as primary, falls back to DATABASE_URL. Schema synced via drizzle-kit push. All data (553 products, 1392 photos, 4406 opname records, 8 users) preserved.
- **2026-02-13**: Disabled auto-delete photos (was 7 days), photos now stored permanently
- **2026-02-12**: Photo compression before upload (max 1200px, 0.7 quality JPEG)
- **2026-02-11**: Switched to username/password auth (bcryptjs). Every registered user is admin (superuser). Admin can create sub-users from Role Management page.
- **2026-02-11**: Team-based data isolation: admin creates sub-users, all team members see admin's data.
- **2026-02-11**: Edit Profile, Inline edit products, Excel import/export, Lupa Password

## Architecture

### Backend
- **server/routes.ts** - API routes with authentication, role-based middleware, team-based data access, photo uploads, auto-cleanup
- **server/storage.ts** - Database CRUD operations via IStorage interface (products, sessions, photos, units, staff, announcements, feedback, motivation)
- **server/replit_integrations/auth/routes.ts** - Username/password auth (register, login, logout, profile update, create sub-user)
- **server/replit_integrations/auth/storage.ts** - User CRUD operations
- **server/replit_integrations/auth/replitAuth.ts** - Session middleware (express-session + connect-pg-simple)
- **shared/schema.ts** - Drizzle ORM schema definitions + Zod validation
- **shared/models/auth.ts** - User & session table definitions
- **shared/routes.ts** - Typed API route definitions shared between frontend and backend

### Frontend (client/src/)
- **App.tsx** - Main app with auth-gated routing, login/register forms
- **pages/Dashboard.tsx** - Overview with stats, active sessions, low stock alerts, announcements
- **pages/Products.tsx** - Product catalog with location tabs (Toko/Gudang), multi-photo gallery, unit management, search, category filter, inline edit
- **pages/Sessions.tsx** - Stock opname session list with location filtering, staff selection dialog, motivation messages
- **pages/SessionDetail.tsx** - Individual session with multi-photo per record, unit-based input for gudang, photo compression, category filter, Excel export
- **pages/RoleManagement.tsx** - Admin-only: manage team users, create sub-users with 5 role types
- **pages/StaffManagement.tsx** - Manage SO staff members with location assignment
- **pages/Announcements.tsx** - Admin creates/edits announcements for team
- **pages/FeedbackPage.tsx** - Kritik & Saran submission and viewing
- **pages/MotivationPage.tsx** - Admin manages motivation messages
- **pages/Profile.tsx** - Edit profile (name, username, password)
- **components/Sidebar.tsx** - Navigation sidebar with role-based menu items
- **hooks/use-auth.ts** - Authentication state hook
- **hooks/use-role.ts** - Role and permissions hook (canCountToko, canCountGudang, canCountLocation)
- **hooks/use-products.ts** - Product, photo, unit CRUD hooks
- **hooks/use-sessions.ts** - Session, record, record photo hooks
- **hooks/use-staff.ts** - Staff CRUD hooks
- **hooks/use-announcements.ts** - Announcement CRUD hooks
- **hooks/use-feedback.ts** - Feedback CRUD hooks
- **hooks/use-motivation.ts** - Motivation message CRUD hooks

### Database Tables
- **users** - User accounts with username, password (hashed), adminId
- **sessions** - Express session storage (connect-pg-simple)
- **user_roles** - Role assignments (admin, sku_manager, stock_counter, stock_counter_toko, stock_counter_gudang)
- **products** - Inventory items with SKU, name, category, stock, locationType (toko/gudang). userId = adminId
- **product_photos** - Multiple photos per product with URL and timestamp
- **product_units** - Unit hierarchy per product (unitName, conversionToBase, baseUnit, sortOrder)
- **opname_sessions** - Stock counting sessions with locationType, startedByName, assignedTo
- **opname_records** - Individual stock count entries per session/product, unitValues for gudang
- **opname_record_photos** - Multiple photos per opname record
- **staff_members** - SO staff with name and locationType
- **announcements** - Team announcements with title, content, expiresAt
- **feedback** - Kritik & Saran entries with type and content
- **motivation_messages** - Customizable motivation messages for SO dialog
- **category_priorities** - Admin-configurable category display ordering

### Auth & Team System
- Every user who registers via the public form becomes an admin
- Admin can create sub-users from Role Management
- Sub-users have adminId pointing to their creator admin
- Data access: getTeamAdminId() returns admin's own ID or sub-user's adminId
- Products, sessions, staff, announcements etc. stored with userId = adminId

### Roles
- **admin** - Full access: products, sessions, user management, announcements, motivation
- **sku_manager** - Can manage products/SKUs, staff. No sessions or role management
- **stock_counter** - Can create sessions and count stock for both Toko and Gudang
- **stock_counter_toko** - Can only stock opname for Toko location
- **stock_counter_gudang** - Can only stock opname for Gudang location

### Photo System
- Photos uploaded via multer, then saved to Replit Object Storage (permanent cloud storage)
- New photos stored at `/objects/uploads/<uuid>.<ext>` paths, served via Object Storage routes
- Legacy photos at `/uploads/` paths still served via express.static for backward compatibility
- Client-side compression: max 1200px width, 0.7 quality JPEG (compressImage utility in lib/utils.ts)
- Multi-photo support per product and per opname record
- Photos stored permanently (no auto-cleanup)

### Unit System (Gudang Products)
- Gudang products can have hierarchical units (unit beranak)
- Example: 1 Dus = 24 Pack, 1 Pack = 50 gr
- Units stored in product_units table with conversionToBase and baseUnit
- During stock opname, gudang products show unit input fields
- Total calculated from unit values and stored in unitValues JSON field

## User Preferences
- Indonesian language (Bahasa Indonesia) for all UI labels
- SelectContent dropdowns: always use className="bg-card border border-border"
- Photos stored in /uploads directory (not client/public)

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
- `npm run db:push` syncs schema to database
