---
description: How to deploy a new version of PocketPost with proper cache busting
---

# Release & Deploy Workflow

## Steps

### 1. Bump the version in THREE places (must be identical)

// turbo
```
Update the version string in these files to the new version (e.g., 1.0.1):
- `public/version.json` → "version" field AND "minVersion" if forcing update
- `public/sw.js` → APP_VERSION constant at the top
- `package.json` → "version" field
```

### 2. Update changelog in version.json

Edit `public/version.json`:
- Set `"changelog"` to a short description of the release
- Set `"buildTimestamp"` to the current ISO time
- Set `"forceUpdate": true` if this is a critical/breaking release (users will be auto-refreshed)
- Set `"forceUpdate": false` for normal releases (users see an "Update Available" banner)

### 3. Build the production bundle

// turbo
```bash
npm run build
```

### 4. Deploy to Firebase Hosting

// turbo
```bash
npx firebase deploy --only hosting
```

### 5. Verify deployment

Open `https://pocketpost.saptech.online/version.json` in a browser and confirm the version matches.

## How It Works

1. **On every page load**, the `VersionChecker` component fetches `/version.json?t=timestamp` (never cached)
2. It compares the remote version against `localStorage.pocketpost_app_version`
3. If remote is newer:
   - `forceUpdate: true` → immediately purges all caches and hard reloads
   - `forceUpdate: false` → shows a dismissible "Update Available" banner
4. The service worker uses `self.skipWaiting()` + `clients.claim()` to take control instantly
5. Old caches are purged automatically when the new SW activates (cache name includes version)

## Emergency Force Update

If users are stuck on a broken version:

1. Set `"forceUpdate": true` in `public/version.json`
2. Set `"minVersion"` to a version higher than what the stuck users have
3. Deploy immediately — all users will be force-refreshed on next page load
