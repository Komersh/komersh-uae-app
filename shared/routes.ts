import { z } from 'zod';
import { 
  insertPotentialProductSchema, potentialProducts,
  insertInventorySchema, inventory,
  insertSalesOrderSchema, salesOrders,
  insertBankAccountSchema, bankAccounts,
  insertExpenseSchema, expenses,
  insertTaskSchema, tasks,
  insertAttachmentSchema, attachments,
  insertActivityLogSchema, activityLog,
  type InsertPotentialProduct,
  type InsertInventory,
  type InsertSalesOrder,
  type InsertBankAccount,
  type InsertExpense,
  type InsertTask,
  type InsertAttachment,
  type InsertActivityLog,
} from './schema';

export type {
  InsertPotentialProduct,
  InsertInventory,
  InsertSalesOrder,
  InsertBankAccount,
  InsertExpense,
  InsertTask,
  InsertAttachment,
  InsertActivityLog,
};

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // === POTENTIAL PRODUCTS ===
  potentialProducts: {
    list: {
      method: 'GET' as const,
      path: '/api/potential-products',
      responses: {
        200: z.array(z.custom<typeof potentialProducts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/potential-products',
      input: insertPotentialProductSchema,
      responses: {
        201: z.custom<typeof potentialProducts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/potential-products/:id',
      input: insertPotentialProductSchema.partial(),
      responses: {
        200: z.custom<typeof potentialProducts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/potential-products/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    buy: {
      method: 'POST' as const,
      path: '/api/potential-products/:id/buy',
      input: z.object({
        quantity: z.number(),
        unitCost: z.string(),
        shippingCost: z.string().optional(),
        supplierOrderId: z.string().optional(),
        purchaseDate: z.string(),
      }),
      responses: {
        201: z.custom<typeof inventory.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // === INVENTORY ===
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory',
      responses: {
        200: z.array(z.custom<typeof inventory.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/inventory/:id',
      input: insertInventorySchema.partial(),
      responses: {
        200: z.custom<typeof inventory.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    sell: {
      method: 'POST' as const,
      path: '/api/inventory/:id/sell',
      input: z.object({
        channel: z.string(),
        quantitySold: z.number(),
        sellingPricePerUnit: z.string(),
        marketplaceFees: z.string().optional(),
        shippingCost: z.string().optional(),
        saleDate: z.string(),
        notes: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof salesOrders.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // === SALES ORDERS ===
  salesOrders: {
    list: {
      method: 'GET' as const,
      path: '/api/sales-orders',
      responses: {
        200: z.array(z.custom<typeof salesOrders.$inferSelect>()),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sales-orders/:id',
      input: insertSalesOrderSchema.partial(),
      responses: {
        200: z.custom<typeof salesOrders.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === BANK ACCOUNTS ===
  bankAccounts: {
    list: {
      method: 'GET' as const,
      path: '/api/bank-accounts',
      responses: {
        200: z.array(z.custom<typeof bankAccounts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bank-accounts',
      input: insertBankAccountSchema,
      responses: {
        201: z.custom<typeof bankAccounts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/bank-accounts/:id',
      input: insertBankAccountSchema.partial(),
      responses: {
        200: z.custom<typeof bankAccounts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    adjustBalance: {
      method: 'POST' as const,
      path: '/api/bank-accounts/:id/adjust',
      input: z.object({
        amount: z.string(),
        type: z.enum(['add', 'subtract']),
        description: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof bankAccounts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === EXPENSES ===
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses',
      responses: {
        200: z.array(z.custom<typeof expenses.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses',
      input: insertExpenseSchema,
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/expenses/:id',
      input: insertExpenseSchema.partial(),
      responses: {
        200: z.custom<typeof expenses.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/expenses/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === TASKS ===
  tasks: {
    list: {
      method: 'GET' as const,
      path: '/api/tasks',
      responses: {
        200: z.array(z.custom<typeof tasks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tasks',
      input: insertTaskSchema,
      responses: {
        201: z.custom<typeof tasks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/tasks/:id',
      input: insertTaskSchema.partial(),
      responses: {
        200: z.custom<typeof tasks.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/tasks/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === ATTACHMENTS / FILES ===
  attachments: {
    list: {
      method: 'GET' as const,
      path: '/api/attachments',
      responses: {
        200: z.array(z.custom<typeof attachments.$inferSelect>()),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/attachments/upload',
      responses: {
        201: z.custom<typeof attachments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/attachments/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },

  // === ACTIVITY LOG ===
  activityLog: {
    list: {
      method: 'GET' as const,
      path: '/api/activity-log',
      responses: {
        200: z.array(z.custom<typeof activityLog.$inferSelect>()),
      },
    },
  },

  // === DASHBOARD STATS ===
  dashboard: {
    stats: {
      method: 'GET' as const,
      path: '/api/dashboard/stats',
      responses: {
        200: z.object({
          totalInventoryValue: z.string(),
          totalRevenue: z.string(),
          totalProfit: z.string(),
          totalExpenses: z.string(),
          monthlyRevenue: z.string(),
          monthlyExpenses: z.string(),
          monthlyProfit: z.string(),
          inventoryCount: z.number(),
          lowStockCount: z.number(),
          pendingPayouts: z.string(),
          totalBankBalance: z.string(),
        }),
      },
    },
  },

  // === USER MANAGEMENT (Admin) ===
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.object({
          id: z.string(),
          email: z.string().nullable(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          role: z.string().nullable(),
          isActive: z.boolean().nullable(),
        })),
      },
    },
    updateRole: {
      method: 'PUT' as const,
      path: '/api/users/:id/role',
      input: z.object({
        role: z.enum(['admin', 'founder', 'marketing', 'warehouse', 'viewer']),
      }),
      responses: {
        200: z.object({ success: z.boolean() }),
        404: errorSchemas.notFound,
      },
    },
    invite: {
      method: 'POST' as const,
      path: '/api/users/invite',
      input: z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'founder', 'marketing', 'warehouse', 'viewer']),
      }),
      responses: {
        201: z.object({ success: z.boolean(), inviteLink: z.string() }),
        400: errorSchemas.validation,
      },
    },
  },

  // === SETTINGS (Currency) ===
  settings: {
    get: {
      method: 'GET' as const,
      path: '/api/settings',
      responses: {
        200: z.object({
          defaultCurrency: z.enum(['USD', 'AED', 'EUR']),
          exchangeRates: z.object({
            USD: z.number(),
            AED: z.number(),
            EUR: z.number(),
          }),
        }),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
