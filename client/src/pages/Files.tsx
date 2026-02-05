import { useState } from "react";
import { Layout } from "@/components/ui/Layout";
import { useAttachments, useUploadAttachment, useDeleteAttachment } from "@/hooks/use-attachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Trash2, FileText, Image, File, FolderOpen, Download, FolderPlus, FileSpreadsheet, FileVideo, FileAudio, ChevronRight, ArrowLeft, Folder } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_FOLDERS = ["general", "invoices", "products", "receipts"];

export default function Files() {
  const { data: attachments, isLoading } = useAttachments();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const { toast } = useToast();
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const attachmentFolders = attachments?.map((a: any) => a.folder).filter(Boolean) || [];
  const uniqueAttachmentFolders = [...new Set(attachmentFolders)] as string[];
  const customFolders = uniqueAttachmentFolders.filter(f => !DEFAULT_FOLDERS.includes(f));
  const allFolders = [...DEFAULT_FOLDERS, ...customFolders];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const uploadFolder = currentFolder || "general";
    for (const file of Array.from(files)) {
      uploadAttachment.mutate({ file, folder: uploadFolder }, {
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
    setCurrentFolder(sanitized);
    setNewFolderName("");
    setIsCreateFolderOpen(false);
    toast({ title: "Folder Created", description: `Now viewing folder: ${sanitized}. Upload files to save it.` });
  };

  const currentFolderFiles = currentFolder 
    ? attachments?.filter((a: any) => a.folder === currentFolder)
    : [];

  const getFolderFileCount = (folder: string) => {
    return attachments?.filter((a: any) => a.folder === folder).length || 0;
  };

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

        {!currentFolder ? (
          <Card className="bg-card/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Folders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allFolders.map((folder) => {
                  const fileCount = getFolderFileCount(folder);
                  return (
                    <button
                      key={folder}
                      onClick={() => setCurrentFolder(folder)}
                      className="flex flex-col items-center p-6 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer group"
                      data-testid={`folder-${folder}`}
                    >
                      <Folder className="h-12 w-12 text-primary mb-3 group-hover:scale-110 transition-transform" />
                      <span className="text-foreground font-medium capitalize">{folder}</span>
                      <span className="text-xs text-muted-foreground mt-1">{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/40">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setCurrentFolder(null)}
                  data-testid="button-back-to-folders"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <CardTitle className="flex items-center gap-2 capitalize">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  {currentFolder}
                  <Badge variant="secondary" className="ml-2">{currentFolderFiles?.length || 0} files</Badge>
                </CardTitle>
              </div>
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
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading files...</div>
              ) : !currentFolderFiles || currentFolderFiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>This folder is empty.</p>
                  <p className="text-sm mt-1">Click "Upload Files" to add files to this folder.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentFolderFiles.map((file: any) => (
                    <div 
                      key={file.id}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground font-medium truncate">{file.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size || 0)} - {format(new Date(file.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(file.url, '_blank')}
                          data-testid={`button-download-${file.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`button-delete-${file.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete File</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{file.originalName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteAttachment.mutate(file.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
