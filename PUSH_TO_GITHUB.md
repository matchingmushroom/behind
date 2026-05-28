# Quick Start — Push to GitHub

## 1. Install Git
Download from https://git-scm.com/downloads — run the installer (all defaults fine).

## 2. Create the repo on GitHub
1. Go to https://github.com/new
2. **Repository name**: `behind`
3. **Visibility**: **Public** (required for CDN)
4. Click **Create repository**

## 3. Upload via browser (no CLI needed)
On the new empty repo page:
1. Click **uploading an existing file**
2. From Windows, open `C:\Users\hp\Downloads\bs-main\bs-main\` and drag these in:

```
index.html
Dashboard.html
CustomerInfo.html
Code.gs.txt
sw.js
manifest.json
icon.png
css\           ← drag the whole folder
js\            ← drag the whole folder
```

3. Scroll down, add message `Initial commit`
4. Click **Commit changes**

## 4. Create a tag (for CDN)
1. On your repo page, click **Releases** (right sidebar)
2. Click **Create a new release**
3. **Tag version**: `v1.0.0`
4. **Title**: `v1.0.0`
5. Click **Publish release**

## 5. Test the CDN
Wait 2-3 minutes, then visit in your browser:
```
https://cdn.jsdelivr.net/gh/matchingmushroom/behind@v1.0.0/css/styles.css
```
You should see the CSS content (not a 404).

## 6. Open locally
Once the CDN returns 200, simply open `index.html` in your browser — styles and scripts will load from jsDelivr.

> **Note**: The app needs the GAS backend for API calls (search, customer data, etc.), but the UI/login page will render locally.
