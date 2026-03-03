# PDF Manager

## Current State

App has:
- PDF upload/view/delete system (admin only can upload/delete, public can view)
- Internet Identity login
- Admin setup dialog that asks for a token to become admin
- Admin token hardcoded as "786901dxnamaz"
- PWA install support

Known broken behavior:
- `useActor.ts` (protected file, cannot edit) automatically calls `_initializeAccessControlWithSecret(adminToken)` on every login using URL hash param `caffeineAdminToken`. Since the URL never has this param, it passes empty string `""` which either silently fails or sets user as regular user without showing the setup dialog.
- After login, `userRole` query returns null (unregistered) but the setup dialog may not show or token entry fails because `_initializeAccessControlWithSecret` was already called with empty string.
- PDF list shows empty or broken.
- Admin token dialog shows but "Setup as Admin" fails.

## Requested Changes (Diff)

### Add
- A mechanism to pass the admin token `786901dxnamaz` via URL hash so `useActor.ts` auto-initializes correctly when admin logs in
- Clear instructions overlay or a persistent "Admin Login" path that uses URL param approach
- On app load, if URL contains `#caffeineAdminToken=786901dxnamaz` style fragment, useActor picks it up automatically (this is already how useActor works -- we just need to make admin login use this URL)

### Modify
- `useQueries.ts`: `useInitializeRole` -- keep as is but make it work correctly
- `App.tsx`: Completely rewrite the Admin Setup flow:
  - When user logs in and role is null (unregistered), show setup dialog
  - In setup dialog, when admin token `786901dxnamaz` is entered, instead of calling `_initializeAccessControlWithSecret` directly (which may fail if useActor already called it with ""), we should:
    1. Store the token in sessionStorage under key `caffeineAdminToken`
    2. Force a page reload (window.location.reload()) so useActor picks it up fresh from sessionStorage via `getSecretParameter("caffeineAdminToken")`
  - "Continue as User" button: call `_initializeAccessControlWithSecret("")` to register as regular user
  - After reload with token stored, useActor will call `_initializeAccessControlWithSecret("786901dxnamaz")` automatically and user will be admin
- Remove the `useInitializeRole` mutation from `useQueries.ts` for admin path -- replace with sessionStorage + reload approach
- Keep "Continue as User" path using `useInitializeRole` with empty string

### Remove
- Nothing removed

## Implementation Plan

1. In `useQueries.ts`, update `useInitializeRole` to accept a flag -- if token is non-empty, store it in sessionStorage under `caffeineAdminToken` and reload; if empty, call `_initializeAccessControlWithSecret("")` directly to register as user.
2. In `App.tsx` `AdminSetupDialog`, update `handleSubmit` to use the new sessionStorage+reload approach for admin token, keeping "Continue as User" working as before.
3. Ensure after reload, the PDF list loads correctly (it should since useActor will be initialized with correct token).
4. Make sure the setup dialog does NOT show again after reload (user will already have a role).
5. Keep all existing UI intact -- only fix the broken auth/upload flow.
