import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/use-attachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Trash2, FileText, Image, File, FolderOpen, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Files() {
  const { data: attachments, isLoading } = useAttachments();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const { toast } = useToast();
  const [folder, setFolder] = useState("general");
  const [filterFolder, setFilterFolder] = useState("all");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      uploadAttachment.mutate({ file, folder }, {
        onSuccess: () => {
          toast({ title: "File Uploaded", description: `${file.name} uploaded successfully.` });
        },
        onError: () => {
          toast({ title: "Upload Failed", description: `Failed to upload ${file.name}.`, variant: "destructive" });
        }
      });
    }
    e.target.value = "";
  };

  const filteredAttachments = filterFolder === "all" 
    ? attachments 
    : attachments?.filter((a: any) => a.folder === filterFolder);

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith("image/")) return <Image className="h-5 w-5 text-blue-400" />;
    if (mimeType?.includes("pdf")) return <FileText className="h-5 w-5 text-red-400" />;
    return <File className="h-5 w-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">File Manager</h1>
            <p className="text-muted-foreground mt-2">Upload and manage your files, invoices, and documents.</p>
          </div>
          <div className="flex gap-4">
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="w-40 bg-black/20 border-white/10" data-testid="select-upload-folder">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 text-white">
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="receipts">Receipts</SelectItem>
              </SelectContent>
            </Select>
            <label htmlFor="file-upload">
              <Button asChild className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 cursor-pointer">
                <span>
                  <Upload className="mr-2 h-4 w-4" /> Upload Files
                </span>
              </Button>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleFileUpload}
                data-testid="input-file-upload"
              />
            </label>
          </div>
        </div>

        <Card className="glass-card bg-card/40 border-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Files
            </CardTitle>
            <Select value={filterFolder} onValueChange={setFilterFolder}>
              <SelectTrigger className="w-40 bg-black/20 border-white/10" data-testid="select-filter-folder">
                <SelectValue placeholder="Filter by folder" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10 text-white">
                <SelectItem value="all">All Folders</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="products">Products</SelectItem>
                <SelectItem value="receipts">Receipts</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white">File</TableHead>
                    <TableHead className="text-white">Folder</TableHead>
                    <TableHead className="text-white">Size</TableHead>
                    <TableHead className="text-white">Uploaded</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">Loading files...</TableCell>
                    </TableRow>
                  ) : !filteredAttachments || filteredAttachments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No files uploaded yet. Click "Upload Files" to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttachments.map((file: any) => (
                      <TableRow key={file.id} className="border-white/10 hover:bg-white/5 transition-colors group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getFileIcon(file.mimeType)}
                            <span className="text-white font-medium">{file.originalName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-white/5 text-white ring-white/10 capitalize">
                            {file.folder}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatFileSize(file.size || 0)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(file.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-blue-400"
                              onClick={() => window.open(file.url, '_blank')}
                              data-testid={`button-download-${file.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-red-400"
                              onClick={() => deleteAttachment.mutate(file.id)}
                              data-testid={`button-delete-${file.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>
    </Layout>
  );
}
