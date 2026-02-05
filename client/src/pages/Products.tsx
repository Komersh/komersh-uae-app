import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { usePotentialProducts, useCreatePotentialProduct, useDeletePotentialProduct, useBuyPotentialProduct } from "@/hooks/use-potential-products";
import { useInventory, useSellInventory } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingCart, Package, TrendingUp, AlertTriangle, Search, ExternalLink, DollarSign, Upload, Image, Edit, X, Check } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, type Currency } from "@shared/schema";

const addProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  supplierLink: z.string().optional(),
  supplierName: z.string().optional(),
  marketplace: z.string().optional(),
  costPerUnit: z.coerce.number().min(0, "Cost is required"),
  targetSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
  status: z.string().default("researching"),
});

const buyProductSchema = z.object({
  quantity: z.coerce.number().min(1),
  unitCost: z.coerce.number().min(0),
  shippingCost: z.coerce.number().optional(),
  supplierOrderId: z.string().optional(),
  purchaseDate: z.string(),
});

const sellProductSchema = z.object({
  channel: z.string().min(1),
  quantitySold: z.coerce.number().min(1),
  sellingPricePerUnit: z.coerce.number().min(0),
  marketplaceFees: z.coerce.number().optional(),
  shippingCost: z.coerce.number().optional(),
  saleDate: z.string(),
  notes: z.string().optional(),
});

const SALES_CHANNELS = ["Amazon UAE", "Noon", "Own Website", "Direct Sale"];

