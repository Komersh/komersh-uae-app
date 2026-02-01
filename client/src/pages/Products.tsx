import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ExternalLink, PackageCheck, Trash2, ShoppingBag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

// Schema with coercions for form handling
const formSchema = insertProductSchema.extend({
  priceAed: z.coerce.number(),
  shippingCost: z.coerce.number(),
  quantity: z.coerce.number(),
});

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handlePurchase = (id: number) => {
    updateProduct.mutate({ 
      id, 
      status: 'purchased',
      purchaseDate: new Date().toISOString().split('T')[0]
    }, {
      onSuccess: () => toast({ title: "Marked as Purchased", description: "Added to financial records." })
    });
  };

  const plannedProducts = products?.filter(p => p.status === 'planned') || [];
  const purchasedProducts = products?.filter(p => p.status === 'purchased') || [];

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Products Manager</h1>
            <p className="text-muted-foreground mt-2">Inventory planning and purchasing tracker.</p>
          </div>
          <AddProductDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </div>

        <Tabs defaultValue="planned" className="w-full">
          <TabsList className="bg-black/20 border border-white/10 p-1 mb-8">
            <TabsTrigger value="planned" className="data-[state=active]:bg-primary text-muted-foreground data-[state=active]:text-white">
              Planned ({plannedProducts.length})
            </TabsTrigger>
            <TabsTrigger value="purchased" className="data-[state=active]:bg-emerald-600 text-muted-foreground data-[state=active]:text-white">
              Purchased ({purchasedProducts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planned" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isLoading ? (
                <p className="text-muted-foreground">Loading products...</p>
              ) : plannedProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-white font-medium">No products planned</p>
                  <Button variant="link" onClick={() => setIsAddOpen(true)} className="text-primary">Add your first product</Button>
                </div>
              ) : (
                plannedProducts.map(product => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onPurchase={() => handlePurchase(product.id)}
                    onDelete={() => deleteProduct.mutate(product.id)}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="purchased" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {purchasedProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  isPurchased
                  onDelete={() => deleteProduct.mutate(product.id)}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function ProductCard({ product, onPurchase, onDelete, isPurchased }: any) {
  return (
    <Card className="group relative overflow-hidden bg-card/40 border-white/10 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
      <div className="aspect-[4/3] w-full overflow-hidden bg-white/5 relative">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 opacity-20" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className={isPurchased ? "bg-emerald-500/80" : "bg-primary/80"}>
            {isPurchased ? "Purchased" : "Planned"}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-white line-clamp-1" title={product.name}>{product.name}</h3>
          <p className="text-emerald-400 font-bold whitespace-nowrap">AED {product.priceAed}</p>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
          {product.description || "No description provided."}
        </p>

        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex flex-col">
            <span className="uppercase tracking-wider opacity-60">Qty</span>
            <span className="text-white font-medium">{product.quantity}</span>
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="uppercase tracking-wider opacity-60">Shipping</span>
            <span className="text-white font-medium">AED {product.shippingCost}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-auto">
          {product.link && (
            <Button variant="outline" size="icon" className="shrink-0 border-white/10 hover:bg-white/10" onClick={() => window.open(product.link, '_blank')}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          {!isPurchased && (
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={onPurchase}>
              <PackageCheck className="mr-2 h-4 w-4" /> Buy
            </Button>
          )}

          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0 text-muted-foreground hover:text-red-400 hover:bg-red-400/10" 
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddProductDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      priceAed: 0,
      shippingCost: 0,
      quantity: 1,
      status: "planned",
      description: "",
      imageUrl: "",
      link: ""
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createProduct.mutate(data, {
      onSuccess: () => {
        toast({ title: "Product Added", description: "Successfully added to planned purchases." });
        onOpenChange(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add product.", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25">
          <Plus className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-white/10 text-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input className="bg-black/20 border-white/10" {...form.register("name")} placeholder="e.g. Wireless Headphones" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Price (AED)</label>
              <Input type="number" className="bg-black/20 border-white/10" {...form.register("priceAed")} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Shipping Cost (AED)</label>
              <Input type="number" className="bg-black/20 border-white/10" {...form.register("shippingCost")} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input type="number" className="bg-black/20 border-white/10" {...form.register("quantity")} />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Product Link</label>
              <Input className="bg-black/20 border-white/10" {...form.register("link")} placeholder="https://amazon.ae/..." />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Image URL</label>
              <Input className="bg-black/20 border-white/10" {...form.register("imageUrl")} placeholder="https://..." />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Description</label>
              <Input className="bg-black/20 border-white/10" {...form.register("description")} />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createProduct.isPending} className="bg-primary hover:bg-primary/90 w-full md:w-auto">
              {createProduct.isPending ? "Adding..." : "Add Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
