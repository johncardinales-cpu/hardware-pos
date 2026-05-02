/**
 * FINAL_backend_stock_and_sales_records_fix.gs
 *
 * Paste this at the BOTTOM of Apps Script Code.gs, then deploy a NEW version.
 * Purpose:
 * 1) getProducts always returns the real live stock from Current_Stock first.
 * 2) createSale updates all stock columns: stock, stock_qty, Current_Stock.
 * 3) getTodaySales returns persisted sales from Google Sheets so browser refresh does not lose records.
 */

function getHeaderMap_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach(function (h, i) {
    const key = String(h || '').trim();
    if (key) map[key] = i + 1;
    if (key) map[key.toLowerCase()] = i + 1;
  });
  return map;
}

function getCol_(map, names, requiredLabel) {
  for (var i = 0; i < names.length; i++) {
    if (map[names[i]]) return map[names[i]];
    if (map[String(names[i]).toLowerCase()]) return map[String(names[i]).toLowerCase()];
  }
  if (requiredLabel) throw new Error(requiredLabel + ' column not found. Expected ' + names.join(' or ') + '.');
  return null;
}

function toNumber_(value) {
  const n = Number(value);
  return isNaN(n) ? 0 : n;
}

function round2_(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function nextId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 1000);
}

function rowToObject_(headers, row) {
  const obj = {};
  headers.forEach(function (h, i) {
    const key = String(h || '').trim();
    if (key) obj[key] = row[i];
  });
  return obj;
}

function inferProductUnitFinal_(name, sku) {
  const text = String((name || '') + ' ' + (sku || '')).toLowerCase();
  if (text.indexOf('/ kg') >= 0 || text.indexOf('nail') >= 0) return 'kg';
  if (text.indexOf('/ meter') >= 0 || text.indexOf('wire') >= 0) return 'meter';
  if (text.indexOf('cement') >= 0) return 'bag';
  if (text.indexOf('paint') >= 0) return 'liter';
  if (text.indexOf('tape') >= 0) return 'roll';
  if (text.indexOf('plywood') >= 0 || text.indexOf('roofing') >= 0) return 'sheet';
  if (text.indexOf('box') >= 0 || text.indexOf('screw') >= 0) return 'box';
  return 'piece';
}

function getProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  if (!sheet) throw new Error('Products sheet not found.');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = values[0].map(function (h) { return String(h || '').trim(); });
  const map = getHeaderMap_(sheet);

  const idCol = getCol_(map, ['id', 'Product_ID', 'product_id'], 'Product ID');
  const skuCol = getCol_(map, ['sku', 'SKU'], null);
  const nameCol = getCol_(map, ['name', 'Name', 'Product_Name'], 'Product name');
  const categoryCol = getCol_(map, ['category', 'Category'], null);
  const supplierCol = getCol_(map, ['supplier', 'Supplier'], null);
  const costCol = getCol_(map, ['cost', 'Cost', 'Unit_Cost'], null);
  const priceCol = getCol_(map, ['price', 'Price', 'Selling_Price'], null);
  const stockCol = getCol_(map, ['Current_Stock', 'stock_qty', 'stock'], 'Stock');
  const reorderCol = getCol_(map, ['reorderLevel', 'Reorder_Level', 'reorder_level'], null);
  const statusCol = getCol_(map, ['status', 'Status'], null);
  const notesCol = getCol_(map, ['notes', 'Notes'], null);
  const unitCol = getCol_(map, ['unit', 'Unit'], null);
  const stepCol = getCol_(map, ['qtyStep', 'Qty_Step', 'qty_step'], null);
  const decimalCol = getCol_(map, ['allowDecimalQty', 'Allow_Decimal_Qty', 'allow_decimal_qty'], null);

  return values.slice(1).filter(function (row) {
    const id = String(row[idCol - 1] || '').trim();
    const name = String(row[nameCol - 1] || '').trim();
    const status = statusCol ? String(row[statusCol - 1] || 'Active').trim().toLowerCase() : 'active';
    return id && name && status !== 'inactive';
  }).map(function (row) {
    const unit = unitCol ? String(row[unitCol - 1] || '').trim() : inferProductUnitFinal_(row[nameCol - 1], skuCol ? row[skuCol - 1] : '');
    const finalUnit = unit || inferProductUnitFinal_(row[nameCol - 1], skuCol ? row[skuCol - 1] : '');
    const allowDecimal = decimalCol ? String(row[decimalCol - 1] || '').toLowerCase() === 'yes' : finalUnit === 'kg';
    return {
      id: String(row[idCol - 1] || '').trim(),
      sku: skuCol ? String(row[skuCol - 1] || '').trim() : '',
      name: String(row[nameCol - 1] || '').trim(),
      category: categoryCol ? String(row[categoryCol - 1] || '').trim() : '',
      supplier: supplierCol ? String(row[supplierCol - 1] || '').trim() : '',
      cost: costCol ? toNumber_(row[costCol - 1]) : 0,
      price: priceCol ? toNumber_(row[priceCol - 1]) : 0,
      stock: toNumber_(row[stockCol - 1]),
      reorderLevel: reorderCol ? toNumber_(row[reorderCol - 1]) : 0,
      status: statusCol ? String(row[statusCol - 1] || 'Active').trim() : 'Active',
      notes: notesCol ? String(row[notesCol - 1] || '').trim() : '',
      unit: finalUnit,
      qtyStep: stepCol ? toNumber_(row[stepCol - 1]) || (finalUnit === 'kg' ? 0.25 : 1) : (finalUnit === 'kg' ? 0.25 : 1),
      allowDecimalQty: allowDecimal
    };
  });
}