export default function Products() {
  const { data: potentialProducts, isLoading: ppLoading } = usePotentialProducts();
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [buyItem, setBuyItem] = useState<any>(null);
  const [sellItem, setSellItem] = useState<any>(null);

  const filteredPotentialProducts = potentialProducts?.filter((p: any) => 
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredInventory = inventory?.filter((p: any) => 
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const lowStockItems = filteredInventory.filter((i: any) => (i.quantityAvailable || 0) <= 5 && i.status !== 'sold_out');

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Management</h1>
            <p className="text-muted-foreground mt-2">Research potential products and manage your inventory.</p>
          </div>
          <AddProductDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/20 text-blue-400">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Researching</p>
                <p className="text-2xl font-bold text-foreground">{potentialProducts?.filter((p: any) => p.status === 'researching').length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Stock</p>
                <p className="text-2xl font-bold text-foreground">{filteredInventory.reduce((sum: number, i: any) => sum + (i.quantityAvailable || 0), 0)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-yellow-500/20 text-yellow-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold text-foreground">{lowStockItems.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-none bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sold</p>
                <p className="text-2xl font-bold text-foreground">{filteredInventory.reduce((sum: number, i: any) => sum + ((i.quantity || 0) - (i.quantityAvailable || 0)), 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-10 bg-black/20 border-white/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-products"
          />
        </div>

        <Tabs defaultValue="research" className="w-full">
          <TabsList className="bg-black/20 border border-white/10 p-1 mb-6">
            <TabsTrigger value="research" className="data-[state=active]:bg-blue-600 text-muted-foreground data-[state=active]:text-white">
              Product Research ({filteredPotentialProducts.length})
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-emerald-600 text-muted-foreground data-[state=active]:text-white">
              Inventory ({filteredInventory.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="research" className="mt-0">
            <Card className="glass-card bg-card/40 border-none">
              <CardHeader>
                <CardTitle>Products Under Research</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-foreground">Product</TableHead>
                        <TableHead className="text-foreground">SKU</TableHead>
                        <TableHead className="text-foreground">Marketplace</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="text-right text-foreground">Cost</TableHead>
                        <TableHead className="text-right text-foreground">Sell Price</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ppLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredPotentialProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No products yet. Add a product to start researching.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPotentialProducts.map((item: any) => (
                          <TableRow key={item.id} className="border-border hover:bg-muted/50 transition-colors group">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-foreground font-medium">{item.name}</span>
                                {item.supplierLink && (
                                  <a href={item.supplierLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                    Supplier <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">{item.sku || '-'}</TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">{item.marketplace || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'ready_to_buy' ? 'default' : item.status === 'rejected' ? 'destructive' : 'secondary'} className={
                                item.status === 'ready_to_buy' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                                item.status === 'rejected' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' :
                                item.status === 'bought' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' :
                                'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              }>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground">
                              {item.costPerUnit ? `${item.currency || 'USD'} ${parseFloat(item.costPerUnit).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {item.targetSellingPrice ? `${item.currency || 'USD'} ${parseFloat(item.targetSellingPrice).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-emerald-400 hover:text-emerald-300"
                                  onClick={() => setBuyItem(item)}
                                  data-testid={`button-buy-${item.id}`}
                                >
                                  <ShoppingCart className="h-4 w-4" />
                                </Button>
                                <DeleteProductButton id={item.id} name={item.name} />
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

          <TabsContent value="inventory" className="mt-0">
            <Card className="glass-card bg-card/40 border-none">
              <CardHeader>
                <CardTitle>Inventory Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground">Product</TableHead>
                        <TableHead className="text-center text-foreground">In Stock</TableHead>
                        <TableHead className="text-center text-foreground">Sold</TableHead>
                        <TableHead className="text-right text-foreground">Unit Cost</TableHead>
                        <TableHead className="text-right text-foreground">Total Value</TableHead>
                        <TableHead className="text-foreground">Status</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredInventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No inventory yet. Buy products from the Research tab.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredInventory.map((item: any) => {
                          const quantityAvailable = item.quantityAvailable || 0;
                          const quantitySold = (item.quantity || 0) - quantityAvailable;
                          const isLowStock = quantityAvailable <= 5 && item.status !== 'sold_out';
                          const totalValue = parseFloat(item.unitCost || 0) * quantityAvailable;
                          return (
                            <TableRow key={item.id} className={`border-border hover:bg-muted/50 transition-colors group ${isLowStock ? 'bg-yellow-500/5' : ''}`}>
                              <TableCell>
                                <span className="text-foreground font-medium">{item.name}</span>
                              </TableCell>
                              <TableCell className="text-center font-bold text-foreground">{quantityAvailable}</TableCell>
                              <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-medium">{quantitySold}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {item.currency} {parseFloat(item.unitCost || 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-foreground">
                                {item.currency} {totalValue.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {item.status === 'sold_out' ? (
                                  <Badge className="bg-gray-500/20 text-gray-400 hover:bg-gray-500/30">Sold Out</Badge>
                                ) : isLowStock ? (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">{item.status || 'In Stock'}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary hover:bg-primary/90"
                                  onClick={() => setSellItem(item)}
                                  disabled={quantityAvailable === 0}
                                  data-testid={`button-sell-${item.id}`}
                                >
                                  <DollarSign className="h-4 w-4 mr-1" /> Sell
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <BuyProductDialog item={buyItem} onClose={() => setBuyItem(null)} />
        <SellProductDialog item={sellItem} onClose={() => setSellItem(null)} />
      </div>
    </Layout>
  );
}

function AddProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createProduct = useCreatePotentialProduct();
  
  const form = useForm<z.infer<typeof addProductSchema>>({
    resolver: zodResolver(addProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      supplierLink: "",
      supplierName: "",
      marketplace: "",
      costPerUnit: 0,
      targetSellingPrice: undefined,
      notes: "",
      currency: "USD",
      status: "researching",
    }
  });

  const onSubmit = (data: z.infer<typeof addProductSchema>) => {
    createProduct.mutate({
      name: data.name,
      supplierLink: data.supplierLink,
      supplierName: data.supplierName,
      marketplace: data.marketplace,
      costPerUnit: data.costPerUnit.toString(),
      targetSellingPrice: data.targetSellingPrice?.toString(),
      notes: data.notes,
      currency: data.currency,
      status: data.status,
    }, {
      onSuccess: () => {
        toast({ title: "Product Added", description: "Product added to research list." });
        onOpenChange(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25" data-testid="button-add-product">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Product for Research</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name *</label>
            <Input className="bg-background border-border" {...form.register("name")} data-testid="input-product-name" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU</label>
              <Input className="bg-background border-border" {...form.register("sku")} data-testid="input-product-sku" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Marketplace</label>
              <Select onValueChange={(val) => form.setValue("marketplace", val)} defaultValue="">
                <SelectTrigger className="bg-background border-border" data-testid="select-product-marketplace">
                  <SelectValue placeholder="Select marketplace" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Amazon UAE">Amazon UAE</SelectItem>
                  <SelectItem value="Noon">Noon</SelectItem>
                  <SelectItem value="Komersh.ae">Komersh.ae</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier Name</label>
              <Input className="bg-background border-border" {...form.register("supplierName")} data-testid="input-supplier-name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier Link</label>
              <Input className="bg-background border-border" {...form.register("supplierLink")} data-testid="input-supplier-link" />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select onValueChange={(val) => form.setValue("currency", val)} defaultValue="USD">
                <SelectTrigger className="bg-background border-border" data-testid="select-product-currency">
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
              <label className="text-sm font-medium">Cost Per Unit *</label>
              <Input type="number" step="0.01" className="bg-background border-border" {...form.register("costPerUnit")} data-testid="input-product-cost" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Sell Price</label>
              <Input type="number" step="0.01" className="bg-background border-border" {...form.register("targetSellingPrice")} data-testid="input-product-price" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea className="bg-background border-border resize-none" {...form.register("notes")} data-testid="input-product-notes" />
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createProduct.isPending} className="bg-primary hover:bg-primary/90" data-testid="button-submit-product">
              {createProduct.isPending ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const deleteProduct = useDeletePotentialProduct();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-red-400"
          data-testid={`button-delete-product-${id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => deleteProduct.mutate(id)}
            className="bg-destructive text-destructive-foreground"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BuyProductDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { toast } = useToast();
  const buyProduct = useBuyPotentialProduct();
  
  const form = useForm<z.infer<typeof buyProductSchema>>({
    resolver: zodResolver(buyProductSchema),
    defaultValues: {
      quantity: 1,
      unitCost: item?.costPerUnit ? parseFloat(item.costPerUnit) : 0,
      shippingCost: undefined,
      supplierOrderId: "",
      purchaseDate: new Date().toISOString().split('T')[0],
    }
  });

  if (!item) return null;

  const onSubmit = (data: z.infer<typeof buyProductSchema>) => {
    buyProduct.mutate({
      id: item.id,
      quantity: data.quantity,
      unitCost: data.unitCost.toString(),
      shippingCost: data.shippingCost?.toString(),
      supplierOrderId: data.supplierOrderId,
      purchaseDate: data.purchaseDate,
    }, {
      onSuccess: () => {
        toast({ title: "Product Purchased", description: `${data.quantity} units added to inventory.` });
        onClose();
      }
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purchase: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input type="number" min="1" className="bg-black/20 border-white/10" {...form.register("quantity")} data-testid="input-buy-quantity" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit Cost ({item.currency || 'USD'}) *</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("unitCost")} data-testid="input-buy-cost" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Shipping Cost</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("shippingCost")} data-testid="input-buy-shipping" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input type="date" className="bg-black/20 border-white/10" {...form.register("purchaseDate")} data-testid="input-buy-date" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Supplier Order ID</label>
            <Input className="bg-black/20 border-white/10" {...form.register("supplierOrderId")} data-testid="input-buy-orderid" />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={buyProduct.isPending} className="bg-emerald-600 hover:bg-emerald-700" data-testid="button-confirm-buy">
              {buyProduct.isPending ? "Purchasing..." : "Confirm Purchase"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SellProductDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { toast } = useToast();
  const sellProduct = useSellInventory();
  
  const form = useForm<z.infer<typeof sellProductSchema>>({
    resolver: zodResolver(sellProductSchema),
    defaultValues: {
      channel: "Amazon UAE",
      quantitySold: 1,
      sellingPricePerUnit: 0,
      marketplaceFees: undefined,
      shippingCost: undefined,
      saleDate: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  if (!item) return null;

  const onSubmit = (data: z.infer<typeof sellProductSchema>) => {
    if (data.quantitySold > item.quantityInStock) {
      toast({ title: "Error", description: "Cannot sell more than available stock.", variant: "destructive" });
      return;
    }
    
    sellProduct.mutate({
      id: item.id,
      channel: data.channel,
      quantitySold: data.quantitySold,
      sellingPricePerUnit: data.sellingPricePerUnit.toString(),
      marketplaceFees: data.marketplaceFees?.toString(),
      shippingCost: data.shippingCost?.toString(),
      saleDate: data.saleDate,
      notes: data.notes,
    }, {
      onSuccess: () => {
        toast({ title: "Sale Recorded", description: `${data.quantitySold} units sold successfully!` });
        onClose();
      }
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Sell: {item.productName}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">Available stock: <span className="text-white font-bold">{item.quantityInStock}</span></div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sales Channel *</label>
              <Select onValueChange={(val) => form.setValue("channel", val)} defaultValue="Amazon UAE">
                <SelectTrigger className="bg-black/20 border-white/10" data-testid="select-sell-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-white">
                  {SALES_CHANNELS.map(ch => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity *</label>
              <Input type="number" min="1" max={item.quantityInStock} className="bg-black/20 border-white/10" {...form.register("quantitySold")} data-testid="input-sell-qty" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Selling Price / Unit ({item.currency}) *</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("sellingPricePerUnit")} data-testid="input-sell-price" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sale Date</label>
              <Input type="date" className="bg-black/20 border-white/10" {...form.register("saleDate")} data-testid="input-sell-date" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Marketplace Fees</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("marketplaceFees")} data-testid="input-sell-fees" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Shipping Cost</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("shippingCost")} data-testid="input-sell-shipping" />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/10">Cancel</Button>
            <Button type="submit" disabled={sellProduct.isPending} className="bg-primary hover:bg-primary/90" data-testid="button-confirm-sell">
              {sellProduct.isPending ? "Processing..." : "Confirm Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
