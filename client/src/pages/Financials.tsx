import { useState, useEffect } from "react";
import { Layout } from "@/components/ui/Layout";
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useSalesOrders } from "@/hooks/use-sales-orders";
import { useBankAccounts, useAdjustBankBalance } from "@/hooks/use-bank-accounts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Search, Filter, TrendingUp, TrendingDown, Building2, ArrowUpRight, ArrowDownRight, Edit } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema, CURRENCIES, EXCHANGE_RATES, type Currency } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";

const formSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount is required"),
  currency: z.string().default("USD"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  paidBy: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankAccountId: z.number().optional(),
});

const EXPENSE_CATEGORIES = ["Marketing", "Subscription", "Shipping", "Warehouse", "Tools", "Misc"];
const PAID_BY_OPTIONS = ["Germany", "UAE", "Company", "Person A", "Person B"];

export default function Financials() {
  const { data: expenses, isLoading } = useExpenses();
  const { data: salesOrders } = useSalesOrders();
  const { data: bankAccounts } = useBankAccounts();
  const deleteExpense = useDeleteExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPaidBy, setFilterPaidBy] = useState("all");
  const [currency, setCurrency] = useState<Currency>("USD");

  const convertCurrency = (value: string | number, fromCurrency: string, toCurrency: Currency) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 0;
    const fromRate = EXCHANGE_RATES[fromCurrency as Currency] || 1;
    const toRate = EXCHANGE_RATES[toCurrency];
    return (numValue / fromRate) * toRate;
  };

  const getCurrencySymbol = (curr: Currency) => {
    switch(curr) {
      case "USD": return "$";
      case "AED": return "AED ";
      case "EUR": return "€";
    }
  };

  const formatAmount = (value: number) => {
    return `${getCurrencySymbol(currency)}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Filter expenses
  const filteredExpenses = expenses?.filter((e: any) => {
    const matchesSearch = !search || 
      e.description?.toLowerCase().includes(search.toLowerCase()) || 
      e.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || e.category === filterCategory;
    const matchesPaidBy = filterPaidBy === "all" || e.paidBy === filterPaidBy;
    return matchesSearch && matchesCategory && matchesPaidBy;
  }) || [];

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => 
    sum + convertCurrency(e.amount, e.currency || "USD", currency), 0);
  
  const totalRevenue = salesOrders?.reduce((sum: number, o: any) => 
    sum + convertCurrency(o.totalRevenue, o.currency || "USD", currency), 0) || 0;
  
  const totalProfit = salesOrders?.reduce((sum: number, o: any) => 
    sum + convertCurrency(o.profit, o.currency || "USD", currency), 0) || 0;

  // Category breakdown for chart
  const categoryData: Record<string, number> = {};
  filteredExpenses.forEach((e: any) => {
    const cat = e.category || "Other";
    categoryData[cat] = (categoryData[cat] || 0) + convertCurrency(e.amount, e.currency || "USD", currency);
  });
  const pieData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));
  const CHART_COLORS = [
  'hsl(280, 70%, 50%)', // primary purple
  'hsl(340, 82%, 52%)', // rose
  'hsl(160, 60%, 45%)', // emerald
  'hsl(35, 92%, 50%)',  // amber
  'hsl(230, 84%, 63%)', // indigo
  'hsl(320, 84%, 60%)', // pink
];

  // Monthly expense data
  const monthlyExpenseData: Record<string, number> = {};
  filteredExpenses.forEach((e: any) => {
    const month = format(new Date(e.date), 'MMM yyyy');
    monthlyExpenseData[month] = (monthlyExpenseData[month] || 0) + convertCurrency(e.amount, e.currency || "USD", currency);
  });
  const barData = Object.entries(monthlyExpenseData).slice(-6).map(([name, value]) => ({ name, value }));

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financial Records</h1>
            <p className="text-muted-foreground mt-2">Track revenue, expenses, and profit across all channels.</p>
          </div>
          <div className="flex gap-4">
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-24 bg-background border-border" data-testid="select-display-currency">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddExpenseDialog open={isAddOpen} onOpenChange={setIsAddOpen} bankAccounts={bankAccounts} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatAmount(totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatAmount(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/20 text-primary">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Net Profit</span>
              </div>
              <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatAmount(totalProfit)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  <Building2 className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Bank Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatAmount(bankAccounts?.reduce((sum: number, a: any) => 
                  sum + convertCurrency(a.balance, a.currency, currency), 0) || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="bg-muted border border-border p-1 mb-6">
            <TabsTrigger value="expenses">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="sales">
              Sales Orders
            </TabsTrigger>
            <TabsTrigger value="charts">
              Charts
            </TabsTrigger>
            <TabsTrigger value="accounts">
              Bank Accounts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="mt-0">
            <Card className="glass-card bg-card/40 border-none">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                <CardTitle>Expense Ledger</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search expenses..." 
                      className="pl-8 bg-background border-border"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      data-testid="input-search-expenses"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40 bg-background border-border" data-testid="select-filter-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Categories</SelectItem>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterPaidBy} onValueChange={setFilterPaidBy}>
                    <SelectTrigger className="w-40 bg-background border-border" data-testid="select-filter-paidby">
                      <SelectValue placeholder="Paid By" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="all">All Sources</SelectItem>
                      {PAID_BY_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground">Date</TableHead>
                        <TableHead className="text-foreground">Category</TableHead>
                        <TableHead className="text-foreground">Description</TableHead>
                        <TableHead className="text-foreground">Paid By</TableHead>
                        <TableHead className="text-right text-foreground">Amount</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">Loading expenses...</TableCell>
                        </TableRow>
                      ) : filteredExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No expenses found.</TableCell>
                        </TableRow>
                      ) : (
                        filteredExpenses.map((item: any) => (
                          <TableRow key={item.id} className="border-border hover:bg-muted/50 transition-colors group">
                            <TableCell className="font-mono text-muted-foreground">
                              {format(new Date(item.date), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                item.category === 'Marketing' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 ring-purple-300 dark:ring-purple-700' :
                                item.category === 'Shipping' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-blue-300 dark:ring-blue-700' :
                                item.category === 'Subscription' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-green-300 dark:ring-green-700' :
                                'bg-muted text-muted-foreground ring-border'
                              }`}>
                                {item.category}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground">{item.description}</TableCell>
                            <TableCell className="text-muted-foreground">{item.paidBy || '-'}</TableCell>
                            <TableCell className="text-right font-mono font-bold text-foreground">
                              {item.currency || 'USD'} {parseFloat(item.amount).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => setEditExpense(item)}
                                  data-testid={`button-edit-expense-${item.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      data-testid={`button-delete-expense-${item.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card border-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{item.description}"? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => deleteExpense.mutate(item.id)}
                                        className="bg-destructive text-destructive-foreground"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            <Card className="glass-card bg-card/40 border-none">
              <CardHeader>
                <CardTitle>Sales Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground">Date</TableHead>
                        <TableHead className="text-foreground">Channel</TableHead>
                        <TableHead className="text-foreground">Qty</TableHead>
                        <TableHead className="text-right text-foreground">Revenue</TableHead>
                        <TableHead className="text-right text-foreground">COGS</TableHead>
                        <TableHead className="text-right text-foreground">Profit</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!salesOrders || salesOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No sales yet. Sell products from the Products page.</TableCell>
                        </TableRow>
                      ) : (
                        salesOrders.map((order: any) => (
                          <TableRow key={order.id} className="border-border hover:bg-muted/50 transition-colors">
                            <TableCell className="font-mono text-muted-foreground">
                              {format(new Date(order.saleDate), 'yyyy-MM-dd')}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                order.channel === 'Amazon UAE' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 ring-orange-300 dark:ring-orange-700' :
                                order.channel === 'Noon' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 ring-yellow-300 dark:ring-yellow-700' :
                                'bg-primary/10 text-primary ring-primary/30'
                              }`}>
                                {order.channel}
                              </span>
                            </TableCell>
                            <TableCell className="text-foreground">{order.quantitySold}</TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {order.currency} {parseFloat(order.totalRevenue).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {order.currency} {parseFloat(order.cogs).toFixed(2)}
                            </TableCell>
                            <TableCell className={`text-right font-mono font-bold ${parseFloat(order.profit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {order.currency} {parseFloat(order.profit).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                                order.payoutStatus === 'received' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {order.payoutStatus}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card className="glass-card border-none bg-card/40">
                <CardHeader>
                  <CardTitle>Monthly Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${getCurrencySymbol(currency)}${v}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                          formatter={(value: any) => formatAmount(value)}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-none bg-card/40">
                <CardHeader>
                  <CardTitle>Expense by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                            formatter={(value: any) => formatAmount(value)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No expense data
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="accounts" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bankAccounts?.map((account: any) => (
                <BankAccountCard key={account.id} account={account} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <EditExpenseDialog item={editExpense} onClose={() => setEditExpense(null)} bankAccounts={bankAccounts || []} />
      </div>
    </Layout>
  );
}

function BankAccountCard({ account }: { account: any }) {
  const { toast } = useToast();
  const adjustBalance = useAdjustBankBalance();
  const [amount, setAmount] = useState("");

  const handleAdjust = (type: 'add' | 'subtract') => {
    if (!amount || parseFloat(amount) <= 0) return;
    adjustBalance.mutate({ id: account.id, amount, type }, {
      onSuccess: () => {
        toast({ title: type === 'add' ? "Deposited" : "Withdrawn", description: `${account.currency} ${amount} ${type === 'add' ? 'added to' : 'removed from'} ${account.name}` });
        setAmount("");
      }
    });
  };

  return (
    <Card className="glass-card border-none bg-card/40">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg ${account.type === 'payout_pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{account.name}</h3>
            <p className="text-xs text-muted-foreground capitalize">{account.type.replace('_', ' ')}</p>
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground mb-6">
          {account.currency} {parseFloat(account.balance).toLocaleString()}
        </p>
        <div className="flex gap-2">
          <Input 
            type="number" 
            placeholder="Amount" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-background border-border flex-1"
            data-testid={`input-adjust-${account.id}`}
          />
          <Button size="icon" variant="outline" className="text-emerald-600 dark:text-emerald-400" onClick={() => handleAdjust('add')} data-testid={`button-deposit-${account.id}`}>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="text-rose-600 dark:text-rose-400" onClick={() => handleAdjust('subtract')} data-testid={`button-withdraw-${account.id}`}>
            <ArrowDownRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddExpenseDialog({ open, onOpenChange, bankAccounts }: { open: boolean, onOpenChange: (open: boolean) => void, bankAccounts: any[] }) {
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "Marketing",
      currency: "USD",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: "",
      paidBy: "",
      paymentMethod: "",
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const expenseData = {
      category: data.category,
      amount: data.amount.toString(),
      currency: data.currency,
      description: data.description || null,
      date: data.date,
      paidBy: data.paidBy || null,
      paymentMethod: data.paymentMethod || null,
      bankAccountId: data.bankAccountId || null,
    };
    createExpense.mutate(expenseData as any, {
      onSuccess: () => {
        toast({ title: "Expense Added", description: "Your expense has been recorded." });
        onOpenChange(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message || "Failed to add expense.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/25" data-testid="button-add-expense">
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                onValueChange={(val) => form.setValue("category", val)} 
                defaultValue={form.getValues("category")}
              >
                <SelectTrigger className="bg-background border-border" data-testid="select-expense-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select 
                onValueChange={(val) => form.setValue("currency", val)} 
                defaultValue={form.getValues("currency")}
              >
                <SelectTrigger className="bg-background border-border" data-testid="select-expense-currency">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input 
                type="number" 
                className="bg-background border-border" 
                {...form.register("amount")} 
                data-testid="input-expense-amount"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input 
                type="date" 
                className="bg-background border-border" 
                {...form.register("date")} 
                data-testid="input-expense-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paid By</label>
              <Select onValueChange={(val) => form.setValue("paidBy", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-expense-paidby">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {PAID_BY_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select onValueChange={(val) => form.setValue("paymentMethod", val)}>
                <SelectTrigger className="bg-background border-border" data-testid="select-expense-method">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input 
              className="bg-background border-border" 
              {...form.register("description")} 
              data-testid="input-expense-description"
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createExpense.isPending} data-testid="button-submit-expense">
              {createExpense.isPending ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editExpenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount is required"),
  currency: z.string().default("USD"),
  description: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  paidBy: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankAccountId: z.number().optional(),
});

function EditExpenseDialog({ item, onClose, bankAccounts }: { item: any; onClose: () => void; bankAccounts: any[] }) {
  const { toast } = useToast();
  const updateExpense = useUpdateExpense();
  
  const form = useForm<z.infer<typeof editExpenseSchema>>({
    resolver: zodResolver(editExpenseSchema),
    defaultValues: {
      category: item?.category || "",
      amount: item?.amount ? parseFloat(item.amount) : 0,
      currency: item?.currency || "USD",
      description: item?.description || "",
      date: item?.date || "",
      paidBy: item?.paidBy || "",
      paymentMethod: item?.paymentMethod || "",
      bankAccountId: item?.bankAccountId,
    }
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        category: item.category || "",
        amount: item.amount ? parseFloat(item.amount) : 0,
        currency: item.currency || "USD",
        description: item.description || "",
        date: item.date || "",
        paidBy: item.paidBy || "",
        paymentMethod: item.paymentMethod || "",
        bankAccountId: item.bankAccountId,
      });
    }
  }, [item?.id]);

  if (!item) return null;

  const onSubmit = (data: z.infer<typeof editExpenseSchema>) => {
    updateExpense.mutate({
      id: item.id,
      category: data.category,
      amount: data.amount.toString(),
      currency: data.currency,
      description: data.description,
      date: data.date,
      paidBy: data.paidBy,
      paymentMethod: data.paymentMethod,
      bankAccountId: data.bankAccountId,
    }, {
      onSuccess: () => {
        toast({ title: "Expense Updated", description: "Expense details saved." });
        onClose();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update expense.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select onValueChange={(val) => form.setValue("category", val)} defaultValue={form.getValues("category")}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {EXPENSE_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount *</label>
              <Input 
                type="number" 
                step="0.01" 
                className="bg-background border-border" 
                {...form.register("amount")} 
                data-testid="input-edit-amount"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select onValueChange={(val) => form.setValue("currency", val)} defaultValue={form.getValues("currency")}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date *</label>
              <Input type="date" className="bg-background border-border" {...form.register("date")} data-testid="input-edit-date" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Paid By</label>
              <Select onValueChange={(val) => form.setValue("paidBy", val)} defaultValue={form.getValues("paidBy")}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-paidby">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {PAID_BY_OPTIONS.map(o => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select onValueChange={(val) => form.setValue("paymentMethod", val)} defaultValue={form.getValues("paymentMethod")}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-method">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input className="bg-background border-border" {...form.register("description")} data-testid="input-edit-description" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateExpense.isPending} data-testid="button-save-expense">
              {updateExpense.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