function findProductRowFinal_(productId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Products');
  if (!sheet) throw new Error('Products sheet not found.');
  const map = getHeaderMap_(sheet);
  const idCol = getCol_(map, ['Product_ID', 'product_id', 'id'], 'Product ID');
  const values = sheet.getRange(2, idCol, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(productId).trim()) {
      return { sheet: sheet, row: i + 2, map: map };
    }
  }
  throw new Error('Product row not found: ' + productId);
}

function updateProductStockFinal_(productId, quantitySold) {
  const found = findProductRowFinal_(productId);
  const map = found.map;
  const currentStockCol = getCol_(map, ['Current_Stock', 'stock_qty', 'stock'], 'Stock');
  const stockCols = ['stock', 'stock_qty', 'Current_Stock'].map(function (name) { return map[name] || map[name.toLowerCase()]; }).filter(Boolean);
  const currentStock = toNumber_(found.sheet.getRange(found.row, currentStockCol).getValue());
  const newStock = round2_(currentStock - toNumber_(quantitySold));
  if (newStock < -0.0001) throw new Error('Not enough stock for ' + productId + '. Current stock: ' + currentStock);
  stockCols.forEach(function (col) {
    found.sheet.getRange(found.row, col).setValue(newStock);
  });
  return { before: currentStock, after: newStock };
}

/**
 * Patch createSale only if your current createSale keeps failing stock updates.
 * This version writes Sales, Sale_Items, Payments, Inventory_Movements, and updates stock.
 */
function createSale(payload) {
  payload = payload || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName('Sales');
  const itemsSheet = ss.getSheetByName('Sale_Items');
  const paymentsSheet = ss.getSheetByName('Payments');
  const movementsSheet = ss.getSheetByName('Inventory_Movements');
  if (!salesSheet || !itemsSheet || !paymentsSheet || !movementsSheet) throw new Error('One or more sales sheets are missing.');

  const saleId = nextId_('SALE');
  const now = new Date();
  const items = payload.items || [];
  if (!items.length) throw new Error('No sale items provided.');

  var gross = 0, costTotal = 0;
  items.forEach(function (item) {
    gross += toNumber_(item.quantity) * toNumber_(item.unitPrice);
    costTotal += toNumber_(item.quantity) * toNumber_(item.unitCost);
  });
  gross = round2_(gross);
  const discount = round2_(toNumber_(payload.discount));
  const beforeTax = round2_(gross - discount);
  const taxRate = toNumber_(payload.taxRate);
  const taxAmount = round2_(beforeTax * taxRate / 100);
  const total = round2_(beforeTax + taxAmount);
  const cashReceived = round2_(toNumber_(payload.cashReceived));
  const changeDue = payload.paymentMethod === 'Cash' ? round2_(Math.max(cashReceived - total, 0)) : 0;

  appendObjectFinal_(salesSheet, {
    Sale_ID: saleId,
    sale_id: saleId,
    Date: now,
    Timestamp: now,
    Session_ID: payload.sessionId || '',
    Cashier_Name: payload.cashierName || '',
    Gross_Sales: gross,
    Discount: discount,
    Sales_Before_Tax: beforeTax,
    Tax_Rate: taxRate,
    Tax_Amount: taxAmount,
    Total: total,
    Total_Amount: total,
    Payment_Method: payload.paymentMethod || '',
    Cash_Received: cashReceived,
    Change_Due: changeDue,
    Cost_Total: round2_(costTotal),
    Gross_Profit: round2_(beforeTax - costTotal),
    Status: 'Completed'
  });

  items.forEach(function (item) {
    const stockResult = updateProductStockFinal_(item.productId, item.quantity);
    const lineTotal = round2_(toNumber_(item.quantity) * toNumber_(item.unitPrice));
    appendObjectFinal_(itemsSheet, {
      Sale_Item_ID: nextId_('ITEM'),
      Sale_ID: saleId,
      Product_ID: item.productId,
      product_id: item.productId,
      Quantity: toNumber_(item.quantity),
      Unit: item.unit || '',
      Unit_Price: toNumber_(item.unitPrice),
      Unit_Cost: toNumber_(item.unitCost),
      Line_Total: lineTotal,
      Created_At: now
    });
    appendObjectFinal_(movementsSheet, {
      Movement_ID: nextId_('MOV'),
      Date: now,
      Product_ID: item.productId,
      product_id: item.productId,
      Type: 'SALE',
      Quantity: -toNumber_(item.quantity),
      Stock_Before: stockResult.before,
      Stock_After: stockResult.after,
      Reference_ID: saleId,
      Notes: 'Sale stock deduction',
      Created_At: now
    });
  });

  appendObjectFinal_(paymentsSheet, {
    Payment_ID: nextId_('PAY'),
    Sale_ID: saleId,
    Date: now,
    Payment_Method: payload.paymentMethod || '',
    Amount: total,
    Cash_Received: cashReceived,
    Change_Due: changeDue,
    Created_At: now
  });

  return { saleId: saleId, total: total, changeDue: changeDue };
}

