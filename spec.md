# PDF Manager

## Current State
- App has PDF upload, view, delete, search functionality
- Admin login via Internet Identity + token `786901dxnamaz`
- PDF viewer uses iframe with fallback links
- PDFs stored via blob-storage component
- Upload flow uses `ExternalBlob.fromBytes` + `actor.uploadPdf`

## Requested Changes (Diff)

### Add
- "Namaz ka tariqa" category or label support (optional, not blocking)
- Robust PDF viewer: try iframe first, show clear open-in-new-tab fallback prominently
- Upload retry mechanism with clear error feedback

### Modify
- PDF card click: open PDF directly in new tab (most reliable cross-browser approach)
- ViewerModal: show the PDF URL as a proper clickable link with a big "Kholo" button, rather than relying solely on iframe
- PDF list fetch: ensure `getAllPdfs` is called on every page load and after login, not just when actor is ready
- Upload: fix any issue where upload silently fails; show progress bar and error clearly
- Admin upload button: always visible after admin login, no extra steps

### Remove
- No features to remove

## Implementation Plan
1. Fix `PdfCard` -- clicking filename or card opens PDF in new tab directly (no modal needed, simpler and more reliable)
2. Keep ViewerModal but make iframe + Google Docs viewer + direct link all prominent with large buttons
3. Fix `useGetAllPdfs` -- ensure staleTime is 0 so PDFs always reload fresh
4. Fix upload: add better error handling, show toast with specific error, ensure admin state is fresh before upload
5. Add `refetchOnMount: "always"` to getAllPdfs query so PDFs are never stale on load
