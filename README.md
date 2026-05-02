# Hardware POS Deployable App

This is the deployable React POS app for Vercel or Netlify.

## Backend URL
https://script.google.com/macros/s/AKfycbwkcGeYJA9TdVgdnSIdG6-0Ov0Ldjt2niuJV5_6_Wmma50hmhJzHvSFRZbHko--PWUh/exec

## Important Apps Script update for live sale writing
The app sends sale data through the URL parameter `payload` for JSONP.
Your Apps Script needs the patch in:

`google-apps-script/PATCH_payload_support.gs`

Add the helper and update `handleRequest`, then redeploy a new version.

## Run locally
```bash
npm install
npm run dev
```

## Deploy to Vercel
1. Upload this folder to GitHub.
2. Import the repo in Vercel.
3. Add env var: `VITE_API_BASE_URL=https://script.google.com/macros/s/AKfycbwkcGeYJA9TdVgdnSIdG6-0Ov0Ldjt2niuJV5_6_Wmma50hmhJzHvSFRZbHko--PWUh/exec`
4. Deploy.

## Live test
1. Refresh Products.
2. Open Cashier Session.
3. Add Cement 40kg.
4. Enter Cash Received = 500.
5. Complete Sale.
6. Check Google Sheets: Sales, Sale_Items, Payments, Inventory_Movements, Products stock.
