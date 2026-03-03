import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalBlob, type PdfEntry } from "../backend";
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
    staleTime: 60_000,
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
    enabled: !!actor && !isFetching,
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
      if (!actor) throw new Error("Actor not ready");
      const id = crypto.randomUUID();
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(onProgress);
      await actor.uploadPdf(id, file.name, BigInt(file.size), blob);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdfs"] });
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
