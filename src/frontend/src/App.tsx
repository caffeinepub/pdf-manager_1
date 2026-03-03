import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import {
  BookOpen,
  Calendar,
  CloudUpload,
  ExternalLink,
  Eye,
  FileText,
  HardDrive,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Search,
  Shield,
  ShieldCheck,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PdfEntry } from "./backend";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import {
  useCallerUserRole,
  useDeletePdf,
  useGetAllPdfs,
  useInitializeRole,
  useIsAdmin,
  useSearchPdfs,
  useUploadPdf,
} from "./hooks/useQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTimestamp(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFileInitials(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .slice(0, 2)
    .toUpperCase();
}

// ─── PDF Card ─────────────────────────────────────────────────────────────────
interface PdfCardProps {
  entry: PdfEntry;
  index: number;
  isAdmin: boolean;
  onView: (entry: PdfEntry) => void;
  onDelete: (entry: PdfEntry) => void;
}

function PdfCard({ entry, index, isAdmin, onView, onDelete }: PdfCardProps) {
  const hue = (70 + index * 47) % 360;
  const pdfUrl = entry.blob.getDirectURL();

  const handleOpenPdf = useCallback(() => {
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  }, [pdfUrl]);

  return (
    <article
      data-ocid={`pdf.item.${index + 1}`}
      className="group relative bg-card border border-border rounded-lg overflow-hidden card-hover fade-in"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Top colored strip */}
      <div
        className="h-1 w-full"
        style={{ background: `oklch(0.78 0.18 ${hue})` }}
      />

      <div className="p-5">
        {/* Icon + initials */}
        <div className="flex items-start justify-between mb-4">
          <button
            type="button"
            className="w-12 h-12 rounded-md flex items-center justify-center text-sm font-display font-bold tracking-tight cursor-pointer"
            style={{
              background: `oklch(0.22 0.04 ${hue})`,
              color: `oklch(0.78 0.18 ${hue})`,
            }}
            onClick={handleOpenPdf}
            title="PDF Kholo"
          >
            {getFileInitials(entry.filename)}
          </button>

          {/* Action buttons — visible on hover */}
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {/* View in modal button */}
            <button
              type="button"
              className="p-1.5 rounded-md bg-accent/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => onView(entry)}
              title="Viewer mein kholo"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            {/* Open in new tab — visible to all */}
            <button
              type="button"
              data-ocid={`pdf.open_button.${index + 1}`}
              className="p-1.5 rounded-md bg-primary/20 hover:bg-primary/40 text-primary/80 hover:text-primary transition-colors"
              onClick={handleOpenPdf}
              title="Naye tab mein kholo"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Delete button — admin only */}
            {isAdmin && (
              <button
                type="button"
                data-ocid={`pdf.delete_button.${index + 1}`}
                className="p-1.5 rounded-md bg-destructive/20 hover:bg-destructive/40 text-destructive/80 hover:text-destructive transition-colors"
                onClick={() => onDelete(entry)}
                title="Delete PDF"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filename — clickable to open PDF directly */}
        <button
          type="button"
          className="text-left w-full cursor-pointer"
          onClick={handleOpenPdf}
          title="PDF Kholo"
        >
          <p className="font-display font-semibold text-foreground text-sm leading-tight mb-3 line-clamp-2 hover:text-primary transition-colors">
            {entry.filename.replace(/\.pdf$/i, "")}
            <span className="text-muted-foreground font-normal">.pdf</span>
          </p>
        </button>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatFileSize(entry.fileSize)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatTimestamp(entry.uploadTimestamp)}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────
interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  uploadProgress: number | null;
  isUploading: boolean;
}

