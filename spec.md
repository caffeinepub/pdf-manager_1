# PDF Manager

## Current State
- Admin can upload/delete PDFs; users can only view/open them
- Login via Internet Identity; admin token `786901dxnamaz` is set in environment
- On first login, a setup dialog asks for admin token or "Continue as User"
- `isCallerAdmin` query internally calls `getUserRole` which calls `Runtime.trap` when the caller is not yet registered — this causes the query to fail silently and return `false`, hiding the Upload button even for the actual admin

## Requested Changes (Diff)

### Add
- Nothing new

### Modify
- Fix `isCallerAdmin` (and `hasPermission`) to return `false` (not trap) when caller is not yet registered in the access-control state
- Keep all existing features intact

### Remove
- Nothing

## Implementation Plan
1. Regenerate Motoko backend with `isAdmin` and `hasPermission` using safe null-check instead of `Runtime.trap` for unregistered callers
2. No frontend changes needed — existing setup dialog flow is correct
