/**
 * FIX_getProducts_all_products.gs
 *
 * Paste this at the BOTTOM of Code.gs in Google Apps Script.
 * It overrides getProducts() so the POS loads all rows from Products!A:N.
 * Then Deploy > Manage deployments > Edit > New version > Deploy.
 */

function getProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  if (!sheet) {
    throw new Error('Products sheet not found.');
  }

  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), 14);
  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function (h) {
    return String(h || '').trim();
  });

  function idx(name, fallbackIndex) {
    const lowerName = String(name).toLowerCase();
    const found = headers.findIndex(function (h) {
      return String(h).toLowerCase() === lowerName;
    });
    return found >= 0 ? found : fallbackIndex;
  }

  const col = {
    id: idx('id', 0),
    sku: idx('sku', 1),
    name: idx('name', 2),
    category: idx('category', 3),
    supplier: idx('supplier', 4),
    cost: idx('cost', 5),
    price: idx('price', 6),
    stock: idx('stock', 7),
    reorderLevel: idx('reorderLevel', 8),
    status: idx('status', 9),
    notes: idx('notes', 10),
    unit: idx('unit', 11),
    qtyStep: idx('qtyStep', 12),
    allowDecimalQty: idx('allowDecimalQty', 13)
  };

  return values.slice(1)
    .filter(function (row) {
      const id = String(row[col.id] || '').trim();
      const name = String(row[col.name] || '').trim();
      const status = String(row[col.status] || 'Active').trim().toLowerCase();
      return id && name && status !== 'inactive';
    })
    .map(function (row) {
      const unit = String(row[col.unit] || inferProductUnit_(row[col.name], row[col.sku])).trim();
      const allowDecimalQty = String(row[col.allowDecimalQty] || '').trim().toLowerCase() === 'yes' || unit === 'kg';
      return {
        id: String(row[col.id] || '').trim(),
        sku: String(row[col.sku] || '').trim(),
        name: String(row[col.name] || '').trim(),
        category: String(row[col.category] || '').trim(),
        supplier: String(row[col.supplier] || '').trim(),
        cost: Number(row[col.cost]) || 0,
        price: Number(row[col.price]) || 0,
        stock: Number(row[col.stock]) || 0,
        reorderLevel: Number(row[col.reorderLevel]) || 0,
        status: String(row[col.status] || 'Active').trim(),
        notes: String(row[col.notes] || '').trim(),
        unit: unit,
        qtyStep: Number(row[col.qtyStep]) || (unit === 'kg' ? 0.25 : 1),
        allowDecimalQty: allowDecimalQty
      };
    });
}

function inferProductUnit_(name, sku) {
  const text = String((name || '') + ' ' + (sku || '')).toLowerCase();
  if (text.indexOf('/ kg') >= 0 || text.indexOf('nail') >= 0) return 'kg';
  if (text.indexOf('/ meter') >= 0 || text.indexOf('wire') >= 0) return 'meter';
  if (text.indexOf('cement') >= 0) return 'bag';
  if (text.indexOf('tape') >= 0) return 'roll';
  if (text.indexOf('plywood') >= 0 || text.indexOf('roofing') >= 0) return 'sheet';
  if (text.indexOf('paint') >= 0) return 'liter';
  if (text.indexOf('box') >= 0 || text.indexOf('screw') >= 0) return 'box';
  return 'piece';
}

/**
 * Run this in Apps Script editor to verify products before redeploying.
 */
function testGetProductsCount() {
  const products = getProducts();
  Logger.log('Products loaded: ' + products.length);
  Logger.log(JSON.stringify(products.slice(0, 3), null, 2));
}
