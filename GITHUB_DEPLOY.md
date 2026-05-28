# GitHub Deployment Guide — Behind Schedule

## Prerequisites
- A GitHub account ([sign up](https://github.com/signup) if needed)
- [Git](https://git-scm.com/downloads) installed on your computer
- Your GAS project ID (from `Code.gs.txt` or the Apps Script editor)

---

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. **Repository name**: `bs-main` (or your choice)
3. **Visibility**: Public (required for CDN)
4. Leave everything else default, click **Create repository**

---

## Step 2: Upload the Code

### Option A — Using Git CLI (recommended)

```bash
# In your project folder (C:\Users\hp\Downloads\bs-main\bs-main)
git init
git add -A
git commit -m "Initial commit — premium banking UI glassmorphism v2"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/bs-main.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

### Option B — Via GitHub UI (no git required)

1. On your new repo page, click **uploading an existing file**
2. Drag & drop these files/folders (select all inside `bs-main`):
   - `index.html`
   - `Dashboard.html`
   - `CustomerInfo.html`
   - `Code.gs.txt`
   - `sw.js`
   - `manifest.json`
   - `icon.png`
   - `css/` folder
   - `js/` folder
3. Scroll down, add commit message `Initial upload`, click **Commit changes**

---

## Step 3: Create a Git Tag (for CDN versioning)

jsDelivr uses Git tags to version files. You need to create one.

### If using Git CLI:
```bash
git tag v1.0.0
git push origin v1.0.0
```

### If using GitHub UI:
1. On your repo page, click **Releases** (right sidebar)
2. Click **Create a new release**
3. **Tag version**: `v1.0.0`
4. **Release title**: `v1.0.0`
5. Click **Publish release**

---

## Step 4: Replace `__CDN_BASE__` Placeholders

Your CDN base URL will be:
```
https://cdn.jsdelivr.net/gh/YOUR_USERNAME/bs-main@v1.0.0
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### In `index.html` (11 replacements)

Open `index.html` and replace all `__CDN_BASE__` with your CDN URL.
Each line looks like this — change every one:
```html
<link rel="stylesheet" href="__CDN_BASE__/css/styles.css">
```
to:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/bs-main@v1.0.0/css/styles.css">
```

### In `sw.js` (1 replacement)

Line 2 of `sw.js`:
```js
const CDN_BASE = '__CDN_BASE__';
```
change to:
```js
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/bs-main@v1.0.0';
```

---

## Step 5: Deploy via Google Apps Script

1. Go to https://script.google.com and open your project
2. Open `Code.gs` (rename `Code.gs.txt` to `Code.gs` if needed)
3. In the Apps Script editor, go to **File → Open → Project files**
4. Upload the updated `index.html`, `Dashboard.html`, `CustomerInfo.html`, `sw.js` files (overwrite existing)
5. **Do NOT upload `manifest.json`, `icon.png`, or any files under `css/` or `js/`** — those are served from the CDN
6. Click **Deploy → New deployment**
7. **Type**: Web app
8. **Execute as**: Me
9. **Who has access**: Anyone (or your domain)
10. Click **Deploy**
11. Copy the web app URL — that is your live app link

---

## Step 6: Future Updates

When you make changes:

### Update the CDN files:
1. Make your edits locally
2. Commit & push to GitHub
3. Create a **new tag** (e.g. `v1.0.1`)
4. Update `__CDN_BASE__` → `https://cdn.jsdelivr.net/gh/YOUR_USERNAME/bs-main@v1.0.1`
5. Upload `index.html` to GAS

### Update GAS-only files (Code.gs, etc.):
- Just re-upload to the Apps Script editor and create a new deployment

---

## How It Works

```
User's browser
     │
     ▼
GAS Web App URL (script.google.com/.../exec)
     │
     ├── Serves index.html  (tiny ~22KB shell)
     ├── Serves sw.js       (service worker)
     │
     └── Browser then loads from CDN:
         ├── css/styles.css  ← https://cdn.jsdelivr.net/gh/...
         ├── js/db.js        ← (cached by browser for future visits)
         ├── js/api.js
         └── ...9 more files
```

The GAS response is only ~22KB. All CSS and JS load in **parallel** from jsDelivr's global CDN network and are cached by the browser for subsequent visits.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Styles not loading | Check the CDN URL — visit `https://cdn.jsdelivr.net/gh/YOUR_USERNAME/bs-main@v1.0.0/css/styles.css` in a browser. If 404, your tag or path is wrong |
| 404 on CDN files | jsDelivr can take 2-3 minutes after publishing a tag. Wait and retry. Also verify files are committed to `main` branch |
| `__CDN_BASE__` still showing | You missed one of the 11 occurrences in `index.html` or the one in `sw.js` — search for `__CDN_BASE__` in both files |
| Service worker not caching | Clear browser cache, unregister old SW in DevTools → Application → Service Workers, reload |
| App Script errors | Ensure `Code.gs` is properly renamed from `Code.gs.txt` and has the correct `doGet()` function |
