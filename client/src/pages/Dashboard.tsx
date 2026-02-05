import { useDashboardStats } from "@/hooks/use-dashboard";
import { useBankAccounts } from "@/hooks/use-bank-accounts";
import { useActivityLog } from "@/hooks/use-activity-log";
import { useSalesOrders } from "@/hooks/use-sales-orders";
import { useExpenses } from "@/hooks/use-expenses";
import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, DollarSign, Package, TrendingUp, Wallet, AlertTriangle, Building2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXCHANGE_RATES, CURRENCIES, type Currency } from "@shared/schema";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: bankAccounts } = useBankAccounts();
  const { data: activityLog } = useActivityLog();
  const { data: salesOrders } = useSalesOrders();
  const { data: expenses } = useExpenses();
  const [currency, setCurrency] = useState<Currency>("USD");

  const convertCurrency = (value: string | number, toCurrency: Currency) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return "0.00";
    const inUSD = numValue;
    const converted = inUSD * EXCHANGE_RATES[toCurrency];
    return converted.toFixed(2);
  };

  const getCurrencySymbol = (curr: Currency) => {
    switch(curr) {
      case "USD": return "$";
      case "AED": return "AED ";
      case "EUR": return "€";
    }
  };

  const formatAmount = (value: string | number) => {
    return `${getCurrencySymbol(currency)}${Number(convertCurrency(value, currency)).toLocaleString()}`;
  };

  // Prepare chart data from actual sales and expenses
  const monthlyData = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = format(date, 'MMM');
    const monthOrders = salesOrders?.filter((o: any) => {
      const orderDate = new Date(o.saleDate);
      return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
    }) || [];
    const monthExpenses = expenses?.filter((e: any) => {
      const expDate = new Date(e.date);
      return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
    }) || [];
    
    const revenue = monthOrders.reduce((sum: number, o: any) => sum + parseFloat(o.totalRevenue || "0"), 0);
    const expense = monthExpenses.reduce((sum: number, e: any) => sum + parseFloat(e.amount || "0"), 0);
    
    monthlyData.push({
      name: monthName,
      revenue,
      expense,
      profit: revenue - expense
    });
  }

  // Expense category breakdown for pie chart
  const expenseByCategory: Record<string, number> = {};
  expenses?.forEach((e: any) => {
    const cat = e.category || "Other";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + parseFloat(e.amount || "0");
  });
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  const COLORS = ['#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
            <p className="text-muted-foreground mt-2">Welcome back to Komersh command center.</p>
          </div>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger className="w-32 bg-card border-border text-foreground" data-testid="select-currency">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {CURRENCIES.map(c => (
                <SelectItem key={c} value={c} className="text-foreground">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Revenue" 
            value={formatAmount(stats?.totalRevenue || "0")}
            icon={TrendingUp}
            trend={`${formatAmount(stats?.monthlyRevenue || "0")} this month`}
            color="text-emerald-400"
          />
          <StatCard 
            title="Total Profit" 
            value={formatAmount(stats?.totalProfit || "0")}
            icon={ArrowUpRight}
            trend={`${formatAmount(stats?.monthlyProfit || "0")} this month`}
            color="text-primary"
          />
          <StatCard 
            title="Total Expenses" 
            value={formatAmount(stats?.totalExpenses || "0")}
            icon={DollarSign}
            trend={`${formatAmount(stats?.monthlyExpenses || "0")} this month`}
            color="text-rose-400"
          />
          <StatCard 
            title="Inventory Items" 
            value={stats?.inventoryCount?.toString() || "0"}
            icon={Package}
            trend={stats?.lowStockCount ? `${stats.lowStockCount} low stock (< 10 units)` : "All stocked"}
            color="text-blue-400"
            alert={stats?.lowStockCount > 0}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-card/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.totalSalesOrders || 0}</p>
              <p className="text-xs text-muted-foreground">Total Sales</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-500">{stats?.pendingSalesCount || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Payouts</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500">{stats?.receivedSalesCount || 0}</p>
              <p className="text-xs text-muted-foreground">Received Payouts</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{stats?.totalUnitsInStock || 0}</p>
              <p className="text-xs text-muted-foreground">Units in Stock</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-500">{stats?.totalProductsResearching || 0}</p>
              <p className="text-xs text-muted-foreground">Researching</p>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats?.totalProductsReadyToBuy || 0}</p>
              <p className="text-xs text-muted-foreground">Ready to Buy</p>
            </CardContent>
          </Card>
        </div>

        {/* Bank Accounts */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {bankAccounts?.map((account: any) => (
            <Card key={account.id} className="glass-card border-none bg-card/40">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${account.type === 'payout_pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {account.type === 'payout_pending' ? <Clock className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{account.name}</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {account.currency} {parseFloat(account.balance).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Wallet className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
              </div>
              <p className="text-xl font-bold text-white">
                {formatAmount(stats?.totalBankBalance || "0")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card border-none bg-card/40">
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" tickLine={false} axisLine={false} tickFormatter={(value) => `${getCurrencySymbol(currency)}${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => `${getCurrencySymbol(currency)}${value.toLocaleString()}`}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} name="Revenue" />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-none bg-card/40">
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
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
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                        formatter={(value: any) => `${getCurrencySymbol(currency)}${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No expense data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Log */}
        <Card className="glass-card border-none bg-card/40">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {activityLog?.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-center gap-4 rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    log.action === 'sold' ? 'bg-emerald-500/20 text-emerald-400' :
                    log.action === 'bought' ? 'bg-blue-500/20 text-blue-400' :
                    log.action === 'created' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {log.action === 'sold' ? <TrendingUp className="h-5 w-5" /> :
                     log.action === 'bought' ? <Package className="h-5 w-5" /> :
                     <DollarSign className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{log.details}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">No activity yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, alert }: any) {
  return (
    <Card className="glass-card border-none bg-card/40 hover:-translate-y-1 transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          {alert && (
            <AlertTriangle className="h-5 w-5 text-yellow-400 animate-pulse" />
          )}
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
          <span className="text-xs font-medium text-muted-foreground mt-1 block">{trend}</span>
        </div>
      </CardContent>
    </Card>
  );
}
