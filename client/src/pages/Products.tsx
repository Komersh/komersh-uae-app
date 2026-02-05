import { useState, useEffect } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/ui/Layout";
import { usePotentialProducts, useCreatePotentialProduct, useUpdatePotentialProduct, useDeletePotentialProduct, useBuyPotentialProduct } from "@/hooks/use-potential-products";
import { useInventory, useSellInventory, useDeleteInventory } from "@/hooks/use-inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ShoppingCart, Package, TrendingUp, AlertTriangle, Search, ExternalLink, DollarSign, Upload, Image, Edit, X, Check, Star } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES, EXCHANGE_RATES, type Currency } from "@shared/schema";

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

const SALES_CHANNELS = ["Amazon UAE", "Amazon Germany", "Noon", "Own Website", "Direct Sale"];

export default function Products() {
  const { data: potentialProducts, isLoading: ppLoading } = usePotentialProducts();
  const { data: inventory, isLoading: invLoading } = useInventory();
  const { data: users } = useQuery<any[]>({ queryKey: ['/api/users'] });
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [buyItem, setBuyItem] = useState<any>(null);
  const [sellItem, setSellItem] = useState<any>(null);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editInventory, setEditInventory] = useState<any>(null);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [activeTab, setActiveTab] = useState("research");

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const user = users?.find((u: any) => u.id === userId);
    if (!user) return null;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return null;
  };

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

        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-10 bg-background border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-products"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Display in:</span>
            <Select value={currency} onValueChange={(val) => setCurrency(val as Currency)}>
              <SelectTrigger className="w-24 bg-background border-border" data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-gradient-to-r from-card to-muted rounded-xl border border-border shadow-inner">
          <button
            onClick={() => setActiveTab("research")}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "research"
                ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
            data-testid="tab-research"
          >
            <Search className="h-4 w-4" />
            <span>Product Research</span>
            <Badge variant="secondary" className={`${activeTab === "research" ? "bg-white/20 text-white" : "bg-muted"}`}>
              {filteredPotentialProducts.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 flex items-center justify-center gap-3 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
              activeTab === "inventory"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
            data-testid="tab-inventory"
          >
            <Package className="h-4 w-4" />
            <span>Inventory</span>
            <Badge variant="secondary" className={`${activeTab === "inventory" ? "bg-white/20 text-white" : "bg-muted"}`}>
              {filteredInventory.length}
            </Badge>
          </button>
        </div>

        {activeTab === "research" && (
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
                        <TableHead className="text-foreground">Rating</TableHead>
                        <TableHead className="text-right text-foreground">Cost</TableHead>
                        <TableHead className="text-right text-foreground">Sell Price</TableHead>
                        <TableHead className="text-foreground">Added By</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ppLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
                        </TableRow>
                      ) : filteredPotentialProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No products yet. Add a product to start researching.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPotentialProducts.map((item: any) => (
                          <TableRow key={item.id} className="border-border hover:bg-muted/50 transition-colors group">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover border border-border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center border border-border">
                                    <Image className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-foreground font-medium">{item.name}</span>
                                  {item.supplierLink && (
                                    <a href={item.supplierLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                      Supplier <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
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
                            <TableCell>
                              <StarRating productId={item.id} rating={item.buyRating || 0} />
                            </TableCell>
                            <TableCell className="text-right font-mono text-foreground">
                              {item.costPerUnit ? `${item.currency || 'USD'} ${parseFloat(item.costPerUnit).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">
                              {item.targetSellingPrice ? `${item.currency || 'USD'} ${parseFloat(item.targetSellingPrice).toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell>
                              {getUserName(item.createdByUserId) ? (
                                <span className="text-sm text-muted-foreground">{getUserName(item.createdByUserId)}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground/50">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => setEditProduct(item)}
                                  data-testid={`button-edit-product-${item.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
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
        )}

        {activeTab === "inventory" && (
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
                                <div className="flex items-center gap-3">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover border border-border" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center border border-border">
                                      <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <span className="text-foreground font-medium">{item.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-bold text-foreground">{quantityAvailable}</TableCell>
                              <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-medium">{quantitySold}</TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                {formatAmount(convertCurrency(item.unitCost || 0, item.currency || 'USD', currency))}
                              </TableCell>
                              <TableCell className="text-right font-mono text-foreground">
                                {formatAmount(convertCurrency(totalValue, item.currency || 'USD', currency))}
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
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditInventory(item)}
                                    data-testid={`button-edit-inventory-${item.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90"
                                    onClick={() => setSellItem(item)}
                                    disabled={quantityAvailable === 0}
                                    data-testid={`button-sell-${item.id}`}
                                  >
                                    <DollarSign className="h-4 w-4 mr-1" /> Sell
                                  </Button>
                                  <DeleteInventoryButton id={item.id} name={item.name} />
                                </div>
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
        )}

        <BuyProductDialog item={buyItem} onClose={() => setBuyItem(null)} />
        <SellProductDialog item={sellItem} onClose={() => setSellItem(null)} />
        <EditProductDialog item={editProduct} onClose={() => setEditProduct(null)} />
        <EditInventoryDialog item={editInventory} onClose={() => setEditInventory(null)} />
      </div>
    </Layout>
  );
}

function AddProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProduct = useCreatePotentialProduct();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: z.infer<typeof addProductSchema>) => {
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
      onSuccess: async (createdProduct: any) => {
        if (imageFile && createdProduct?.id) {
          const formData = new FormData();
          formData.append('image', imageFile);
          try {
            await fetch(`/api/potential-products/${createdProduct.id}/image`, {
              method: 'POST',
              body: formData,
              credentials: 'include',
            });
            queryClient.invalidateQueries({ queryKey: ['/api/potential-products'] });
          } catch (err) {
            console.error('Failed to upload image:', err);
          }
        }
        toast({ title: "Product Added", description: "Product added to research list." });
        onOpenChange(false);
        form.reset();
        setImageFile(null);
        setImagePreview(null);
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
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Image</label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-product-image"
                  />
                </label>
              )}
            </div>
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

function StarRating({ productId, rating }: { productId: number; rating: number }) {
  const queryClient = useQueryClient();
  const updateProduct = useUpdatePotentialProduct();
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const handleClick = (star: number) => {
    updateProduct.mutate({ id: productId, buyRating: star }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/potential-products'] });
      }
    });
  };

  return (
    <div className="flex gap-0.5" data-testid={`star-rating-${productId}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => handleClick(star)}
          onMouseEnter={() => setHoveredStar(star)}
          onMouseLeave={() => setHoveredStar(null)}
          className="p-0.5 transition-colors"
          data-testid={`star-${productId}-${star}`}
        >
          <Star
            className={`h-4 w-4 ${
              (hoveredStar !== null ? star <= hoveredStar : star <= rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
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

function DeleteInventoryButton({ id, name }: { id: number; name: string }) {
  const deleteInventory = useDeleteInventory();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-red-400"
          data-testid={`button-delete-inventory-${id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{name}" from inventory? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={() => deleteInventory.mutate(id)}
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
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Purchase: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantity *</label>
              <Input type="number" min="1" className="bg-background border-border text-foreground" {...form.register("quantity")} data-testid="input-buy-quantity" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Unit Cost ({item.currency || 'USD'}) *</label>
              <Input type="number" step="0.01" className="bg-background border-border text-foreground" {...form.register("unitCost")} data-testid="input-buy-cost" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shipping Cost</label>
              <Input type="number" step="0.01" className="bg-background border-border text-foreground" {...form.register("shippingCost")} data-testid="input-buy-shipping" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Purchase Date</label>
              <Input type="date" className="bg-background border-border text-foreground" {...form.register("purchaseDate")} data-testid="input-buy-date" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Supplier Order ID</label>
            <Input className="bg-background border-border text-foreground" {...form.register("supplierOrderId")} data-testid="input-buy-orderid" />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
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
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Sell: {item.productName}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground mb-4">Available stock: <span className="text-foreground font-bold">{item.quantityInStock}</span></div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sales Channel *</label>
              <Select onValueChange={(val) => form.setValue("channel", val)} defaultValue="Amazon UAE">
                <SelectTrigger className="bg-background border-border text-foreground" data-testid="select-sell-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {SALES_CHANNELS.map(ch => (
                    <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantity *</label>
              <Input type="number" min="1" max={item.quantityInStock} className="bg-background border-border text-foreground" {...form.register("quantitySold")} data-testid="input-sell-qty" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Selling Price / Unit ({item.currency}) *</label>
              <Input type="number" step="0.01" className="bg-background border-border text-foreground" {...form.register("sellingPricePerUnit")} data-testid="input-sell-price" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sale Date</label>
              <Input type="date" className="bg-background border-border text-foreground" {...form.register("saleDate")} data-testid="input-sell-date" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Marketplace Fees</label>
              <Input type="number" step="0.01" className="bg-background border-border text-foreground" {...form.register("marketplaceFees")} data-testid="input-sell-fees" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Shipping Cost</label>
              <Input type="number" step="0.01" className="bg-background border-border text-foreground" {...form.register("shippingCost")} data-testid="input-sell-shipping" />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={sellProduct.isPending} data-testid="button-confirm-sell">
              {sellProduct.isPending ? "Processing..." : "Confirm Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  supplierLink: z.string().optional(),
  supplierName: z.string().optional(),
  marketplace: z.string().optional(),
  costPerUnit: z.coerce.number().min(0),
  targetSellingPrice: z.coerce.number().optional(),
  notes: z.string().optional(),
  currency: z.string(),
  status: z.string(),
});

function EditProductDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { toast } = useToast();
  const updateProduct = useUpdatePotentialProduct();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const form = useForm<z.infer<typeof editProductSchema>>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: item?.name || "",
      supplierLink: item?.supplierLink || "",
      supplierName: item?.supplierName || "",
      marketplace: item?.marketplace || "",
      costPerUnit: item?.costPerUnit ? parseFloat(item.costPerUnit) : 0,
      targetSellingPrice: item?.targetSellingPrice ? parseFloat(item.targetSellingPrice) : undefined,
      notes: item?.notes || "",
      currency: item?.currency || "USD",
      status: item?.status || "researching",
    }
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name || "",
        supplierLink: item.supplierLink || "",
        supplierName: item.supplierName || "",
        marketplace: item.marketplace || "",
        costPerUnit: item.costPerUnit ? parseFloat(item.costPerUnit) : 0,
        targetSellingPrice: item.targetSellingPrice ? parseFloat(item.targetSellingPrice) : undefined,
        notes: item.notes || "",
        currency: item.currency || "USD",
        status: item.status || "researching",
      });
      setImagePreview(item.imageUrl || null);
      setImageFile(null);
    }
  }, [item?.id]);

  if (!item) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !item) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const res = await fetch(`/api/potential-products/${item.id}/image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      toast({ title: "Image Uploaded", description: "Product image updated." });
      setImageFile(null);
    } catch {
      toast({ title: "Error", description: "Failed to upload image.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof editProductSchema>) => {
    if (imageFile) {
      await uploadImage();
    }
    updateProduct.mutate({
      id: item.id,
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
        toast({ title: "Product Updated", description: "Product details saved." });
        onClose();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update product.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Image</label>
            <div className="flex items-center gap-4">
              {(imagePreview || item.imageUrl) && (
                <img 
                  src={imagePreview || item.imageUrl} 
                  alt="Product" 
                  className="w-20 h-20 rounded-md object-cover border border-border"
                />
              )}
              <div className="flex-1">
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="bg-background border-border"
                  data-testid="input-product-image"
                />
                <p className="text-xs text-muted-foreground mt-1">Upload an image for this product</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name *</label>
              <Input className="bg-background border-border" {...form.register("name")} data-testid="input-edit-name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Supplier Name</label>
              <Input className="bg-background border-border" {...form.register("supplierName")} data-testid="input-edit-supplier" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Supplier Link</label>
            <Input className="bg-background border-border" {...form.register("supplierLink")} data-testid="input-edit-link" />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select onValueChange={(val) => form.setValue("status", val)} defaultValue={form.getValues("status")}>
                <SelectTrigger className="bg-background border-border" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="researching">Researching</SelectItem>
                  <SelectItem value="ready_to_buy">Ready to Buy</SelectItem>
                  <SelectItem value="bought">Bought</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Marketplace</label>
              <Input className="bg-background border-border" {...form.register("marketplace")} data-testid="input-edit-marketplace" />
            </div>
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
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cost Per Unit</label>
              <Input type="number" step="0.01" className="bg-background border-border" {...form.register("costPerUnit")} data-testid="input-edit-cost" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Selling Price</label>
              <Input type="number" step="0.01" className="bg-background border-border" {...form.register("targetSellingPrice")} data-testid="input-edit-target" />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea className="bg-background border-border" {...form.register("notes")} data-testid="input-edit-notes" />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updateProduct.isPending || uploading} data-testid="button-save-product">
              {updateProduct.isPending || uploading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const editInventorySchema = z.object({
  warehouseLocation: z.string().optional(),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
  status: z.string(),
});

function EditInventoryDialog({ item, onClose }: { item: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const form = useForm<z.infer<typeof editInventorySchema>>({
    resolver: zodResolver(editInventorySchema),
    defaultValues: {
      warehouseLocation: item?.warehouseLocation || "",
      trackingNumber: item?.trackingNumber || "",
      notes: item?.notes || "",
      status: item?.status || "ordered",
    }
  });

  // Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        warehouseLocation: item.warehouseLocation || "",
        trackingNumber: item.trackingNumber || "",
        notes: item.notes || "",
        status: item.status || "ordered",
      });
      setImagePreview(item.imageUrl || null);
      setImageFile(null);
    }
  }, [item?.id]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (!item) return null;

  const onSubmit = async (data: z.infer<typeof editInventorySchema>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Update failed');
      
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await fetch(`/api/inventory/${item.id}/image`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
      toast({ title: "Inventory Updated", description: "Inventory details saved." });
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to update inventory.", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Inventory: {item.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select onValueChange={(val) => form.setValue("status", val)} defaultValue={form.getValues("status")}>
              <SelectTrigger className="bg-background border-border" data-testid="select-inventory-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="sold_out">Sold Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Warehouse Location</label>
            <Input className="bg-background border-border" {...form.register("warehouseLocation")} data-testid="input-inventory-location" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Tracking Number</label>
            <Input className="bg-background border-border" {...form.register("trackingNumber")} data-testid="input-inventory-tracking" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <Textarea className="bg-background border-border" {...form.register("notes")} data-testid="input-inventory-notes" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Image</label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-md object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-20 h-20 border border-dashed border-border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-inventory-image"
                  />
                </label>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={updating} data-testid="button-save-inventory">
              {updating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
