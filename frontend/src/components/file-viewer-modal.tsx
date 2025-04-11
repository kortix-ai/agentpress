"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  File, 
  Folder, 
  FolderOpen, 
  Upload,
  X,
  Download,
  Copy
} from "lucide-react";
import { listSandboxFiles, getSandboxFileContent, createSandboxFile, type FileInfo } from "@/lib/api";
import { toast } from "sonner";

interface FileViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sandboxId: string;
  onSelectFile?: (path: string, content: string) => void;
}

export function FileViewerModal({ 
  open,
  onOpenChange,
  sandboxId, 
  onSelectFile
}: FileViewerModalProps) {
  const [workspaceFiles, setWorkspaceFiles] = useState<FileInfo[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [binaryFileUrl, setBinaryFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'text' | 'image' | 'pdf' | 'binary'>('text');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load files when the modal opens or sandbox ID changes
  useEffect(() => {
    if (open && sandboxId) {
      loadWorkspaceFiles();
    }
  }, [open, sandboxId]);

  // Function to load files from /workspace
  const loadWorkspaceFiles = async () => {
    if (!sandboxId) return;
    
    setIsLoadingFiles(true);
    try {
      const files = await listSandboxFiles(sandboxId, "/workspace");
      setWorkspaceFiles(files);
    } catch (error) {
      console.error("Failed to load workspace files:", error);
      toast.error("Failed to load workspace files");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Determine file type based on extension
  const getFileType = (filename: string): 'text' | 'image' | 'pdf' | 'binary' => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'];
    if (imageExtensions.includes(extension)) {
      return 'image';
    }
    
    if (extension === 'pdf') {
      return 'pdf';
    }
    
    const textExtensions = [
      'txt', 'md', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 
      'java', 'c', 'cpp', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'sh', 'yml', 
      'yaml', 'toml', 'xml', 'csv', 'sql'
    ];
    if (textExtensions.includes(extension)) {
      return 'text';
    }
    
    return 'binary';
  };

  // Handle file click to view content
  const handleFileClick = async (file: FileInfo) => {
    if (file.is_dir) return;
    
    setSelectedFile(file.path);
    setIsLoadingContent(true);
    setFileContent(null);
    setBinaryFileUrl(null);
    
    try {
      // Determine file type based on extension
      const fileType = getFileType(file.path);
      setFileType(fileType);
      
      const content = await getSandboxFileContent(sandboxId, file.path);
      
      // Force certain file types to be treated as text
      if (fileType === 'text') {
        // For text files (including markdown), always try to render as text
        if (typeof content === 'string') {
          setFileContent(content);
        } else if (content instanceof Blob) {
          // If we got a Blob for a text file, convert it to text
          const text = await content.text();
          setFileContent(text);
        }
      } else if (fileType === 'image' || fileType === 'pdf') {
        // For images and PDFs, create a blob URL to render them
        if (content instanceof Blob) {
          const url = URL.createObjectURL(content);
          setBinaryFileUrl(url);
        } else if (typeof content === 'string') {
          try {
            // For base64 content or binary text, create a blob
            const blob = new Blob([content]);
            const url = URL.createObjectURL(blob);
            setBinaryFileUrl(url);
          } catch (e) {
            console.error("Failed to create blob URL:", e);
            setFileType('text');
            setFileContent(content);
          }
        }
      } else {
        // For other binary files
        if (content instanceof Blob) {
          const url = URL.createObjectURL(content);
          setBinaryFileUrl(url);
        } else if (typeof content === 'string') {
          setFileContent("[Binary file]");
          
          try {
            const blob = new Blob([content]);
            const url = URL.createObjectURL(blob);
            setBinaryFileUrl(url);
          } catch (e) {
            console.error("Failed to create blob URL:", e);
            setFileContent(content);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load file content:", error);
      toast.error("Failed to load file content");
      setFileContent(null);
      setBinaryFileUrl(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Clean up blob URLs on unmount or when they're no longer needed
  useEffect(() => {
    return () => {
      if (binaryFileUrl) {
        URL.revokeObjectURL(binaryFileUrl);
      }
    };
  }, [binaryFileUrl]);

  // Handle file upload
  const handleFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process the file upload
  const processFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!sandboxId || !event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    const fileType = getFileType(file.name);
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      if (!e.target?.result) return;
      
      try {
        // For text files
        let content: string;
        if (typeof e.target.result === 'string') {
          content = e.target.result;
        } else {
          // For binary files, convert to base64
          const buffer = e.target.result as ArrayBuffer;
          content = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        }
        
        const filePath = `/workspace/${file.name}`;
        await createSandboxFile(sandboxId, filePath, content);
        toast.success(`File uploaded: ${file.name}`);
        
        // Refresh file list
        loadWorkspaceFiles();
      } catch (error) {
        console.error("File upload failed:", error);
        toast.error("Failed to upload file");
      }
    };
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error("File size exceeds 10MB limit");
      return;
    }
    
    // Use different reader method based on file type
    if (fileType === 'text') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    
    // Reset the input
    event.target.value = '';
  };

  // Handle insert into message
  const handleSelectFile = () => {
    if (selectedFile && fileContent && onSelectFile && typeof fileContent === 'string') {
      onSelectFile(selectedFile, fileContent);
      onOpenChange(false);
    }
  };

  // Copy file content to clipboard
  const handleCopyContent = () => {
    if (!fileContent) return;
    
    navigator.clipboard.writeText(fileContent)
      .then(() => toast.success("File content copied to clipboard"))
      .catch(() => toast.error("Failed to copy content"));
  };

  // Render file content based on type
  const renderFileContent = () => {
    if (isLoadingContent) {
      return (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      );
    }
    
    if (!selectedFile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <File className="h-10 w-10 mb-2 opacity-30" />
          <p className="text-sm">Select a file to view its contents</p>
        </div>
      );
    }
    
    if (fileType === 'text' && fileContent) {
      return (
        <pre className="text-xs font-mono whitespace-pre-wrap break-words overflow-auto max-h-full">
          {fileContent}
        </pre>
      );
    }
    
    if (fileType === 'image' && binaryFileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <img 
            src={binaryFileUrl} 
            alt={selectedFile} 
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }
    
    if (fileType === 'pdf' && binaryFileUrl) {
      return (
        <iframe 
          src={binaryFileUrl} 
          className="w-full h-full border-0" 
          title={selectedFile}
        />
      );
    }
    
    if (binaryFileUrl) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <File className="h-16 w-16 opacity-50" />
          <p className="text-sm text-center">This is a binary file and cannot be previewed</p>
          <a
            href={binaryFileUrl}
            download={selectedFile.split('/').pop()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            Download File
          </a>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <File className="h-10 w-10 mb-2 opacity-30" />
        <p className="text-sm">No preview available</p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[80vh] max-h-[700px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Workspace Files</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row h-full overflow-hidden">
          {/* File browser sidebar */}
          <div className="w-full sm:w-64 border-r flex flex-col h-full">
            <div className="p-2 flex items-center justify-between border-b">
              <h3 className="text-sm font-medium">/workspace</h3>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={loadWorkspaceFiles}
                  disabled={isLoadingFiles}
                  title="Refresh files"
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleFileUpload}
                  title="Upload file"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={processFileUpload}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {isLoadingFiles ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : workspaceFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <File className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-xs text-center">No files in workspace folder</p>
                </div>
              ) : (
                <div className="p-1">
                  {workspaceFiles.map((file) => (
                    <Button
                      key={file.path}
                      variant={selectedFile === file.path ? "secondary" : "ghost"}
                      size="sm"
                      className="w-full justify-start h-8 mb-1 text-xs"
                      onClick={() => handleFileClick(file)}
                    >
                      {file.is_dir ? (
                        <Folder className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      ) : (
                        <File className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                      )}
                      <span className="truncate">{file.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* File content pane */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between border-b p-2">
              <h3 className="text-sm font-medium truncate">
                {selectedFile ? selectedFile.split('/').pop() : 'Select a file to view'}
              </h3>
              {selectedFile && (fileContent || binaryFileUrl) && (
                <div className="flex gap-1">
                  {fileType === 'text' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCopyContent}
                      title="Copy content"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                  {binaryFileUrl && (
                    <a
                      href={binaryFileUrl}
                      download={selectedFile.split('/').pop()}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSelectFile && handleSelectFile()}
                    title="Insert into message"
                    disabled={!onSelectFile}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-muted/30">
              {renderFileContent()}
            </div>
            
            {onSelectFile && selectedFile && fileContent && (
              <div className="border-t p-3 flex justify-end">
                <Button onClick={handleSelectFile}>
                  Insert into message
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 