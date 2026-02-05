import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { EXCHANGE_RATES } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Authentication
  await setupAuth(app);
  registerAuthRoutes(app);

  // === POTENTIAL PRODUCTS ===
  app.get(api.potentialProducts.list.path, async (req, res) => {
    const products = await storage.getPotentialProducts();
    res.json(products);
  });

  app.post(api.potentialProducts.create.path, async (req: any, res) => {
    try {
      const input = api.potentialProducts.create.input.parse(req.body);
      const userId = req.user?.claims?.sub || null;
      const product = await storage.createPotentialProduct({
        ...input,
        createdByUserId: userId,
      });
      await storage.createActivityLog({
        action: 'created',
        entityType: 'potential_product',
        entityId: product.id,
        userId,
        details: `Added potential product: ${product.name}`,
      });
      res.status(201).json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.potentialProducts.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.potentialProducts.update.input.parse(req.body);
      const product = await storage.updatePotentialProduct(id, input);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.potentialProducts.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deletePotentialProduct(id);
    res.status(204).send();
  });

  // Upload image for potential product
  app.post('/api/potential-products/:id/image', upload.single('image'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const product = await storage.updatePotentialProduct(id, { imageUrl });
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Buy a potential product -> moves to inventory
  app.post(api.potentialProducts.buy.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.potentialProducts.buy.input.parse(req.body);
      
      const potentialProduct = await storage.getPotentialProduct(id);
      if (!potentialProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      const totalCost = (parseFloat(input.unitCost) * input.quantity + parseFloat(input.shippingCost || "0")).toFixed(2);

      const inventoryItem = await storage.createInventoryItem({
        potentialProductId: id,
        name: potentialProduct.name,
        imageUrl: potentialProduct.imageUrl,
        quantity: input.quantity,
        quantityAvailable: input.quantity,
        unitCost: input.unitCost,
        totalCost,
        currency: potentialProduct.currency || "USD",
        purchaseDate: input.purchaseDate,
        supplierOrderId: input.supplierOrderId,
        status: "ordered",
      });

      // Update potential product status to bought
      await storage.updatePotentialProduct(id, { status: "bought" });

      await storage.createActivityLog({
        action: 'bought',
        entityType: 'inventory',
        entityId: inventoryItem.id,
        details: `Bought ${input.quantity}x ${potentialProduct.name} for ${totalCost} ${potentialProduct.currency}`,
      });

      res.status(201).json(inventoryItem);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === INVENTORY ===
  app.get(api.inventory.list.path, async (req, res) => {
    const items = await storage.getInventory();
    res.json(items);
  });

  app.put(api.inventory.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.inventory.update.input.parse(req.body);
      const item = await storage.updateInventoryItem(id, input);
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Upload image for inventory item
  app.post('/api/inventory/:id/image', upload.single('image'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      const item = await storage.updateInventoryItem(id, { imageUrl });
      if (!item) {
        return res.status(404).json({ message: "Inventory item not found" });
      }
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Sell inventory item -> creates sales order
  app.post(api.inventory.sell.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.inventory.sell.input.parse(req.body);
      
      const inventoryItem = await storage.getInventoryItem(id);
      if (!inventoryItem) {
        return res.status(404).json({ message: "Inventory item not found" });
      }

      if (input.quantitySold > (inventoryItem.quantityAvailable || 0)) {
        return res.status(400).json({ message: "Cannot sell more than available quantity" });
      }

      const sellingPrice = parseFloat(input.sellingPricePerUnit);
      const fees = parseFloat(input.marketplaceFees || "0");
      const shipping = parseFloat(input.shippingCost || "0");
      const totalRevenue = sellingPrice * input.quantitySold;
      const netRevenue = totalRevenue - fees - shipping;
      const cogs = parseFloat(inventoryItem.unitCost) * input.quantitySold;
      const profit = netRevenue - cogs;

      const salesOrder = await storage.createSalesOrder({
        inventoryId: id,
        channel: input.channel,
        quantitySold: input.quantitySold,
        sellingPricePerUnit: input.sellingPricePerUnit,
        totalRevenue: totalRevenue.toFixed(2),
        marketplaceFees: input.marketplaceFees || "0",
        shippingCost: input.shippingCost || "0",
        netRevenue: netRevenue.toFixed(2),
        cogs: cogs.toFixed(2),
        profit: profit.toFixed(2),
        currency: inventoryItem.currency || "USD",
        saleDate: input.saleDate,
        notes: input.notes,
      });

      // Update inventory quantity
      const newQuantity = (inventoryItem.quantityAvailable || 0) - input.quantitySold;
      await storage.updateInventoryItem(id, {
        quantityAvailable: newQuantity,
        status: newQuantity === 0 ? "sold_out" : inventoryItem.status,
      });

      await storage.createActivityLog({
        action: 'sold',
        entityType: 'sales_order',
        entityId: salesOrder.id,
        details: `Sold ${input.quantitySold}x ${inventoryItem.name} on ${input.channel} for ${totalRevenue.toFixed(2)} (profit: ${profit.toFixed(2)})`,
      });

      res.status(201).json(salesOrder);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.inventory.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const item = await storage.getInventoryItem(id);
    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    await storage.deleteInventoryItem(id);
    res.status(204).send();
  });

  // === SALES ORDERS ===
  app.get(api.salesOrders.list.path, async (req, res) => {
    const orders = await storage.getSalesOrders();
    res.json(orders);
  });

  app.put(api.salesOrders.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.salesOrders.update.input.parse(req.body);
      
      const existingOrder = await storage.getSalesOrder(id);
      if (!existingOrder) {
        return res.status(404).json({ message: "Sales order not found" });
      }
      
      const order = await storage.updateSalesOrder(id, input);
      if (!order) {
        return res.status(404).json({ message: "Sales order not found" });
      }
      
      if (input.payoutStatus === 'received' && existingOrder.payoutStatus === 'pending') {
        const netRevenue = parseFloat(existingOrder.netRevenue);
        let payoutAccountName = 'Amazon Payouts';
        if (existingOrder.channel?.toLowerCase().includes('noon')) {
          payoutAccountName = 'Noon Payouts';
        }
        
        const bankAccounts = await storage.getBankAccounts();
        const payoutAccount = bankAccounts.find(a => a.name === payoutAccountName);
        
        if (payoutAccount) {
          const currentBalance = parseFloat(payoutAccount.balance);
          await storage.updateBankAccount(payoutAccount.id, {
            balance: (currentBalance + netRevenue).toFixed(2),
          });
          
          await storage.createBankTransaction({
            bankAccountId: payoutAccount.id,
            type: 'sale_payout',
            amount: netRevenue.toFixed(2),
            currency: existingOrder.currency || 'USD',
            description: `Payout received for sale #${id}`,
            relatedEntityType: 'sales_order',
            relatedEntityId: id,
          });
          
          await storage.createActivityLog({
            action: 'payout_received',
            entityType: 'sales_order',
            entityId: id,
            details: `Payout received: ${netRevenue.toFixed(2)} ${existingOrder.currency || 'USD'} for sale on ${existingOrder.channel}`,
          });
        }
      }
      
      res.json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.salesOrders.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUsers().then(users => users.find(u => u.id === currentUserId));
      if (!currentUser || !['admin', 'founder'].includes(currentUser.role || '')) {
        return res.status(403).json({ message: "Only admins and founders can delete sales orders" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteSalesOrder(id);
      res.status(204).send();
    } catch (err) {
      throw err;
    }
  });

  // === BANK ACCOUNTS ===
  app.get(api.bankAccounts.list.path, async (req, res) => {
    const accounts = await storage.getBankAccounts();
    res.json(accounts);
  });

  app.post(api.bankAccounts.create.path, async (req, res) => {
    try {
      const input = api.bankAccounts.create.input.parse(req.body);
      const account = await storage.createBankAccount(input);
      res.status(201).json(account);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.bankAccounts.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.bankAccounts.update.input.parse(req.body);
      const account = await storage.updateBankAccount(id, input);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      res.json(account);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.bankAccounts.adjustBalance.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.bankAccounts.adjustBalance.input.parse(req.body);
      
      const account = await storage.getBankAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Bank account not found" });
      }

      const currentBalance = parseFloat(account.balance);
      const adjustAmount = parseFloat(input.amount);
      const newBalance = input.type === 'add' 
        ? currentBalance + adjustAmount 
        : currentBalance - adjustAmount;

      const updated = await storage.updateBankAccount(id, {
        balance: newBalance.toFixed(2),
      });

      // Create bank transaction record
      await storage.createBankTransaction({
        bankAccountId: id,
        type: input.type === 'add' ? 'deposit' : 'withdrawal',
        amount: input.amount,
        currency: account.currency,
        description: input.description || (input.type === 'add' ? 'Deposit' : 'Withdrawal'),
      });

      await storage.createActivityLog({
        action: input.type === 'add' ? 'deposit' : 'withdrawal',
        entityType: 'bank_account',
        entityId: id,
        details: `${input.type === 'add' ? 'Added' : 'Subtracted'} ${input.amount} ${input.description ? `- ${input.description}` : ''}`,
      });

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === BANK TRANSACTIONS ===
  app.get("/api/bank-transactions", async (req, res) => {
    const accountId = req.query.accountId ? parseInt(req.query.accountId as string) : undefined;
    const transactions = await storage.getBankTransactions(accountId);
    res.json(transactions);
  });

  app.get("/api/bank-transactions/:accountId", async (req, res) => {
    const accountId = parseInt(req.params.accountId);
    const transactions = await storage.getBankTransactions(accountId);
    res.json(transactions);
  });

  // === EXPENSES ===
  app.get(api.expenses.list.path, async (req, res) => {
    const expensesList = await storage.getExpenses();
    res.json(expensesList);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(input);
      
      // If linked to bank account, subtract from balance and create transaction
      if (input.bankAccountId) {
        const account = await storage.getBankAccount(input.bankAccountId);
        if (account) {
          const newBalance = parseFloat(account.balance) - parseFloat(String(input.amount));
          await storage.updateBankAccount(input.bankAccountId, {
            balance: newBalance.toFixed(2),
          });
          
          // Create bank transaction record
          await storage.createBankTransaction({
            bankAccountId: input.bankAccountId,
            type: 'expense',
            amount: String(input.amount),
            currency: input.currency || account.currency,
            description: input.description || input.category,
            relatedEntityType: 'expense',
            relatedEntityId: expense.id,
          });
        }
      }

      await storage.createActivityLog({
        action: 'created',
        entityType: 'expense',
        entityId: expense.id,
        details: `Added expense: ${input.description || input.category} - ${input.amount} ${input.currency}`,
      });

      res.status(201).json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.expenses.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.expenses.update.input.parse(req.body);
      const expense = await storage.updateExpense(id, input);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.expenses.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteExpense(id);
    res.status(204).send();
  });

  // === TASKS ===
  app.get(api.tasks.list.path, async (req, res) => {
    const tasksList = await storage.getTasks();
    res.json(tasksList);
  });

  app.post(api.tasks.create.path, async (req, res) => {
    try {
      const input = api.tasks.create.input.parse(req.body);
      const task = await storage.createTask(input);
      res.status(201).json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.tasks.update.path, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.tasks.update.input.parse(req.body);
      
      // Get the old task to check for assignee changes
      const oldTask = await storage.getTasks().then(tasks => tasks.find(t => t.id === id));
      
      const task = await storage.updateTask(id, input);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Send notification if assignee changed
      if (input.assigneeId && input.assigneeId !== oldTask?.assigneeId) {
        await storage.createNotification({
          userId: input.assigneeId,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: `You have been assigned to: ${task.title}`,
          entityType: 'task',
          entityId: task.id,
        });
      }

      res.json(task);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.tasks.delete.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteTask(id);
    res.status(204).send();
  });

  // === ATTACHMENTS ===
  app.get(api.attachments.list.path, async (req, res) => {
    const files = await storage.getAttachments();
    res.json(files);
  });

  app.post(api.attachments.upload.path, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const attachment = await storage.createAttachment({
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        folder: req.body.folder || 'general',
      });

      res.status(201).json(attachment);
    } catch (err) {
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  app.delete(api.attachments.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Get the attachment to find its filename
      const allAttachments = await storage.getAttachments();
      const attachment = allAttachments.find(a => a.id === id);
      
      // Delete file from disk if exists
      if (attachment) {
        const filePath = path.join(process.cwd(), 'uploads', attachment.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deleteAttachment(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Rename folder (update all files in folder)
  app.put('/api/folders/:folderName', isAuthenticated, async (req, res) => {
    try {
      const oldName = req.params.folderName;
      const { newName } = req.body;
      if (!newName) {
        return res.status(400).json({ message: "New folder name is required" });
      }
      const sanitized = newName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      await storage.renameFolder(oldName, sanitized);
      res.json({ success: true, newName: sanitized });
    } catch (err) {
      res.status(500).json({ message: "Failed to rename folder" });
    }
  });

  // Delete folder and all files in it
  app.delete('/api/folders/:folderName', isAuthenticated, async (req, res) => {
    try {
      const folderName = req.params.folderName;
      // Get all files in the folder to delete from disk
      const allAttachments = await storage.getAttachments();
      const folderFiles = allAttachments.filter(a => a.folder === folderName);
      
      // Delete files from disk
      for (const file of folderFiles) {
        const filePath = path.join(process.cwd(), 'uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      // Delete from database
      await storage.deleteFolder(folderName);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    const filePath = path.join(process.cwd(), 'uploads', req.path);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  // === ACTIVITY LOG ===
  app.get(api.activityLog.list.path, async (req, res) => {
    const logs = await storage.getActivityLog();
    res.json(logs);
  });

  // === DASHBOARD STATS ===
  // Exchange rates (base: USD)
  const EXCHANGE_RATES: Record<string, number> = {
    USD: 1,
    AED: 3.67,
    EUR: 0.92
  };

  const convertToUSD = (amount: number, currency: string): number => {
    const rate = EXCHANGE_RATES[currency] || 1;
    return amount / rate;
  };

  app.get(api.dashboard.stats.path, async (req, res) => {
    const inventoryItems = await storage.getInventory();
    const salesOrdersList = await storage.getSalesOrders();
    const expensesList = await storage.getExpenses();
    const bankAccountsList = await storage.getBankAccounts();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate totals (converting to USD)
    const totalInventoryValue = inventoryItems.reduce((sum, item) => 
      sum + convertToUSD(parseFloat(item.totalCost), item.currency || 'USD'), 0);
    const totalRevenue = salesOrdersList.reduce((sum, order) => 
      sum + convertToUSD(parseFloat(order.totalRevenue), order.currency || 'USD'), 0);
    const totalProfit = salesOrdersList.reduce((sum, order) => 
      sum + convertToUSD(parseFloat(order.profit), order.currency || 'USD'), 0);
    const totalExpenses = expensesList.reduce((sum, exp) => 
      sum + convertToUSD(parseFloat(exp.amount), exp.currency || 'USD'), 0);

    // Monthly calculations
    const monthlyOrders = salesOrdersList.filter(order => {
      const orderDate = new Date(order.saleDate);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    const monthlyExpensesList = expensesList.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const monthlyRevenue = monthlyOrders.reduce((sum, order) => 
      sum + convertToUSD(parseFloat(order.totalRevenue), order.currency || 'USD'), 0);
    const monthlyExpensesTotal = monthlyExpensesList.reduce((sum, exp) => 
      sum + convertToUSD(parseFloat(exp.amount), exp.currency || 'USD'), 0);
    const monthlyProfit = monthlyOrders.reduce((sum, order) => 
      sum + convertToUSD(parseFloat(order.profit), order.currency || 'USD'), 0) - monthlyExpensesTotal;

    const lowStockCount = inventoryItems.filter(item => (item.quantityAvailable || 0) < 10 && item.status !== 'sold_out').length;
    const pendingPayouts = salesOrdersList
      .filter(order => order.payoutStatus === 'pending')
      .reduce((sum, order) => sum + convertToUSD(parseFloat(order.netRevenue), order.currency || 'USD'), 0);
    const receivedPayouts = salesOrdersList
      .filter(order => order.payoutStatus === 'received')
      .reduce((sum, order) => sum + convertToUSD(parseFloat(order.netRevenue), order.currency || 'USD'), 0);
    const totalBankBalance = bankAccountsList.reduce((sum, acc) => 
      sum + convertToUSD(parseFloat(acc.balance), acc.currency || 'USD'), 0);
    
    // Counts
    const totalProductsResearching = await storage.getPotentialProducts().then(p => p.filter(pr => pr.status === 'researching').length);
    const totalProductsReadyToBuy = await storage.getPotentialProducts().then(p => p.filter(pr => pr.status === 'ready_to_buy').length);
    const totalSalesOrders = salesOrdersList.length;
    const pendingSalesCount = salesOrdersList.filter(o => o.payoutStatus === 'pending').length;
    const receivedSalesCount = salesOrdersList.filter(o => o.payoutStatus === 'received').length;
    const totalUnitsInStock = inventoryItems.reduce((sum, item) => sum + (item.quantityAvailable || 0), 0);

    res.json({
      totalInventoryValue: totalInventoryValue.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      monthlyRevenue: monthlyRevenue.toFixed(2),
      monthlyExpenses: monthlyExpensesTotal.toFixed(2),
      monthlyProfit: monthlyProfit.toFixed(2),
      inventoryCount: inventoryItems.length,
      lowStockCount,
      pendingPayouts: pendingPayouts.toFixed(2),
      receivedPayouts: receivedPayouts.toFixed(2),
      totalBankBalance: totalBankBalance.toFixed(2),
      totalProductsResearching,
      totalProductsReadyToBuy,
      totalSalesOrders,
      pendingSalesCount,
      receivedSalesCount,
      totalUnitsInStock,
    });
  });

  // === USERS ===
  app.get(api.users.list.path, async (req, res) => {
    const usersList = await storage.getUsers();
    res.json(usersList);
  });

  app.put(api.users.updateRole.path, isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub;
      const currentUser = await storage.getUsers().then(users => users.find(u => u.id === currentUserId));
      if (!currentUser || !['admin', 'founder'].includes(currentUser.role || '')) {
        return res.status(403).json({ message: "Only admins and founders can change user roles" });
      }
      const id = req.params.id;
      const input = api.users.updateRole.input.parse(req.body);
      const usersList = await storage.getUsers();
      const targetUser = usersList.find(u => u.id === id);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.updateUserRole(id, input.role);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.users.deactivate.path, isAuthenticated, async (req: any, res) => {
    const currentUserId = req.user?.claims?.sub;
    const currentUser = await storage.getUsers().then(users => users.find(u => u.id === currentUserId));
    if (!currentUser || !['admin', 'founder'].includes(currentUser.role || '')) {
      return res.status(403).json({ message: "Only admins and founders can deactivate users" });
    }
    const id = req.params.id;
    const usersList = await storage.getUsers();
    const user = usersList.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await storage.deactivateUser(id);
    res.json({ success: true });
  });

  app.post(api.users.reactivate.path, isAuthenticated, async (req: any, res) => {
    const currentUserId = req.user?.claims?.sub;
    const currentUser = await storage.getUsers().then(users => users.find(u => u.id === currentUserId));
    if (!currentUser || !['admin', 'founder'].includes(currentUser.role || '')) {
      return res.status(403).json({ message: "Only admins and founders can reactivate users" });
    }
    const id = req.params.id;
    const usersList = await storage.getUsers();
    const user = usersList.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await storage.reactivateUser(id);
    res.json({ success: true });
  });

  // === ACCOUNT (Current User) ===
  app.put('/api/account/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const profileSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().optional(),
        profileImageUrl: z.string().optional(),
      });
      
      const input = profileSchema.parse(req.body);
      await storage.updateUserProfile(userId, {
        firstName: input.firstName,
        lastName: input.lastName || null,
        profileImageUrl: input.profileImageUrl || null,
      });
      
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put('/api/account/password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const passwordSchema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
      }).refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
      });
      
      const input = passwordSchema.parse(req.body);
      
      const usersList = await storage.getUsers();
      const user = usersList.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.passwordHash) {
        const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!isValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }
      
      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
      await storage.updateUserPassword(userId, newPasswordHash);
      
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === SETTINGS ===
  app.get(api.settings.get.path, async (req, res) => {
    res.json({
      defaultCurrency: "USD",
      exchangeRates: EXCHANGE_RATES,
    });
  });

  // === INVITATIONS ===
  app.get(api.invitations.list.path, async (req, res) => {
    const invitationsList = await storage.getInvitations();
    res.json(invitationsList);
  });

  app.post(api.invitations.create.path, async (req, res) => {
    try {
      const input = api.invitations.create.input.parse(req.body);
      const crypto = await import('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await storage.createInvitation({
        email: input.email,
        role: input.role,
        token,
        expiresAt,
      });

      res.status(201).json(invitation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // === NOTIFICATIONS ===
  app.get(api.notifications.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const notifications = await storage.getNotifications(userId);
    res.json(notifications);
  });

  app.post(api.notifications.markRead.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    await storage.markNotificationRead(id);
    res.json({ success: true });
  });

  app.post(api.notifications.markAllRead.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await storage.markAllNotificationsRead(userId);
    res.json({ success: true });
  });

  // === AUTH (Password-based) ===
  app.post(api.auth.setupPassword.path, async (req, res) => {
    try {
      const input = api.auth.setupPassword.input.parse(req.body);
      const invitationsList = await storage.getInvitations();
      const invitation = invitationsList.find(i => i.token === input.token && !i.used);
      
      if (!invitation) {
        return res.status(400).json({ message: "Invalid or expired invitation token" });
      }
      
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      // Create the user or update existing
      const usersList = await storage.getUsers();
      let user = usersList.find(u => u.email === invitation.email);
      
      if (user) {
        await storage.updateUserPassword(user.id, passwordHash);
      } else {
        // User doesn't exist yet, create a new user with the invitation info
        const db = (await import("./db")).db;
        const { users } = await import("@shared/models/auth");
        const crypto = await import('crypto');
        const newUserId = crypto.randomUUID();
        
        await db.insert(users).values({
          id: newUserId,
          email: invitation.email,
          passwordHash: passwordHash,
          role: invitation.role,
          isActive: true,
        });
      }

      // Mark invitation as used
      await storage.markInvitationUsed(invitation.id);
      
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByEmail(input.email);
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is deactivated" });
      }

      // Set session (simplified - in production would use proper session management)
      (req as any).session = (req as any).session || {};
      (req as any).session.userId = user.id;
      
      res.json({ 
        success: true, 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName, 
          role: user.role 
        } 
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(401).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post(api.auth.changePassword.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const input = api.auth.changePassword.input.parse(req.body);
      const usersList = await storage.getUsers();
      const user = usersList.find(u => u.id === userId);
      
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "Password not set for this account" });
      }

      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
      await storage.updateUserPassword(userId, newPasswordHash);
      
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Seed initial data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  // Seed bank accounts
  const bankAccounts = await storage.getBankAccounts();
  if (bankAccounts.length === 0) {
    await storage.createBankAccount({ name: "UAE Bank", type: "bank", balance: "5000", currency: "AED" });
    await storage.createBankAccount({ name: "Germany Bank", type: "bank", balance: "3000", currency: "EUR" });
    await storage.createBankAccount({ name: "Cash", type: "cash", balance: "500", currency: "USD" });
    await storage.createBankAccount({ name: "Amazon Payouts", type: "payout_pending", balance: "0", currency: "AED" });
    await storage.createBankAccount({ name: "Noon Payouts", type: "payout_pending", balance: "0", currency: "AED" });
  }

  // Seed potential products
  const potentialProds = await storage.getPotentialProducts();
  if (potentialProds.length === 0) {
    await storage.createPotentialProduct({
      name: "Wireless Earbuds Pro",
      supplierLink: "https://aliexpress.com/...",
      supplierName: "TechStore Official",
      costPerUnit: "12.50",
      currency: "USD",
      suggestedQuantity: 50,
      estimatedShipping: "50",
      targetSellingPrice: "45",
      marketplace: "Amazon UAE",
      buyRating: 4,
      status: "ready_to_buy",
    });
    await storage.createPotentialProduct({
      name: "Portable Phone Stand",
      supplierLink: "https://aliexpress.com/...",
      supplierName: "GadgetWorld",
      costPerUnit: "2.50",
      currency: "USD",
      suggestedQuantity: 100,
      estimatedShipping: "30",
      targetSellingPrice: "15",
      marketplace: "Noon",
      buyRating: 5,
      status: "researching",
    });
  }

  // Seed tasks
  const tasksList = await storage.getTasks();
  if (tasksList.length === 0) {
    await storage.createTask({
      title: "Research Summer Products",
      description: "Find trending items for summer season in UAE",
      status: "open",
      priority: "high",
      labels: "Product",
    });
    await storage.createTask({
      title: "Launch Komersh.ae Website",
      description: "Finalize domain and publish the store",
      status: "in_progress",
      priority: "high",
      labels: "Ops",
    });
    await storage.createTask({
      title: "Setup Facebook Ads",
      description: "Create ad campaigns for new products",
      status: "planned",
      priority: "medium",
      labels: "Marketing",
    });
  }
}