function UploadZone({
  onFileSelected,
  uploadProgress,
  isUploading,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.type === "application/pdf") {
        onFileSelected(file);
      } else {
        toast.error("Only PDF files are supported");
      }
    },
    [onFileSelected],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
      e.target.value = "";
    },
    [onFileSelected],
  );

  return (
    <label
      data-ocid="pdf.dropzone"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={[
        "relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-200 select-none",
        !isUploading ? "cursor-pointer" : "cursor-default",
        isDragging
          ? "border-primary bg-primary/10 scale-[1.01]"
          : "border-border hover:border-primary/50 hover:bg-accent/30",
        isUploading ? "pointer-events-none" : "",
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />

      {isUploading ? (
        <div
          className="flex flex-col items-center gap-4 w-full max-w-xs"
          data-ocid="pdf.loading_state"
        >
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center amber-glow">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <div className="w-full space-y-2 text-center">
            <p className="text-sm font-body text-foreground font-medium">
              Uploading...
            </p>
            <Progress value={uploadProgress ?? 0} className="h-1.5" />
            <p className="text-xs text-muted-foreground font-mono">
              {uploadProgress ?? 0}%
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className={[
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors duration-200",
              isDragging ? "bg-primary/30" : "bg-accent",
            ].join(" ")}
          >
            <CloudUpload
              className={[
                "w-7 h-7 transition-colors duration-200",
                isDragging ? "text-primary" : "text-muted-foreground",
              ].join(" ")}
            />
          </div>
          <div>
            <p className="text-sm font-body text-foreground font-medium">
              {isDragging ? "Drop PDF here" : "Drag & drop or click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Only .pdf files are accepted
            </p>
          </div>
        </div>
      )}
    </label>
  );
}

// ─── PDF Viewer Modal ─────────────────────────────────────────────────────────
interface ViewerModalProps {
  entry: PdfEntry | null;
  onClose: () => void;
}

function ViewerModal({ entry, onClose }: ViewerModalProps) {
  const url = entry ? entry.blob.getDirectURL() : null;
  const [visible, setVisible] = useState(false);
  const [useGoogleDocs, setUseGoogleDocs] = useState(false);

  useEffect(() => {
    if (entry) {
      setUseGoogleDocs(false);
      // Tiny delay so the CSS transition kicks in after mount
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [entry]);

  if (!entry) return null;

  const googleDocsUrl = url
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    : null;
  const iframeSrc = useGoogleDocs ? googleDocsUrl : url;

  const handleOpenInNewTab = () => {
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={[
        "fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      data-ocid="pdf.viewer_modal"
    >
      {/* Viewer header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground truncate">
              {entry.filename}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatFileSize(entry.fileSize)} ·{" "}
              {formatTimestamp(entry.uploadTimestamp)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          {/* Primary CTA — big prominent open button */}
          {url && (
            <Button
              data-ocid="pdf.viewer_open_button"
              onClick={handleOpenInNewTab}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold amber-glow"
              size="sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden xs:inline">PDF Kholo</span>
              <span className="hidden sm:inline"> (Naye Tab Mein)</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-ocid="pdf.viewer_close_button"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Close</span>
          </Button>
        </div>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 min-h-0 flex flex-col">
        {iframeSrc ? (
          <>
            <iframe
              key={iframeSrc}
              src={iframeSrc}
              className="w-full flex-1 border-0"
              title={entry.filename}
              style={{ minHeight: 0 }}
            />
            {/* Fallback bar — for browsers that block iframe PDF rendering */}
            <div className="flex flex-wrap items-center justify-center gap-3 py-2 px-4 border-t border-border bg-card/80 text-xs text-muted-foreground flex-shrink-0">
              <span>PDF nahi dikh raha?</span>
              {!useGoogleDocs ? (
                <button
                  type="button"
                  onClick={() => setUseGoogleDocs(true)}
                  className="text-primary hover:underline font-medium"
                >
                  Google Docs se try karein
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setUseGoogleDocs(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Direct link try karein
                </button>
              )}
              <span>·</span>
              {url && (
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="text-primary hover:underline font-medium"
                >
                  Naye tab mein kholo
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────
interface DeleteDialogProps {
  entry: PdfEntry | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteDialog({
  entry,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="max-w-sm bg-card border-border"
        data-ocid="pdf.delete_dialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
            <DialogTitle className="font-display text-lg">
              Delete PDF
            </DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-sm text-muted-foreground font-body">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-foreground">
            {entry?.filename ?? "this file"}
          </span>
          ? This action cannot be undone.
        </p>
        <DialogFooter className="gap-2 mt-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
            data-ocid="pdf.delete_cancel_button"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            data-ocid="pdf.delete_confirm_button"
            className="flex-1"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Setup Dialog ───────────────────────────────────────────────────────
interface AdminSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

function AdminSetupDialog({ open, onClose }: AdminSetupDialogProps) {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializeRole = useInitializeRole();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token.trim()) {
        setError("Token zaroori hai");
        return;
      }
      setError(null);
      try {
        // When token is non-empty, mutation stores in sessionStorage and reloads
        // the page — so onClose/toast below may never fire. That's fine.
        await initializeRole.mutateAsync(token.trim());
        toast.success("Admin setup complete! Ab PDF upload kar sakte hain.");
        setToken("");
        onClose();
      } catch {
        setError("Galat token. Please check karein aur dobara try karein.");
      }
    },
    [token, initializeRole, onClose],
  );

  const handleContinueAsUser = useCallback(async () => {
    setError(null);
    try {
      await initializeRole.mutateAsync("");
      toast.success("User ke tor par login ho gaye.");
      onClose();
    } catch {
      setError("Kuch galat hua. Dobara try karein.");
    }
  }, [initializeRole, onClose]);

  const isPending = initializeRole.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent
        className="max-w-md bg-card border-border"
        data-ocid="admin.setup_dialog"
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center amber-glow">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg">
                Manager Login
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-body mt-0.5">
                Apni role select karein
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2">
          <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
            Agar aap{" "}
            <span className="text-foreground font-semibold">manager</span> hain
            toh neeche admin token enter karein. Agar aap user hain toh koi
            token ki zaroorat nahi — seedha continue karein.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="admin-token"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide font-body"
              >
                Admin Secret Token
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="admin-token"
                  data-ocid="admin.token_input"
                  type={showToken ? "text" : "password"}
                  placeholder="786901dxnamaz"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setError(null);
                  }}
                  disabled={isPending}
                  className="pl-9 pr-10 font-mono text-sm bg-background border-border"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showToken ? "Hide token" : "Show token"}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>

            {error && (
              <p
                data-ocid="admin.error_state"
                className="text-xs text-destructive font-body flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </p>
            )}

            <Button
              type="submit"
              data-ocid="admin.setup_submit_button"
              disabled={isPending || !token.trim()}
              className="w-full font-display font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 amber-glow"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {token.trim()
                    ? "Admin ke tor par login ho raha hai…"
                    : "Setting up…"}
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Manager ke tor par login karein
                </>
              )}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground font-body">
                ya phir
              </span>
            </div>
          </div>

          <Button
            type="button"
            data-ocid="admin.continue_as_user_button"
            variant="outline"
            disabled={isPending}
            onClick={handleContinueAsUser}
            className="w-full font-display gap-2 border-border text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            User ke tor par continue karein (Sirf Dekhna)
          </Button>
        </div>

        <DialogFooter className="pt-0">
          <p className="text-xs text-muted-foreground/60 font-body text-center w-full">
            Manager token enter karein ya user ke tor par seedha continue
            karein.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── PWA Install Hook ─────────────────────────────────────────────────────────
function useInstallPrompt() {
  const [prompt, setPrompt] = useState<Event | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!prompt) return;
    // @ts-ignore
    const result = await prompt.prompt();
    // @ts-ignore
    if (result?.outcome === "accepted") {
      setInstalled(true);
      setPrompt(null);
    }
  }, [prompt]);

  return { canInstall: !!prompt && !installed, installed, install };
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewingEntry, setViewingEntry] = useState<PdfEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<PdfEntry | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const { canInstall, installed, install } = useInstallPrompt();
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();

  const { isFetching: isActorFetching } = useActor();
  const { data: allPdfs, isLoading } = useGetAllPdfs();
  const { data: searchResults } = useSearchPdfs(searchTerm);
  const { data: isAdmin = false } = useIsAdmin();
  const {
    data: userRole,
    isFetching: isRoleFetching,
    isLoading: isRoleLoading,
  } = useCallerUserRole();
  const uploadMutation = useUploadPdf();
  const deleteMutation = useDeletePdf();

  // Show setup dialog when user logs in but has not been registered yet
  useEffect(() => {
    if (!identity) {
      setShowSetupDialog(false);
      return;
    }
    // Wait until the actor is ready AND the role query has actually completed
    // isRoleLoading = true means query hasn't finished its first fetch yet
    // isActorFetching = true means actor (and thus identity) is still being created
    if (isActorFetching || isRoleFetching || isRoleLoading) return;
    // userRole === null  → query ran and returned null (unregistered user)
    // userRole === undefined → query hasn't run yet — don't show dialog prematurely
    if (userRole === null) {
      setShowSetupDialog(true);
    }
  }, [identity, userRole, isRoleFetching, isRoleLoading, isActorFetching]);

  const displayedPdfs = searchTerm.trim()
    ? (searchResults ?? [])
    : (allPdfs ?? []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setUploadProgress(0);
      try {
        await uploadMutation.mutateAsync({
          file,
          onProgress: (pct) => setUploadProgress(pct),
        });
        toast.success(`"${file.name}" uploaded successfully`);
        setShowUploadZone(false);
      } catch (err) {
        console.error("Upload failed:", err);
        const message =
          err instanceof Error ? err.message : "Unknown error occurred";
        toast.error(`Upload failed: ${message}`);
      } finally {
        setUploadProgress(null);
      }
    },
    [uploadMutation],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingEntry) return;
    try {
      await deleteMutation.mutateAsync(deletingEntry.id);
      toast.success(`"${deletingEntry.filename}" deleted`);
      setDeletingEntry(null);
    } catch {
      toast.error("Delete failed. Please try again.");
    }
  }, [deletingEntry, deleteMutation]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Toaster position="top-right" theme="dark" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center amber-glow">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              PDF<span className="text-primary">Vault</span>
            </span>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              data-ocid="pdf.search_input"
              placeholder="Search PDFs…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-background border-border font-body text-sm"
            />
          </div>

          {/* Auth button — Login/Logout */}
          {isInitializing || isLoggingIn ? (
            <div
              data-ocid="auth.loading_state"
              className="flex-shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-2"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="hidden sm:inline">
                {isInitializing ? "Loading…" : "Logging in…"}
              </span>
            </div>
          ) : identity ? (
            <Button
              data-ocid="auth.logout_button"
              variant="ghost"
              size="sm"
              onClick={clear}
              className="flex-shrink-0 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Logout</span>
            </Button>
          ) : (
            <Button
              data-ocid="auth.login_button"
              variant="outline"
              size="sm"
              onClick={login}
              className="flex-shrink-0 gap-1.5 font-display font-semibold border-primary/40 text-primary hover:bg-primary/10"
            >
              <LogIn className="w-4 h-4" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}

          {/* Install App button — shown when PWA install is available */}
          {canInstall && (
            <Button
              data-ocid="app.install_button"
              variant="outline"
              onClick={install}
              className="flex-shrink-0 font-display font-semibold gap-2 border-primary/40 text-primary hover:bg-primary/10"
              title="App seedha download karein — Play Store ki zaroorat nahi"
            >
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">App Install Karein</span>
              <span className="sm:hidden">Install</span>
            </Button>
          )}

          {/* Installed badge */}
          {installed && (
            <span className="flex-shrink-0 flex items-center gap-1.5 text-xs text-primary font-medium px-2 py-1 rounded-md bg-primary/10">
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Installed</span>
            </span>
          )}

          {/* Upload CTA — admin only */}
          {isAdmin && (
            <Button
              data-ocid="pdf.upload_button"
              onClick={() => setShowUploadZone((v) => !v)}
              className="flex-shrink-0 font-display font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 amber-glow"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload PDF</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          )}
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Upload Zone Panel — admin only, collapsible */}
        {isAdmin && showUploadZone && (
          <div className="mb-6 upload-zone-enter">
            <UploadZone
              onFileSelected={handleFileSelected}
              uploadProgress={uploadProgress}
              isUploading={uploadMutation.isPending}
            />
          </div>
        )}

        {/* Stats bar */}
        {!isLoading && (allPdfs?.length ?? 0) > 0 && (
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-mono font-semibold text-foreground">
                {displayedPdfs.length}
              </span>
              <span>
                {searchTerm ? "result" : "PDF"}
                {displayedPdfs.length !== 1 ? "s" : ""}
                {searchTerm && ` for "${searchTerm}"`}
              </span>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div
            data-ocid="pdf.loading_state"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
              <div
                key={key}
                className="bg-card border border-border rounded-lg overflow-hidden animate-pulse"
              >
                <div className="h-1 bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="w-12 h-12 bg-muted rounded-md" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-2 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayedPdfs.length === 0 && (
          <div
            data-ocid="pdf.empty_state"
            className="flex flex-col items-center justify-center py-24 text-center fade-in"
          >
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-2xl bg-accent flex items-center justify-center">
                <FileText className="w-12 h-12 text-muted-foreground/40" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center amber-glow">
                <Upload className="w-5 h-5 text-primary" />
              </div>
            </div>
            <h2 className="font-display font-bold text-2xl text-foreground mb-2">
              {searchTerm ? "No PDFs found" : "Your vault is empty"}
            </h2>
            <p className="text-muted-foreground font-body text-sm max-w-xs mb-6">
              {searchTerm
                ? `No PDFs match "${searchTerm}". Try a different search.`
                : isAdmin
                  ? "Upload your first PDF to get started. Click the Upload button or drag a file here."
                  : "No PDFs are available yet. Check back soon."}
            </p>
            {!searchTerm && isAdmin && (
              <Button
                onClick={() => setShowUploadZone(true)}
                className="font-display font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 amber-glow"
              >
                <Upload className="w-4 h-4" />
                Upload your first PDF
              </Button>
            )}
          </div>
        )}

        {/* PDF Grid */}
        {!isLoading && displayedPdfs.length > 0 && (
          <div
            data-ocid="pdf.list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {displayedPdfs.map((entry, index) => (
              <PdfCard
                key={entry.id}
                entry={entry}
                index={index}
                isAdmin={isAdmin}
                onView={setViewingEntry}
                onDelete={setDeletingEntry}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card/50 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-muted-foreground font-body">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 transition-colors"
          >
            caffeine.ai
          </a>
        </div>
      </footer>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <ViewerModal entry={viewingEntry} onClose={() => setViewingEntry(null)} />
      <DeleteDialog
        entry={deletingEntry}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingEntry(null)}
      />
      <AdminSetupDialog
        open={showSetupDialog}
        onClose={() => setShowSetupDialog(false)}
      />
    </div>
  );
}
