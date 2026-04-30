// Bluetooth thermal printer service — Web Bluetooth API (Chrome only)
// Sends raw ESC/POS commands: silent print + real paper cut, no dialog

const ESC = 0x1B;
const GS  = 0x1D;

const CMD = {
  INIT:         [ESC, 0x40],
  CODE_PAGE:    [ESC, 0x74, 0x13],  // ESC t 19 = Windows-1252 — fixes £ showing as "Tú"
  ALIGN_LEFT:   [ESC, 0x61, 0x00],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  BOLD_ON:      [ESC, 0x45, 0x01],
  BOLD_OFF:     [ESC, 0x45, 0x00],
  DOUBLE_SIZE:  [ESC, 0x21, 0x30],
  NORMAL_SIZE:  [ESC, 0x21, 0x00],
  FEED:         [ESC, 0x64, 0x04],
  CUT:          [GS,  0x56, 0x41, 0x03],  // full cut with feed — physical paper cut
};

// Common BLE service UUIDs used by thermal printers
const BLE_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  '00001101-0000-1000-8000-00805f9b34fb',
];

// Common write characteristic UUIDs
const BLE_CHARS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

let _device = null;
let _char   = null;

export const btSupported  = () => 'bluetooth' in navigator;
export const btConnected  = () => !!(_device?.gatt?.connected && _char);
export const btDeviceName = () => _device?.name || null;

// Try to silently reconnect to any previously-paired printer (Chrome 85+)
export const btAutoConnect = async (onConnect) => {
  if (!btSupported() || !navigator.bluetooth.getDevices) return;
  try {
    const devices = await navigator.bluetooth.getDevices();
    if (!devices.length) return;
    const dev = devices[0];
    dev.addEventListener('gattserverdisconnected', () => { _device = null; _char = null; });
    const server = await dev.gatt.connect();
    let service = null;
    for (const uuid of BLE_SERVICES) {
      try { service = await server.getPrimaryService(uuid); break; } catch (_) {}
    }
    if (!service) return;
    let char = null;
    for (const uuid of BLE_CHARS) {
      try { char = await service.getCharacteristic(uuid); break; } catch (_) {}
    }
    if (!char) return;
    _device = dev;
    _char   = char;
    if (onConnect) onConnect(dev.name || 'Bluetooth Printer');
  } catch (_) {
    // Silent — user hasn't paired yet or device is off
  }
};

export const btConnect = async () => {
  if (!btSupported()) {
    throw new Error('Web Bluetooth not supported. Use Chrome on desktop or Android.');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: BLE_SERVICES,
  });

  const server = await device.gatt.connect();

  // Try each service UUID until one works
  let service = null;
  for (const uuid of BLE_SERVICES) {
    try { service = await server.getPrimaryService(uuid); break; } catch (_) {}
  }
  if (!service) {
    throw new Error(
      'Could not find a printer service on this device.\n' +
      'Your printer may use Bluetooth Classic (SPP) which browsers cannot access directly.\n' +
      'Try pairing it via Windows Bluetooth settings and use the kiosk print method instead.'
    );
  }

  // Try each characteristic UUID until one works
  let char = null;
  for (const uuid of BLE_CHARS) {
    try { char = await service.getCharacteristic(uuid); break; } catch (_) {}
  }
  if (!char) throw new Error('Printer connected but no writable characteristic found.');

  _device = device;
  _char   = char;

  device.addEventListener('gattserverdisconnected', () => {
    _device = null;
    _char   = null;
  });

  return device.name || 'Bluetooth Printer';
};

export const btDisconnect = () => {
  if (_device?.gatt?.connected) _device.gatt.disconnect();
  _device = null;
  _char   = null;
};

// ── Send bytes to printer in 20-byte BLE chunks ───────────────────────────────
const send = async (bytes) => {
  if (!btConnected()) throw new Error('Printer not connected');
  const CHUNK = 20;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    await _char.writeValueWithoutResponse(new Uint8Array(bytes.slice(i, i + CHUNK)));
    await new Promise(r => setTimeout(r, 15));
  }
};

// CP1252 encoder — £ (U+00A3) → 0xA3 single byte; avoids UTF-8 two-byte "Tú" artefact
const enc = (text) => {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 256) bytes.push(c); // Latin-1 / CP1252 passthrough (covers £ = 0xA3)
    else bytes.push(0x3F);           // '?' fallback for chars outside CP1252
  }
  return bytes;
};
const divider  = (w = 32)          => '-'.repeat(w);
const twoCol   = (l, r, w = 32)   => l + ' '.repeat(Math.max(1, w - l.length - r.length)) + r;

// ESC/POS native QR code — prints without sending raster image bytes
const buildQR = (url) => {
  const data  = enc(url);
  const len   = data.length + 3;
  const pL    = len & 0xFF;
  const pH    = (len >> 8) & 0xFF;
  return [
    0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00, // model 2
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x04,        // module size 4
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31,        // error correction M
    0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30, ...data,   // store data
    0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30,        // print
  ];
};

