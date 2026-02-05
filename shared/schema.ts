export * from "./models/auth";
import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Currency types
export const CURRENCIES = ["USD", "AED", "EUR"] as const;
export type Currency = typeof CURRENCIES[number];

// Exchange rates (base: USD)
export const EXCHANGE_RATES = {
  USD: 1,
  AED: 3.67,
  EUR: 0.92
} as const;

// === POTENTIAL PRODUCTS (Research List) ===
export const potentialProducts = pgTable("potential_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  supplierLink: text("supplier_link"),
  supplierName: text("supplier_name"),
  imageUrl: text("image_url"),
  variations: text("variations"),
  costPerUnit: numeric("cost_per_unit").notNull(),
  currency: text("currency").notNull().default("USD"),
  suggestedQuantity: integer("suggested_quantity").default(1),
  estimatedShipping: numeric("estimated_shipping").default("0"),
  targetSellingPrice: numeric("target_selling_price"),
  marketplace: text("marketplace"), // Amazon UAE, Noon, Komersh.ae
  notes: text("notes"),
  buyRating: integer("buy_rating").default(3), // 1-5
  status: text("status").notNull().default("researching"), // researching, ready_to_buy, rejected, bought
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPotentialProductSchema = createInsertSchema(potentialProducts).omit({ id: true, createdAt: true });
export type PotentialProduct = typeof potentialProducts.$inferSelect;
export type InsertPotentialProduct = z.infer<typeof insertPotentialProductSchema>;

// === INVENTORY (Purchased Products) ===
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  potentialProductId: integer("potential_product_id"),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  quantity: integer("quantity").notNull().default(0),
  quantityAvailable: integer("quantity_available").notNull().default(0),
  unitCost: numeric("unit_cost").notNull(),
  totalCost: numeric("total_cost").notNull(),
  currency: text("currency").notNull().default("USD"),
  purchaseDate: date("purchase_date"),
  status: text("status").notNull().default("ordered"), // ordered, shipped, in_transit, arrived, in_warehouse, listed, sold_out
  warehouseLocation: text("warehouse_location"),
  supplierOrderId: text("supplier_order_id"),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, createdAt: true });
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

// === SALES ORDERS ===
export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  inventoryId: integer("inventory_id").notNull(),
  channel: text("channel").notNull(), // Amazon UAE, Noon, Komersh.ae, Other
  quantitySold: integer("quantity_sold").notNull(),
  sellingPricePerUnit: numeric("selling_price_per_unit").notNull(),
  totalRevenue: numeric("total_revenue").notNull(),
  marketplaceFees: numeric("marketplace_fees").default("0"),
  shippingCost: numeric("shipping_cost").default("0"),
  netRevenue: numeric("net_revenue").notNull(),
  cogs: numeric("cogs").notNull(), // Cost of goods sold
  profit: numeric("profit").notNull(),
  currency: text("currency").notNull().default("USD"),
  saleDate: date("sale_date").notNull(),
  payoutStatus: text("payout_status").default("pending"), // pending, received
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({ id: true, createdAt: true });
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;

// === BANK ACCOUNTS ===
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // UAE Bank, Germany Bank, Cash, Amazon Payouts, Noon Payouts
  type: text("type").notNull().default("bank"), // bank, cash, payout_pending
  balance: numeric("balance").notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({ id: true, createdAt: true });
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

// === EXPENSES (Enhanced) ===
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // Subscription, Marketing, Shipping, Warehouse, Tools, Misc
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  description: text("description"),
  date: date("date").notNull(),
  paidBy: text("paid_by"), // Germany, UAE, Company, Person A, Person B
  paymentMethod: text("payment_method"), // Bank, Cash, Card
  bankAccountId: integer("bank_account_id"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// === TASKS (Enhanced Kanban) ===
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"), // open, planned, in_progress, done
  assigneeId: varchar("assignee_id"),
  dueDate: timestamp("due_date"),
  priority: text("priority").default("medium"), // low, medium, high
  labels: text("labels"), // Marketing, Ops, Finance, Product (comma separated)
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// === FILE ATTACHMENTS ===
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type"),
  size: integer("size"),
  url: text("url").notNull(),
  folder: text("folder").default("general"), // general, invoices, products, etc.
  uploadedBy: varchar("uploaded_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, createdAt: true });
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// === ACTIVITY LOG ===
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  action: text("action").notNull(), // created, updated, deleted, bought, sold, status_changed
  entityType: text("entity_type").notNull(), // product, expense, task, sale, inventory
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Keep old products table for backward compatibility but mark as deprecated
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  link: text("link"),
  imageUrl: text("image_url"),
  priceAed: numeric("price_aed").notNull(),
  shippingCost: numeric("shipping_cost").default("0"),
  quantity: integer("quantity").default(1),
  status: text("status").notNull().default("planned"),
  purchaseDate: date("purchase_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
