import { useState, useRef } from "react";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useCategories, useUploadPhoto, useImportExcel, type ExcelImportResult } from "@/hooks/use-products";
import { useRole } from "@/hooks/use-role";
import { api } from "@shared/routes";
import { Plus, Search, Trash2, Box, Loader2, Upload, ImageIcon, Filter, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Pencil, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Products() {
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { canManageSku } = useRole();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);
  const [isImportResultOpen, setIsImportResultOpen] = useState(false);
  const importExcel = useImportExcel();
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importExcel.mutate(file, {
        onSuccess: (result) => {
          setImportResult(result);
          setIsImportResultOpen(true);
        },
      });
      e.target.value = "";
    }
  };

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-2">Manage your inventory catalog and stock levels.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search SKU or Name..."
              className="pl-9 w-full md:w-64 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-products"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40 bg-white" data-testid="select-category-filter">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageSku && (
            <>
              <Button
                variant="outline"
                onClick={() => window.open(api.excel.template.path, "_blank")}
                data-testid="button-download-template"
              >
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
              <Button
                variant="outline"
                onClick={() => excelInputRef.current?.click()}
                disabled={importExcel.isPending}
                data-testid="button-import-excel"
              >
                {importExcel.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                )}
                Import Excel
              </Button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelUpload}
                data-testid="input-excel-file"
              />
              <CreateProductDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
            </>
          )}
        </div>
      </div>

      <ImportResultDialog
        result={importResult}
        open={isImportResultOpen}
        onOpenChange={setIsImportResultOpen}
      />

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts?.length === 0 ? (
          <div className="p-16 text-center">
            <Box className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Products Found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or add a new product.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="px-6 py-4 font-medium text-muted-foreground">Photo</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">SKU</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Product Name</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Category</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground text-right">Stock</th>
                  {canManageSku && (
                    <th className="px-6 py-4 font-medium text-muted-foreground text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredProducts?.map((product) => (
                  editingId === product.id ? (
                    <EditProductRow
                      key={product.id}
                      product={product}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={product.id} className="hover:bg-muted/20 transition-colors group" data-testid={`row-product-${product.id}`}>
                      <td className="px-6 py-4">
                        <ProductPhoto productId={product.id} photoUrl={product.photoUrl} canUpload={canManageSku} />
                      </td>
                      <td className="px-6 py-4 font-mono font-medium text-foreground">{product.sku}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{product.category || "-"}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={product.currentStock < 10 ? "text-orange-600 font-bold" : "text-foreground"}>
                          {product.currentStock}
                        </span>
                      </td>
                      {canManageSku && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground"
                              onClick={() => setEditingId(product.id)}
                              data-testid={`button-edit-product-${product.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <DeleteProductButton id={product.id} name={product.name} />
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditProductRow({ product, onCancel, onSaved }: { product: any; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(product.name);
  const [currentStock, setCurrentStock] = useState(product.currentStock);
  const updateProduct = useUpdateProduct();

  const handleSave = () => {
    updateProduct.mutate(
      { id: product.id, name, currentStock },
      { onSuccess: onSaved }
    );
  };

  return (
    <tr className="bg-primary/5" data-testid={`row-edit-product-${product.id}`}>
      <td className="px-6 py-4">
        <ProductPhoto productId={product.id} photoUrl={product.photoUrl} canUpload={false} />
      </td>
      <td className="px-6 py-4 font-mono font-medium text-foreground">{product.sku}</td>
      <td className="px-6 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white"
          data-testid={`input-edit-name-${product.id}`}
        />
      </td>
      <td className="px-6 py-4 text-muted-foreground">{product.category || "-"}</td>
      <td className="px-6 py-3 text-right">
        <Input
          type="number"
          value={currentStock}
          onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
          className="bg-white w-24 ml-auto text-right"
          data-testid={`input-edit-stock-${product.id}`}
        />
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={updateProduct.isPending}
            data-testid={`button-save-edit-${product.id}`}
          >
            {updateProduct.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-green-600" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            data-testid={`button-cancel-edit-${product.id}`}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ProductPhoto({ productId, photoUrl, canUpload }: { productId: number; photoUrl: string | null; canUpload: boolean }) {
  const uploadPhoto = useUploadPhoto();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto.mutate({ productId, file });
    }
  };

  if (photoUrl) {
    return (
      <div className="relative group/photo w-10 h-10">
        <img src={photoUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-border/50" />
        {canUpload && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity"
              data-testid={`button-reupload-photo-${productId}`}
            >
              <Upload className="w-4 h-4 text-white" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </>
        )}
      </div>
    );
  }

  if (!canUpload) {
    return (
      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
        <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-10 h-10 rounded-lg border border-dashed border-border bg-muted/20 flex items-center justify-center hover:bg-muted/40 transition-colors"
        disabled={uploadPhoto.isPending}
        data-testid={`button-upload-photo-${productId}`}
      >
        {uploadPhoto.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

const createFormSchema = insertProductSchema.omit({ userId: true, photoUrl: true });

function CreateProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createProduct = useCreateProduct();

  const form = useForm<z.infer<typeof createFormSchema>>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      category: "",
      description: "",
      currentStock: 0,
    },
  });

  const onSubmit = (data: z.infer<typeof createFormSchema>) => {
    createProduct.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g. ITEM-001" {...field} data-testid="input-sku" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input placeholder="Electronics" {...field} value={field.value || ""} data-testid="input-category" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Wireless Headphones" {...field} data-testid="input-product-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Stock</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid="input-initial-stock"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Details about the product..." {...field} value={field.value || ""} data-testid="input-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createProduct.isPending} data-testid="button-submit-product">
                {createProduct.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Product
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ImportResultDialog({ result, open, onOpenChange }: { result: ExcelImportResult | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!result) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Hasil Import Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Berhasil</div>
                <div className="text-lg font-bold text-green-700 dark:text-green-400" data-testid="text-import-success-count">{result.imported}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <div className="text-sm text-muted-foreground">Dilewati</div>
                <div className="text-lg font-bold text-orange-700 dark:text-orange-400" data-testid="text-import-skipped-count">{result.skipped}</div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Detail Error:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50" data-testid={`text-import-error-${i}`}>
                    <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <span>
                      <strong>Baris {err.row}:</strong> {err.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} data-testid="button-close-import-result">Tutup</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const deleteProduct = useDeleteProduct();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid={`button-delete-product-${id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Product?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => deleteProduct.mutate(id)}
            data-testid="button-confirm-delete"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