// ── Customer receipt ──────────────────────────────────────────────────────────
const buildCustomer = (data) => {
  const { orderNumber, orderType, customerName, paymentMethod, orderDate,
          items, totals, staffName, customerNotes, pagerUrl, isOnline = false } = data;
  const b = [];

  b.push(...CMD.INIT, ...CMD.CODE_PAGE);
  b.push(...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
  b.push(...enc('Mirchi Mafiya\n'));
  b.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
  b.push(...enc('Cumberland St, LU1 3BW, Luton\n'));
  b.push(...enc('+447440086046\n'));
  b.push(...enc(divider() + '\n'));

  b.push(...CMD.ALIGN_LEFT, ...CMD.BOLD_ON);
  b.push(...enc(`${isOnline ? 'ONLINE ' : ''}ORDER #${orderNumber}\n`));
  b.push(...enc(`${customerName}\n`));
  b.push(...CMD.BOLD_OFF);
  b.push(...enc(`Type: ${orderType}\n`));
  b.push(...enc(`Date: ${orderDate}\n`));
  b.push(...enc(divider() + '\n'));

  b.push(...CMD.BOLD_ON);
  b.push(...enc('ITEMS\n'));
  b.push(...CMD.BOLD_OFF);
  items.forEach(it => {
    const qty   = it.qty || 1;
    const total = Number(it.total ?? it.price * qty).toFixed(2);
    b.push(...enc(twoCol(`${qty}x ${it.name}`, `£${total}`) + '\n'));
  });

  b.push(...enc(divider() + '\n'));

  if (totals) {
    b.push(...enc(twoCol('Sub Total',    `£${totals.subtotal.toFixed(2)}`) + '\n'));
    if (totals.discount > 0) {
      b.push(...enc(twoCol(`Discount(${totals.discountPct}%)`, `-£${totals.discount.toFixed(2)}`) + '\n'));
    }
    b.push(...enc(twoCol('VAT (20%)',    `£${totals.vat.toFixed(2)}`) + '\n'));
    b.push(...enc(twoCol('Service (8%)', `£${totals.service.toFixed(2)}`) + '\n'));
    b.push(...enc(divider() + '\n'));
    b.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
    b.push(...enc(twoCol('TOTAL', `£${totals.grand.toFixed(2)}`) + '\n'));
    b.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
  } else if (data.total) {
    b.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
    b.push(...enc(twoCol('TOTAL', `£${Number(data.total).toFixed(2)}`) + '\n'));
    b.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
  }

  b.push(...enc(twoCol('Payment', paymentMethod) + '\n'));
  if (staffName) b.push(...enc(twoCol('Staff', staffName) + '\n'));

  if (customerNotes) {
    b.push(...enc(divider() + '\n'));
    b.push(...CMD.BOLD_ON);
    b.push(...enc('Special Requests:\n'));
    b.push(...CMD.BOLD_OFF);
    b.push(...enc(customerNotes + '\n'));
  }

  b.push(...CMD.ALIGN_CENTER);
  if (pagerUrl) {
    b.push(...enc('\nScan to track your order:\n'));
    b.push(...buildQR(pagerUrl));
    b.push(...enc('\n'));
  }
  b.push(...enc('\nThank you for visiting\nMirchi Mafiya!\n'));
  b.push(...CMD.FEED);
  b.push(...CMD.CUT);   // ✂ physical cut after customer copy

  return b;
};

// ── Kitchen receipt ───────────────────────────────────────────────────────────
const buildKitchen = (data) => {
  const { orderNumber, orderType, customerName, orderDate,
          items, customerNotes, isOnline = false, pickupTime, estimatedReady } = data;
  const b = [];

  b.push(...CMD.INIT, ...CMD.CODE_PAGE);
  b.push(...CMD.ALIGN_CENTER, ...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
  b.push(...enc(`KITCHEN${isOnline ? ' - ONLINE' : ''}\n`));
  b.push(...enc(`#${orderNumber}\n`));
  b.push(...CMD.NORMAL_SIZE);
  b.push(...enc(`${orderType.toUpperCase()}\n`));
  if (pickupTime)     b.push(...enc(`Pickup: ${pickupTime}\n`));
  if (estimatedReady) b.push(...enc(`Ready: ${estimatedReady}\n`));
  b.push(...CMD.BOLD_ON);
  b.push(...enc(`${customerName}\n`));
  b.push(...CMD.BOLD_OFF, ...CMD.ALIGN_LEFT);
  b.push(...enc(divider() + '\n'));

  items.forEach(it => {
    const qty = it.qty || 1;
    b.push(...CMD.BOLD_ON, ...CMD.DOUBLE_SIZE);
    b.push(...enc(`${qty} X ${it.name.toUpperCase()}\n`));
    b.push(...CMD.NORMAL_SIZE, ...CMD.BOLD_OFF);
  });

  b.push(...enc(divider() + '\n'));

  if (customerNotes) {
    b.push(...CMD.BOLD_ON);
    b.push(...enc(`!! NOTES: ${customerNotes}\n`));
    b.push(...CMD.BOLD_OFF);
    b.push(...enc(divider() + '\n'));
  }

  b.push(...CMD.ALIGN_CENTER);
  b.push(...enc(`${orderDate}\n`));
  b.push(...CMD.FEED);
  b.push(...CMD.CUT);   // ✂ physical cut after kitchen copy

  return b;
};

// ── Public print functions ────────────────────────────────────────────────────

export const btPrintBoth = async (data) => {
  await send(buildCustomer(data));
  await send(buildKitchen(data));
};

export const btPrintOnlineOrder = async (order) => {
  const data = {
    orderNumber:    order.order_number,
    orderType:      order.order_type || '',
    customerName:   order.customer_name,
    paymentMethod:  order.payment_method || '',
    orderDate:      order.date || new Date().toLocaleDateString('en-GB'),
    items:          order.items || [],
    total:          order.final_amount,
    customerNotes:  order.customer_notes || '',
    pickupTime:     order.pickup_time || '',
    estimatedReady: order.estimated_ready || '',
    isOnline:       true,
  };
  await send(buildCustomer(data));
  await send(buildKitchen(data));
};
