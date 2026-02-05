import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { EXCHANGE_RATES } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

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

  app.post(api.potentialProducts.create.path, async (req, res) => {
    try {
      const input = api.potentialProducts.create.input.parse(req.body);
      const product = await storage.createPotentialProduct(input);
      await storage.createActivityLog({
        action: 'created',
        entityType: 'potential_product',
        entityId: product.id,
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

  // === SALES ORDERS ===
  app.get(api.salesOrders.list.path, async (req, res) => {
    const orders = await storage.getSalesOrders();
    res.json(orders);
  });

  app.put(api.salesOrders.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.salesOrders.update.input.parse(req.body);
      const order = await storage.updateSalesOrder(id, input);
      if (!order) {
        return res.status(404).json({ message: "Sales order not found" });
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

  // === EXPENSES ===
  app.get(api.expenses.list.path, async (req, res) => {
    const expensesList = await storage.getExpenses();
    res.json(expensesList);
  });

  app.post(api.expenses.create.path, async (req, res) => {
    try {
      const input = api.expenses.create.input.parse(req.body);
      const expense = await storage.createExpense(input);
      
      // If linked to bank account, subtract from balance
      if (input.bankAccountId) {
        const account = await storage.getBankAccount(input.bankAccountId);
        if (account) {
          const newBalance = parseFloat(account.balance) - parseFloat(String(input.amount));
          await storage.updateBankAccount(input.bankAccountId, {
            balance: newBalance.toFixed(2),
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

  app.put(api.tasks.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.tasks.update.input.parse(req.body);
      const task = await storage.updateTask(id, input);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
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
    const id = parseInt(req.params.id);
    await storage.deleteAttachment(id);
    res.status(204).send();
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
  app.get(api.dashboard.stats.path, async (req, res) => {
    const inventoryItems = await storage.getInventory();
    const salesOrdersList = await storage.getSalesOrders();
    const expensesList = await storage.getExpenses();
    const bankAccountsList = await storage.getBankAccounts();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Calculate totals
    const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + parseFloat(item.totalCost), 0);
    const totalRevenue = salesOrdersList.reduce((sum, order) => sum + parseFloat(order.totalRevenue), 0);
    const totalProfit = salesOrdersList.reduce((sum, order) => sum + parseFloat(order.profit), 0);
    const totalExpenses = expensesList.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    // Monthly calculations
    const monthlyOrders = salesOrdersList.filter(order => {
      const orderDate = new Date(order.saleDate);
      return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
    });
    const monthlyExpensesList = expensesList.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    });

    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.totalRevenue), 0);
    const monthlyExpensesTotal = monthlyExpensesList.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const monthlyProfit = monthlyOrders.reduce((sum, order) => sum + parseFloat(order.profit), 0) - monthlyExpensesTotal;

    const lowStockCount = inventoryItems.filter(item => (item.quantityAvailable || 0) <= 5 && item.status !== 'sold_out').length;
    const pendingPayouts = salesOrdersList
      .filter(order => order.payoutStatus === 'pending')
      .reduce((sum, order) => sum + parseFloat(order.netRevenue), 0);
    const totalBankBalance = bankAccountsList.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);

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
      totalBankBalance: totalBankBalance.toFixed(2),
    });
  });

  // === USERS ===
  app.get(api.users.list.path, async (req, res) => {
    const usersList = await storage.getUsers();
    res.json(usersList);
  });

  app.put(api.users.updateRole.path, async (req, res) => {
    try {
      const id = req.params.id;
      const input = api.users.updateRole.input.parse(req.body);
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

  // === SETTINGS ===
  app.get(api.settings.get.path, async (req, res) => {
    res.json({
      defaultCurrency: "USD",
      exchangeRates: EXCHANGE_RATES,
    });
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
