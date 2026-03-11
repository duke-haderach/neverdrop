# NeverDrop — GitHub Release Setup Guide

## One-time setup

### 1. Install electron-builder
```bash
npm install --save-dev electron-builder
```

### 2. Update package.json scripts
Merge the scripts from `package-additions.json` into your `package.json`:
```json
"build:renderer": "vite build",
"dist:win":       "electron-builder --win --config electron-builder.json",
"dist:mac":       "electron-builder --mac --config electron-builder.json",
"dist:linux":     "electron-builder --linux --config electron-builder.json"
```

### 3. Add app icons (optional but recommended)
Place icons in the `build/` folder:
- `build/icon.ico`   — Windows (256x256)
- `build/icon.icns`  — macOS
- `build/icon.png`   — Linux (512x512)

Free tool to generate all three: https://www.electron.build/icons

### 4. Push to GitHub
```bash
git init                        # if not already a repo
git remote add origin https://github.com/YOUR_USERNAME/neverdrop.git
git add .
git commit -m "Initial commit"
git push -u origin main
```

### 5. Copy workflow file
Copy `.github/workflows/release.yml` into your project root — this already exists
in the files provided.

---

## Publishing a release (every time)

```bash
# Tag the release — this triggers the GitHub Action automatically
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

GitHub Actions will then:
1. Build Windows .exe installer
2. Build macOS .dmg
3. Build Linux .AppImage
4. Create a GitHub Release with all three as downloadable assets
5. Auto-generate release notes from commit messages

---

## Release naming convention
- `v1.0.0`       → stable release
- `v1.1.0-beta`  → marked as pre-release automatically
- `v1.1.0-rc1`   → marked as pre-release automatically

---

## What users see on GitHub
Your repo's Releases page will show:
```
NeverDrop v1.0.0
─────────────────────────────
Assets:
  📦 NeverDrop-Setup-1.0.0.exe     ← Windows installer
  📦 NeverDrop-1.0.0.dmg           ← macOS disk image
  📦 NeverDrop-1.0.0.AppImage      ← Linux portable
  📄 Source code (zip)
  📄 Source code (tar.gz)
```

---

## Building locally (test before pushing)
```bash
# Test Windows build on your machine
npm run build:renderer
npm run dist:win

# Output will be in dist-electron/
# Look for NeverDrop Setup 1.0.0.exe
```

---

## Keeping source code safe
- The `.gitignore` excludes `dist/`, `dist-electron/`, `node_modules/`, `*.db`
- API keys never touch GitHub — they're stored in OS keychain at runtime
- Binaries are only in GitHub Releases, not in the repo itself
- Source code is readable (open source) but users don't need to touch it

## To make source code private
On GitHub → Settings → Change repository visibility → Private
Then share only the Release download links with users.
