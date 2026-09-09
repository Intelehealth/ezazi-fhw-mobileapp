# apps/web — ezazi-doctor-webapp

Placeholder. Scaffold the React 19 + Vite doctor webapp here following
`ezazi-doctor-webapp-migration-guide.md` (folder structure in §3), then:

1. Set `"name": "@ezazi/web"` in this app's `package.json`.
2. Depend on the shared packages instead of re-implementing them:
   ```json
   {
     "dependencies": {
       "@ezazi/api-client": "*",
       "@ezazi/config": "*",
       "@ezazi/types": "*"
     }
   }
   ```
3. In `src/services/http.ts`, replace the hand-rolled axios wrapper with
   `createApiClient` from `@ezazi/api-client`, supplying a web-appropriate
   `getAuthToken` / `onUnauthorized` (cookie or localStorage-backed) instead
   of the mobile app's secure-store-backed one.
4. Add `build`, `lint`, `typecheck`, `test`, `test:cov`, `clean` scripts to
   this app's `package.json` so Turborepo's pipeline (`turbo.json` at the
   repo root) picks it up — copy the script names from
   `intelehealth-hw-webapp-react`'s `package.json`, they already match.
