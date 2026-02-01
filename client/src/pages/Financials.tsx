import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/use-expenses";
import { useProducts } from "@/hooks/use-products";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertExpenseSchema.extend({
  amount: z.coerce.number(), // Coerce string to number
  date: z.string(), // Date picker returns string
});

export default function Financials() {
  const { data: expenses, isLoading } = useExpenses();
  const { data: products } = useProducts();
  const deleteExpense = useDeleteExpense();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  const purchasedProducts = products?.filter(p => p.status === 'purchased') || [];

  // Combine expenses and product costs for a master ledger view
  const ledger = [
    ...(expenses || []).map(e => ({ ...e, type: 'Expense' })),
    ...purchasedProducts.map(p => ({
      id: `prod-${p.id}`,
      category: 'Inventory',
      description: `Purchased: ${p.name} (Qty: ${p.quantity})`,
      amount: (Number(p.priceAed) * (p.quantity || 1)) + Number(p.shippingCost || 0),
      date: p.purchaseDate || p.createdAt,
      type: 'Product Purchase'
    }))
  ].sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());

  const filteredLedger = ledger.filter(item => 
    item.description?.toLowerCase().includes(search.toLowerCase()) || 
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Financial Records</h1>
            <p className="text-muted-foreground mt-2">Track every dirham spent on your empire.</p>
          </div>
          <AddExpenseDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>

        <Card className="glass-card bg-card/40 border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Master Ledger</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-8 bg-black/20 border-white/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" className="border-white/10 bg-black/20">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white">Date</TableHead>
                    <TableHead className="text-white">Category</TableHead>
                    <TableHead className="text-white">Description</TableHead>
                    <TableHead className="text-right text-white">Amount (AED)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading financial data...</TableCell>
                    </TableRow>
                  ) : filteredLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found.</TableCell>
                    </TableRow>
                  ) : (
                    filteredLedger.map((item) => (
                      <TableRow key={item.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                        <TableCell className="font-mono text-muted-foreground">
                          {format(new Date(item.date || new Date()), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                            item.category === 'Inventory' ? 'bg-blue-400/10 text-blue-400 ring-blue-400/30' :
                            item.category === 'Marketing' ? 'bg-purple-400/10 text-purple-400 ring-purple-400/30' :
                            'bg-gray-400/10 text-gray-400 ring-gray-400/30'
                          }`}>
                            {item.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-white">{item.description}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-white">
                          {Number(item.amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {String(item.id).startsWith('prod-') ? null : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteExpense.mutate(item.id as number)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function AddExpenseDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "Marketing",
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: ""
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createExpense.mutate(data, {
      onSuccess: () => {
        toast({ title: "Expense Added", description: "Your expense has been recorded." });
        onOpenChange(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add expense.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
          <Plus className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select 
              onValueChange={(val) => form.setValue("category", val)} 
              defaultValue={form.getValues("category")}
            >
              <SelectTrigger className="bg-black/20 border-white/10">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 text-white">
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Inventory">Inventory</SelectItem>
                <SelectItem value="Software">Software</SelectItem>
                <SelectItem value="Shipping">Shipping</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount (AED)</label>
            <Input 
              type="number" 
              className="bg-black/20 border-white/10" 
              {...form.register("amount")} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input 
              type="date" 
              className="bg-black/20 border-white/10" 
              {...form.register("date")} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input 
              className="bg-black/20 border-white/10" 
              {...form.register("description")} 
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createExpense.isPending} className="bg-primary hover:bg-primary/90">
              {createExpense.isPending ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
