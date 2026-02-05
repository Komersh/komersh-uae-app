import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/use-attachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Upload, Trash2, FileText, Image, File, FolderOpen, Download, Plus, FolderPlus, FileSpreadsheet, FileVideo, FileAudio } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_FOLDERS = ["general", "invoices", "products", "receipts"];

export default function Files() {
  const { data: attachments, isLoading } = useAttachments();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const { toast } = useToast();
  const [folder, setFolder] = useState("general");
  const [filterFolder, setFilterFolder] = useState("all");
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const allFolders = [...DEFAULT_FOLDERS, ...customFolders];

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

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const sanitized = newFolderName.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (allFolders.includes(sanitized)) {
      toast({ title: "Folder exists", description: "A folder with that name already exists.", variant: "destructive" });
      return;
    }
    setCustomFolders([...customFolders, sanitized]);
    setFolder(sanitized);
    setNewFolderName("");
    setIsCreateFolderOpen(false);
    toast({ title: "Folder Created", description: `Created folder: ${sanitized}` });
  };

  const filteredAttachments = filterFolder === "all" 
    ? attachments 
    : attachments?.filter((a: any) => a.folder === filterFolder);

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith("image/")) return <Image className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
    if (mimeType?.includes("pdf")) return <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />;
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || mimeType?.includes("csv")) return <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (mimeType?.startsWith("video/")) return <FileVideo className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
    if (mimeType?.startsWith("audio/")) return <FileAudio className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileCounts = () => {
    if (!attachments) return { total: 0, images: 0, documents: 0 };
    return {
      total: attachments.length,
      images: attachments.filter((a: any) => a.mimeType?.startsWith("image/")).length,
      documents: attachments.filter((a: any) => a.mimeType?.includes("pdf") || a.mimeType?.includes("document")).length,
    };
  };

  const counts = getFileCounts();

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">File Manager</h1>
            <p className="text-muted-foreground mt-2">Upload and manage your files, invoices, and documents.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-create-folder">
                  <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Folder Name</label>
                    <Input 
                      className="bg-background border-border" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g., contracts, photos..."
                      data-testid="input-folder-name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateFolder} data-testid="button-confirm-create-folder">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger className="w-40 bg-background border-border" data-testid="select-upload-folder">
                <SelectValue placeholder="Folder" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {allFolders.map(f => (
                  <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label htmlFor="file-upload">
              <Button asChild className="shadow-lg shadow-primary/25 cursor-pointer">
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
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.mp4,.mp3,.txt"
                data-testid="input-file-upload"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/20 text-primary">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold text-foreground">{counts.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-accent/50 text-accent-foreground">
                <Image className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Images</p>
                <p className="text-2xl font-bold text-foreground">{counts.images}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/40">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-destructive/20 text-destructive">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Documents</p>
                <p className="text-2xl font-bold text-foreground">{counts.documents}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card/40">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Files
            </CardTitle>
            <Select value={filterFolder} onValueChange={setFilterFolder}>
              <SelectTrigger className="w-40 bg-background border-border" data-testid="select-filter-folder">
                <SelectValue placeholder="Filter by folder" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Folders</SelectItem>
                {allFolders.map(f => (
                  <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-foreground">File</TableHead>
                    <TableHead className="text-foreground">Folder</TableHead>
                    <TableHead className="text-foreground">Size</TableHead>
                    <TableHead className="text-foreground">Uploaded</TableHead>
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
                      <TableRow key={file.id} className="border-border hover:bg-muted/50 transition-colors group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getFileIcon(file.mimeType)}
                            <span className="text-foreground font-medium">{file.originalName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset bg-muted text-muted-foreground ring-border capitalize">
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
                              onClick={() => window.open(file.url, '_blank')}
                              data-testid={`button-download-${file.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
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
