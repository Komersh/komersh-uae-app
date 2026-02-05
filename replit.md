# Komersh - UAE E-Commerce Operations Hub

## Overview
Komersh is an internal UAE e-commerce operations web application for managing Amazon/website sales. It provides comprehensive financial tracking, inventory management, task management (Kanban board), and file management capabilities.

## Current State
The application is fully functional with:
- Dashboard with real-time stats, charts, and bank account balances
- Multi-currency support (USD, AED, EUR)
- Replit Auth integration with invitation-only access
- Product research and inventory management
- Sales tracking with profit calculation
- Expense tracking with filtering
- Kanban task board
- File upload and management

## Tech Stack
- **Frontend**: React + TypeScript + Vite + TanStack Query
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OIDC)
- **UI**: Shadcn/ui + Tailwind CSS + Recharts

## Project Structure
```
├── client/                    # Frontend application
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/             # React hooks (use-*.ts)
│   │   ├── pages/             # Page components
│   │   └── lib/               # Utilities
├── server/                    # Backend application
│   ├── index.ts               # Express server entry
│   ├── routes.ts              # API routes
│   └── storage.ts             # Database operations
├── shared/                    # Shared types and schemas
│   ├── schema.ts              # Drizzle database schema
│   └── routes.ts              # API route definitions
└── attached_assets/           # Static assets (logo)
```

## Database Schema
- **users**: User accounts with roles (admin, founder, marketing, warehouse, viewer)
- **invitations**: Invitation tokens for new users
- **potentialProducts**: Products under research
- **inventory**: Purchased product inventory with stock tracking
- **salesOrders**: Sales transactions with profit calculation
- **bankAccounts**: Bank accounts with balance tracking
- **expenses**: Business expenses with category and currency
- **tasks**: Kanban board tasks with status
- **attachments**: Uploaded files
- **activityLog**: User activity history

## Key Features

### Dashboard
- Revenue, profit, expense summary cards
- Additional stats: Total Sales Orders, Pending/Received Payouts, Units in Stock, Products Researching/Ready to Buy
- Bank account balances display
- Revenue vs Expenses chart
- Expense breakdown pie chart
- Activity log feed
- Currency toggle (USD/AED/EUR)

### Financials (/financials)
- Expense ledger with filters (category, paid by)
- Sales orders table with status management (pending/received)
- Sales order delete functionality (admin/founder only)
- Monthly expense bar chart
- Expense category pie chart
- Bank account management with deposit/withdraw
- Automatic bank balance update when sales order status changes to "received"

### Account (/account)
- Profile management (first name, last name, profile photo)
- Password change with current password verification

### Products (/products)
- Product Research tab: Add products for research, buy to add to inventory
- Inventory tab: Track stock levels, sell products
- Low stock alerts (threshold: <10 units)
- Multi-currency support

### Tasks (/tasks)
- Kanban board with drag-and-drop
- Columns: Open, Planned, In Progress, Done
- Due dates and timestamps
- Task assignment with user avatars displayed on cards
- Priority labels and task labels

### Files (/files)
- Upload files with folder organization
- Folders: General, Invoices, Products, Receipts
- Custom folder creation
- Folder rename and delete functionality (ALL folders including defaults)
- Filter by folder

### Products (/products)
- Product research and inventory management in one page
- **Excel and PDF export** for inventory stock data
- Multi-currency support

## API Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET/POST /api/potential-products` - Product research CRUD
- `POST /api/potential-products/:id/buy` - Purchase product to inventory
- `GET/PUT /api/inventory` - Inventory management
- `POST /api/inventory/:id/sell` - Sell inventory item
- `GET /api/sales-orders` - Sales order list
- `GET/POST /api/bank-accounts` - Bank account CRUD
- `POST /api/bank-accounts/:id/adjust` - Adjust balance
- `GET/POST/DELETE /api/expenses` - Expense management
- `GET/POST/PUT/DELETE /api/tasks` - Task management
- `GET/POST/DELETE /api/attachments` - File management
- `PUT/DELETE /api/folders/:folderName` - Folder rename/delete
- `GET /api/activity-log` - Activity history

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured)
- `SESSION_SECRET` - Session encryption key
- `ISSUER_URL` - OIDC issuer URL (Replit Auth)
- `REPLIT_DOMAINS` - Deployment domains

## Running the App
The app runs on port 5000 with `npm run dev` which starts both the Express backend and Vite frontend.

## Currency Conversion System
- Exchange rates (base USD): USD=1, AED=3.67, EUR=0.92
- Backend: All stats calculate totals in USD base, converting from each item's source currency
- Frontend: `convertCurrency(value, toCurrency, fromCurrency)` converts any amount to display currency
- Chart data (monthly revenue/expenses, pie charts) converts each item before aggregation
- Bank accounts display in native currencies; total balance converts to selected currency
- Product Research table shows original currency with proper symbols
- Inventory and Financials show converted values in selected display currency

## Recent Changes (Feb 5, 2026)
- Enhanced frontend pages with new hooks
- Added comprehensive dashboard with charts
- Implemented product research → inventory → sales flow
- Added bank account management with balance adjustment
- **Enhanced currency conversion** - All charts and stats now properly convert currencies from source to display currency
- Added file upload section with custom folder creation
- Multi-currency display across all pages
- Added expense filtering by category and paidBy
- Fixed theme consistency across all pages (light/dark mode support)
- Charts now use CSS variables for theme awareness
- All status badges and icons have proper light/dark variants
- Files page supports custom folder creation beyond defaults
- Enhanced file type icons for spreadsheets, videos, audio
- **Delete confirmation dialogs** added across all pages (Products, Tasks, Files, Financials)
- **User management** with role editing (admin/founder only) and deactivate/reactivate functionality
- Fixed form schema issues in Tasks and Financials pages (explicit z.object instead of extending insert schemas)
- Added authentication and authorization to user management routes
- **Notification system** with bell icon in header, task assignment notifications, read/unread status
- **Product research tracking** - "Added By" column shows which user added each product
- **Germany Bank account** added in EUR currency for European operations
- Fixed sell dialog field colors to use theme-aware classes
- Fixed apiRequest call signatures for user management operations
- **Mobile responsiveness** - Added sliding sidebar with hamburger menu for mobile devices
- **Inventory export** - Excel and PDF export for inventory stock data with formatted reports
- **Folder management** - All folders (including defaults) can now be renamed/deleted

## Theme System
- Light mode default with dark mode toggle
- Primary color: Purple/magenta (#B845D2) based on Komersh logo
- All pages use semantic tokens (text-foreground, bg-background, etc.)
- Color accents use explicit light/dark variants (e.g., text-green-700 dark:text-green-400)
- Charts use CSS variables for theme-aware styling