function appendObjectFinal_(sheet, obj) {
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h || '').trim(); });
  const row = headers.map(function (h) {
    if (!h) return '';
    if (Object.prototype.hasOwnProperty.call(obj, h)) return obj[h];
    const lower = h.toLowerCase();
    const matchKey = Object.keys(obj).find(function (k) { return k.toLowerCase() === lower; });
    return matchKey ? obj[matchKey] : '';
  });
  sheet.appendRow(row);
}

function getTodaySales() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const salesSheet = ss.getSheetByName('Sales');
  const itemsSheet = ss.getSheetByName('Sale_Items');
  if (!salesSheet || salesSheet.getLastRow() < 2) return [];

  const salesHeaders = salesSheet.getRange(1, 1, 1, salesSheet.getLastColumn()).getValues()[0].map(String);
  const salesValues = salesSheet.getRange(2, 1, salesSheet.getLastRow() - 1, salesSheet.getLastColumn()).getValues();
  const itemsHeaders = itemsSheet && itemsSheet.getLastRow() > 1 ? itemsSheet.getRange(1, 1, 1, itemsSheet.getLastColumn()).getValues()[0].map(String) : [];
  const itemValues = itemsSheet && itemsSheet.getLastRow() > 1 ? itemsSheet.getRange(2, 1, itemsSheet.getLastRow() - 1, itemsSheet.getLastColumn()).getValues() : [];

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  function val(obj, names) {
    for (var i = 0; i < names.length; i++) if (obj[names[i]] !== undefined && obj[names[i]] !== '') return obj[names[i]];
    return '';
  }

  const itemObjects = itemValues.map(function (row) { return rowToObject_(itemsHeaders, row); });
  return salesValues.map(function (row) { return rowToObject_(salesHeaders, row); }).filter(function (s) {
    const d = val(s, ['Date', 'Timestamp', 'Created_At']);
    if (!d) return true;
    const day = Object.prototype.toString.call(d) === '[object Date]' ? Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(d).slice(0, 10);
    return day === today;
  }).map(function (s) {
    const saleId = val(s, ['Sale_ID', 'sale_id']);
    const saleItems = itemObjects.filter(function (it) { return String(val(it, ['Sale_ID', 'sale_id'])) === String(saleId); });
    return {
      id: saleId,
      saleId: saleId,
      time: String(val(s, ['Timestamp', 'Date', 'Created_At'])),
      paymentMethod: val(s, ['Payment_Method', 'paymentMethod']),
      gross: toNumber_(val(s, ['Gross_Sales', 'gross'])),
      discount: toNumber_(val(s, ['Discount', 'discount'])),
      beforeTax: toNumber_(val(s, ['Sales_Before_Tax', 'beforeTax'])),
      tax: toNumber_(val(s, ['Tax_Amount', 'tax'])),
      total: toNumber_(val(s, ['Total', 'Total_Amount', 'total'])),
      cost: toNumber_(val(s, ['Cost_Total', 'cost'])),
      grossProfit: toNumber_(val(s, ['Gross_Profit', 'grossProfit'])),
      cashReceived: toNumber_(val(s, ['Cash_Received', 'cashReceived'])),
      changeDue: toNumber_(val(s, ['Change_Due', 'changeDue'])),
      items: saleItems.map(function (it) {
        return {
          productId: val(it, ['Product_ID', 'product_id']),
          name: val(it, ['Product_Name', 'name']) || val(it, ['Product_ID', 'product_id']),
          quantity: toNumber_(val(it, ['Quantity', 'quantity'])),
          unit: val(it, ['Unit', 'unit']),
          unitPrice: toNumber_(val(it, ['Unit_Price', 'unitPrice'])),
          unitCost: toNumber_(val(it, ['Unit_Cost', 'unitCost']))
        };
      })
    };
  }).reverse();
}

function testFinalBackendFix() {
  Logger.log('Products: ' + getProducts().length);
  Logger.log(JSON.stringify(getTodaySales().slice(0, 3), null, 2));
}
