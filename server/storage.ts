import { 
  potentialProducts, inventory, salesOrders, bankAccounts, expenses, tasks, attachments, activityLog,
  type PotentialProduct, type InsertPotentialProduct,
  type Inventory, type InsertInventory,
  type SalesOrder, type InsertSalesOrder,
  type BankAccount, type InsertBankAccount,
  type Expense, type InsertExpense,
  type Task, type InsertTask,
  type Attachment, type InsertAttachment,
  type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import { users, invitations, type User, type Invitation, type InsertInvitation } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Potential Products
  getPotentialProducts(): Promise<PotentialProduct[]>;
  getPotentialProduct(id: number): Promise<PotentialProduct | undefined>;
  createPotentialProduct(product: InsertPotentialProduct): Promise<PotentialProduct>;
  updatePotentialProduct(id: number, product: Partial<InsertPotentialProduct>): Promise<PotentialProduct>;
  deletePotentialProduct(id: number): Promise<void>;

  // Inventory
  getInventory(): Promise<Inventory[]>;
  getInventoryItem(id: number): Promise<Inventory | undefined>;
  createInventoryItem(item: InsertInventory): Promise<Inventory>;
  updateInventoryItem(id: number, item: Partial<InsertInventory>): Promise<Inventory>;

  // Sales Orders
  getSalesOrders(): Promise<SalesOrder[]>;
  createSalesOrder(order: InsertSalesOrder): Promise<SalesOrder>;
  updateSalesOrder(id: number, order: Partial<InsertSalesOrder>): Promise<SalesOrder>;

  // Bank Accounts
  getBankAccounts(): Promise<BankAccount[]>;
  getBankAccount(id: number): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, account: Partial<InsertBankAccount>): Promise<BankAccount>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<InsertExpense>): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Tasks
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Attachments
  getAttachments(): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  deleteAttachment(id: number): Promise<void>;

  // Activity Log
  getActivityLog(): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;

  // Users
  getUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<void>;
  
  // Invitations
  getInvitations(): Promise<Invitation[]>;
  createInvitation(invitation: InsertInvitation): Promise<Invitation>;
}

export class DatabaseStorage implements IStorage {
  // Potential Products
  async getPotentialProducts(): Promise<PotentialProduct[]> {
    return await db.select().from(potentialProducts).orderBy(desc(potentialProducts.createdAt));
  }

  async getPotentialProduct(id: number): Promise<PotentialProduct | undefined> {
    const [product] = await db.select().from(potentialProducts).where(eq(potentialProducts.id, id));
    return product;
  }

  async createPotentialProduct(product: InsertPotentialProduct): Promise<PotentialProduct> {
    const [newProduct] = await db.insert(potentialProducts).values(product).returning();
    return newProduct;
  }

  async updatePotentialProduct(id: number, updates: Partial<InsertPotentialProduct>): Promise<PotentialProduct> {
    const [updated] = await db.update(potentialProducts).set(updates).where(eq(potentialProducts.id, id)).returning();
    return updated;
  }

  async deletePotentialProduct(id: number): Promise<void> {
    await db.delete(potentialProducts).where(eq(potentialProducts.id, id));
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.createdAt));
  }

  async getInventoryItem(id: number): Promise<Inventory | undefined> {
    const [item] = await db.select().from(inventory).where(eq(inventory.id, id));
    return item;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [newItem] = await db.insert(inventory).values(item).returning();
    return newItem;
  }

  async updateInventoryItem(id: number, updates: Partial<InsertInventory>): Promise<Inventory> {
    const [updated] = await db.update(inventory).set(updates).where(eq(inventory.id, id)).returning();
    return updated;
  }

  // Sales Orders
  async getSalesOrders(): Promise<SalesOrder[]> {
    return await db.select().from(salesOrders).orderBy(desc(salesOrders.createdAt));
  }

  async createSalesOrder(order: InsertSalesOrder): Promise<SalesOrder> {
    const [newOrder] = await db.insert(salesOrders).values(order).returning();
    return newOrder;
  }

  async updateSalesOrder(id: number, updates: Partial<InsertSalesOrder>): Promise<SalesOrder> {
    const [updated] = await db.update(salesOrders).set(updates).where(eq(salesOrders.id, id)).returning();
    return updated;
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return await db.select().from(bankAccounts).orderBy(bankAccounts.name);
  }

  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account;
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const [newAccount] = await db.insert(bankAccounts).values(account).returning();
    return newAccount;
  }

  async updateBankAccount(id: number, updates: Partial<InsertBankAccount>): Promise<BankAccount> {
    const [updated] = await db.update(bankAccounts).set(updates).where(eq(bankAccounts.id, id)).returning();
    return updated;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense).returning();
    return newExpense;
  }

  async updateExpense(id: number, updates: Partial<InsertExpense>): Promise<Expense> {
    const [updated] = await db.update(expenses).set(updates).where(eq(expenses.id, id)).returning();
    return updated;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Attachments
  async getAttachments(): Promise<Attachment[]> {
    return await db.select().from(attachments).orderBy(desc(attachments.createdAt));
  }

  async createAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [newAttachment] = await db.insert(attachments).values(attachment).returning();
    return newAttachment;
  }

  async deleteAttachment(id: number): Promise<void> {
    await db.delete(attachments).where(eq(attachments.id, id));
  }

  // Activity Log
  async getActivityLog(): Promise<ActivityLog[]> {
    return await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(100);
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLog).values(log).returning();
    return newLog;
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, id));
  }

  // Invitations
  async getInvitations(): Promise<Invitation[]> {
    return await db.select().from(invitations).orderBy(desc(invitations.createdAt));
  }

  async createInvitation(invitation: InsertInvitation): Promise<Invitation> {
    const [newInvitation] = await db.insert(invitations).values(invitation).returning();
    return newInvitation;
  }
}

export const storage = new DatabaseStorage();
