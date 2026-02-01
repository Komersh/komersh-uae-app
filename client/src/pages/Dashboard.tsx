import { useExpenses } from "@/hooks/use-expenses";
import { useProducts } from "@/hooks/use-products";
import { Layout } from "@/components/ui/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import { ArrowUpRight, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { data: expenses } = useExpenses();
  const { data: products } = useProducts();

  // Calculate totals
  const totalExpenses = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  
  const purchasedProducts = products?.filter(p => p.status === 'purchased') || [];
  const inventoryCost = purchasedProducts.reduce((acc, curr) => 
    acc + (Number(curr.priceAed) * (curr.quantity || 1)) + Number(curr.shippingCost || 0), 0
  );

  const totalSpent = totalExpenses + inventoryCost;
  
  // Mock Revenue (Since schema doesn't have sales tracking yet, we'll simulate profit logic)
  // In a real app, you'd add a "Sales" table.
  const estimatedRevenue = inventoryCost * 1.5; // Assuming 50% markup on purchased goods
  const netProfit = estimatedRevenue - totalSpent;

  // Prepare chart data
  const chartData = [
    { name: 'Jan', expense: 4000, revenue: 2400 },
    { name: 'Feb', expense: 3000, revenue: 1398 },
    { name: 'Mar', expense: 2000, revenue: 9800 },
    { name: 'Apr', expense: 2780, revenue: 3908 },
    { name: 'May', expense: 1890, revenue: 4800 },
    { name: 'Jun', expense: 2390, revenue: 3800 },
    { name: 'Jul', expense: 3490, revenue: 4300 },
  ].map(item => ({ ...item, profit: item.revenue - item.expense }));

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">Welcome back to Komersh command center.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Spend" 
            value={`AED ${totalSpent.toLocaleString()}`} 
            icon={DollarSign}
            trend="+12% from last month"
            color="text-rose-400"
          />
          <StatCard 
            title="Est. Revenue" 
            value={`AED ${estimatedRevenue.toLocaleString()}`} 
            icon={TrendingUp}
            trend="+25% from last month"
            color="text-emerald-400"
          />
          <StatCard 
            title="Net Profit" 
            value={`AED ${netProfit.toLocaleString()}`} 
            icon={ArrowUpRight}
            trend="Healthy margins"
            color="text-primary"
          />
          <StatCard 
            title="Purchased Items" 
            value={purchasedProducts.length.toString()} 
            icon={Package}
            trend={`${products?.length || 0} total planned`}
            color="text-blue-400"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="glass-card border-none bg-card/40">
            <CardHeader>
              <CardTitle>Financial Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tickLine={false} axisLine={false} />
                    <YAxis stroke="#888" tickLine={false} axisLine={false} tickFormatter={(value) => `AED ${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={3} />
                    <Area type="monotone" dataKey="expense" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-none bg-card/40">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products?.slice(0, 3).map((product) => (
                  <div key={product.id} className="flex items-center gap-4 rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{product.status === 'planned' ? 'Planned purchase:' : 'Purchased:'} {product.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(product.createdAt || new Date()), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      AED {product.priceAed}
                    </div>
                  </div>
                ))}
                {expenses?.slice(0, 3).map((expense) => (
                  <div key={expense.id} className="flex items-center gap-4 rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Expense: {expense.category}</p>
                      <p className="text-xs text-muted-foreground">{expense.description}</p>
                    </div>
                    <div className="font-mono text-sm font-bold text-white">
                      - AED {expense.amount}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="glass-card border-none bg-card/40 hover:-translate-y-1 transition-transform duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
            {trend}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-1 text-white">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
