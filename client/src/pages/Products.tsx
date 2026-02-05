import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { usePotentialProducts, useCreatePotentialProduct, useDeletePotentialProduct, useBuyPotentialProduct } from "@/hooks/use-potential-products";
import { useInventory, useSellInventory } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingCart, Package, TrendingUp, AlertTriangle, Search, ExternalLink, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, type Currency } from "@shared/schema";

const addProductSchema = z.object({
  name: z.string().min(1),
  asin: z.string().optional(),
  sourceUrl: z.string().optional(),
  category: z.string().optional(),
  estimatedCost: z.coerce.number().optional(),
  potentialSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  currency: z.string().default("USD"),
  researchStatus: z.string().default("researching"),
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
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.asin?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredInventory = inventory?.filter((p: any) => 
    !search || p.productName?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const lowStockItems = filteredInventory.filter((i: any) => i.quantityInStock <= (i.minStockThreshold || 5));

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Product Management</h1>
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
                <p className="text-2xl font-bold text-white">{potentialProducts?.filter((p: any) => p.researchStatus === 'researching').length || 0}</p>
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
                <p className="text-2xl font-bold text-white">{filteredInventory.reduce((sum: number, i: any) => sum + i.quantityInStock, 0)}</p>
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
                <p className="text-2xl font-bold text-white">{lowStockItems.length}</p>
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
                <p className="text-2xl font-bold text-white">{filteredInventory.reduce((sum: number, i: any) => sum + i.quantitySold, 0)}</p>
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
                        <TableHead className="text-white">Product</TableHead>
                        <TableHead className="text-white">ASIN</TableHead>
                        <TableHead className="text-white">Category</TableHead>
                        <TableHead className="text-white">Status</TableHead>
                        <TableHead className="text-right text-white">Est. Cost</TableHead>
                        <TableHead className="text-right text-white">Sell Price</TableHead>
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
                          <TableRow key={item.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-white font-medium">{item.name}</span>
                                {item.sourceUrl && (
                                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                    Source <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">{item.asin || '-'}</TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">{item.category || '-'}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.researchStatus === 'approved' ? 'default' : item.researchStatus === 'rejected' ? 'destructive' : 'secondary'} className={
                                item.researchStatus === 'approved' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' :
                                item.researchStatus === 'rejected' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' :
                                'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              }>
                                {item.researchStatus}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-white">
                              {item.estimatedCost ? `${item.currency || 'USD'} ${parseFloat(item.estimatedCost).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-400">
                              {item.potentialSellingPrice ? `${item.currency || 'USD'} ${parseFloat(item.potentialSellingPrice).toFixed(2)}` : '-'}
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
                                <DeleteProductButton id={item.id} />
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
                    <TableHeader className="bg-white/5">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white">Product</TableHead>
                        <TableHead className="text-center text-white">In Stock</TableHead>
                        <TableHead className="text-center text-white">Sold</TableHead>
                        <TableHead className="text-right text-white">Unit Cost</TableHead>
                        <TableHead className="text-right text-white">Total Value</TableHead>
                        <TableHead className="text-white">Status</TableHead>
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
                          const isLowStock = item.quantityInStock <= (item.minStockThreshold || 5);
                          const totalValue = parseFloat(item.unitCost) * item.quantityInStock;
                          return (
                            <TableRow key={item.id} className={`border-white/10 hover:bg-white/5 transition-colors group ${isLowStock ? 'bg-yellow-500/5' : ''}`}>
                              <TableCell>
                                <span className="text-white font-medium">{item.productName}</span>
                              </TableCell>
                              <TableCell className="text-center font-bold text-white">{item.quantityInStock}</TableCell>
                              <TableCell className="text-center text-emerald-400 font-medium">{item.quantitySold}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {item.currency} {parseFloat(item.unitCost).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-white">
                                {item.currency} {totalValue.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {isLowStock ? (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Low Stock
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">In Stock</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="sm"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary hover:bg-primary/90 text-white"
                                  onClick={() => setSellItem(item)}
                                  disabled={item.quantityInStock === 0}
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
      asin: "",
      sourceUrl: "",
      category: "",
      estimatedCost: undefined,
      potentialSellingPrice: undefined,
      notes: "",
      currency: "USD",
      researchStatus: "researching",
    }
  });

  const onSubmit = (data: z.infer<typeof addProductSchema>) => {
    createProduct.mutate({
      ...data,
      estimatedCost: data.estimatedCost?.toString(),
      potentialSellingPrice: data.potentialSellingPrice?.toString(),
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
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25" data-testid="button-add-product">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Product for Research</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Name *</label>
            <Input className="bg-black/20 border-white/10" {...form.register("name")} data-testid="input-product-name" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ASIN</label>
              <Input className="bg-black/20 border-white/10" {...form.register("asin")} data-testid="input-product-asin" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input className="bg-black/20 border-white/10" {...form.register("category")} data-testid="input-product-category" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Source URL</label>
            <Input className="bg-black/20 border-white/10" {...form.register("sourceUrl")} data-testid="input-product-url" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <Select onValueChange={(val) => form.setValue("currency", val)} defaultValue="USD">
                <SelectTrigger className="bg-black/20 border-white/10" data-testid="select-product-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10 text-white">
                  {CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Est. Cost</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("estimatedCost")} data-testid="input-product-cost" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sell Price</label>
              <Input type="number" step="0.01" className="bg-black/20 border-white/10" {...form.register("potentialSellingPrice")} data-testid="input-product-price" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea className="bg-black/20 border-white/10 resize-none" {...form.register("notes")} data-testid="input-product-notes" />
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

function DeleteProductButton({ id }: { id: number }) {
  const deleteProduct = useDeletePotentialProduct();
  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-8 w-8 text-muted-foreground hover:text-red-400"
      onClick={() => deleteProduct.mutate(id)}
      data-testid={`button-delete-product-${id}`}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

function BuyProductDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { toast } = useToast();
  const buyProduct = useBuyPotentialProduct();
  
  const form = useForm<z.infer<typeof buyProductSchema>>({
    resolver: zodResolver(buyProductSchema),
    defaultValues: {
      quantity: 1,
      unitCost: item?.estimatedCost ? parseFloat(item.estimatedCost) : 0,
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
