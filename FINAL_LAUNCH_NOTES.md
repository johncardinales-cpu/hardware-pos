# Final Launch Workflow

Use this file for the presentation launch checklist.

## Final workflow rules

1. Cashier and Owner use the same POS selling flow.
2. Cashier cannot see owner-only data: cost, profit, owner dashboard, weekly report, inventory value, expenses.
3. Owner mode should persist in the browser after refresh.
4. Products must load from Google Sheets using `getProducts`.
5. Sales must save to Google Sheets using `createSale`.
6. Inventory must deduct from the same live stock value that `getProducts` returns.
7. Daily Sales Records must reload from Google Sheets using `getTodaySales`, not only browser memory.

## Required Apps Script patch

Paste this file into the bottom of Apps Script `Code.gs` and redeploy a new version:

`google-apps-script/FINAL_backend_stock_and_sales_records_fix.gs`

Then run:

`testFinalBackendFix`

Expected:

`Products: 20`

## Required frontend updates

The frontend must include:

- owner mode stored in `localStorage`
- `refreshAll()` that runs both `getProducts` and `getTodaySales`
- `completeSale()` that calls `refreshAll()` after sale completion
- product normalization that accepts `Current_Stock`, `stock_qty`, or `stock`
- product normalization that accepts `price`, `Price`, or `Selling_Price`
- product normalization that accepts `cost`, `Cost`, or `Unit_Cost`

## Final presentation test

1. Hard refresh app.
2. Click Refresh Live Data.
3. Confirm Products = 20.
4. Unlock Owner.
5. Refresh browser and confirm Owner Mode stays active.
6. Open Cashier Session with opening cash 2000.
7. Sell Cement 40kg qty 2.
8. Cash received 1000.
9. Confirm total, tax, and change auto-compute.
10. Complete sale.
11. Confirm inventory stock deducts from 50 to 48.
12. Refresh browser.
13. Confirm Daily Sales Records still show the sale.
14. Go to Daily Closing.
15. Confirm expected cash = opening cash + cash sales.

## Launch note

Do not change Products sheet headers during the demo. The backend patch supports multiple header names, but the clean structure is:

- id
- sku
- name
- category
- supplier
- cost
- price
- stock
- reorderLevel
- status
- notes
- unit
- qtyStep
- allowDecimalQty
- product_id
- stock_qty
- Current_Stock
