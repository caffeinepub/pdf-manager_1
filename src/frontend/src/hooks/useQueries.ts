import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob, type PdfEntry, type UserRole } from "../backend";
import { useActor } from "./useActor";

// ─── Query: Is Caller Admin ────────────────────────────────────────────────────
export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      try {
        return await actor.isCallerAdmin();
      } catch {
        return false;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
  });
}

// ─── Query: Get Caller User Role ───────────────────────────────────────────────
export function useCallerUserRole() {
  const { actor, isFetching } = useActor();
  return useQuery<UserRole | null>({
    queryKey: ["callerUserRole"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCallerUserRole();
      } catch {
        // Throws when user is not registered
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    retry: false,
  });
}

// ─── Mutation: Initialize Access Control (Admin Setup) ────────────────────────
export function useInitializeRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor._initializeAccessControlWithSecret(token);
    },
    onSuccess: () => {
      // Invalidate and immediately refetch so isAdmin and userRole reflect the
      // newly registered role without waiting for the next stale check.
      queryClient.invalidateQueries({ queryKey: ["isAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["callerUserRole"] });
      queryClient.refetchQueries({ queryKey: ["isAdmin"] });
      queryClient.refetchQueries({ queryKey: ["callerUserRole"] });
    },
  });
}

// ─── Query: Get all PDFs ───────────────────────────────────────────────────────
export function useGetAllPdfs() {
  const { actor, isFetching } = useActor();
  return useQuery<PdfEntry[]>({
    queryKey: ["pdfs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPdfs();
    },
    // Public query — only needs actor to be ready, no identity required
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// ─── Query: Search PDFs ────────────────────────────────────────────────────────
export function useSearchPdfs(searchTerm: string) {
  const { actor, isFetching } = useActor();
  return useQuery<PdfEntry[]>({
    queryKey: ["pdfs", "search", searchTerm],
    queryFn: async () => {
      if (!actor) return [];
      if (!searchTerm.trim()) return actor.getAllPdfs();
      return actor.searchPdfs(searchTerm);
    },
    enabled: !!actor && !isFetching,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// ─── Mutation: Upload PDF ──────────────────────────────────────────────────────
export function useUploadPdf() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress: (pct: number) => void;
    }) => {
      if (!actor) throw new Error("Actor not ready — please try again");
      try {
        const id = crypto.randomUUID();
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const blob =
          ExternalBlob.fromBytes(bytes).withUploadProgress(onProgress);
        await actor.uploadPdf(id, file.name, BigInt(file.size), blob);
        return id;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : String(err ?? "Unknown error");
        throw new Error(`Upload failed: ${msg}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfs"] });
      queryClient.refetchQueries({ queryKey: ["pdfs"] });
    },
  });
}

// ─── Mutation: Delete PDF ──────────────────────────────────────────────────────
export function useDeletePdf() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!actor) throw new Error("Actor not ready");
      await actor.deletePdf(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfs"] });
    },
  });
}
