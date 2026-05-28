# Behind Schedule — Upgrade Task Tracker

## P0: Modern UI/UX + Performance
- `[x]` Complete CSS design system (dark/light mode, glassmorphism, animations)
- `[x]` Rewrite index.html — Search view with fuzzy match, recent searches, debounce
- `[x]` Rewrite index.html — Detail view with animated counters, skeleton loaders
- `[x]` Rewrite index.html — Group view with premium member cards
- `[x]` Rewrite index.html — Insights view with enhanced tables
- `[x]` Toast notification system (replace all alert())
- `[x]` Bottom nav with animated indicator
- `[x]` Modal redesign (bottom sheet on mobile)
- `[x]` Performance: request deduplication, debounced search, lazy loading
- `[x]` Currency symbol: ₹ → रु

## P1: Analytics Dashboard + Enhanced Offline
- `[x]` Dashboard.html with Chart.js (category pie, trend line, top overdue bar)
- `[x]` KPI summary cards in dashboard
- `[x]` IndexedDB offline storage (replace localStorage)
- `[x]` Stale-while-revalidate caching in sw.js

## P2: Advanced Features + Automation
- `[x]` CSV export for customer data
- `[x]` Bulk select customers in search
- `[x]` Customer timeline in detail view
- `[x]` Auto-reminder scheduling UI
- `[x]` Enhanced GPS modal with map preview
