// Syracuse Christmas Lights - backend server
// Serves the static frontend and provides a simple booking request API.
// Data is stored in JSON files under /data (see docs/technical-spec.md
// for the planned upgrade path to a real database).

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    fs.writeFileSync(BOOKINGS_FILE, '[]');
  }
  if (!fs.existsSync(INVENTORY_FILE)) {
    var defaultInventory = [
      { id: 1, item: 'C9 Warm White Bulbs (25ct string)', quantity: 40 },
      { id: 2, item: 'C9 Multicolor Bulbs (25ct string)', quantity: 25 },
      { id: 3, item: 'Mini Lights Warm White (100ct string)', quantity: 60 },
      { id: 4, item: 'Extension Cords (25ft, outdoor)', quantity: 30 },
      { id: 5, item: 'Roofline Clips (pack of 100)', quantity: 20 },
      { id: 6, item: 'Timers', quantity: 20 }
    ];
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(defaultInventory, null, 2));
  }
}
ensureDataFiles();

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(__dirname));

// Simple HTTP Basic Auth gate for admin routes.
// Set ADMIN_USER and ADMIN_PASSWORD as environment variables in Railway
// (Settings > Variables) to enable the admin dashboard. Until both are
// set, admin routes are locked down entirely rather than left open.
function requireAdmin(req, res, next) {
  var user = process.env.ADMIN_USER;
  var pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return res.status(503).send('Admin dashboard is not configured yet. Set ADMIN_USER and ADMIN_PASSWORD environment variables in Railway to enable it.');
  }

  var auth = req.headers.authorization;
  if (!auth || auth.indexOf('Basic ') !== 0) {
    res.set('WWW-Authenticate', 'Basic realm="Admin"');
    return res.status(401).send('Authentication required.');
  }

  var decoded = Buffer.from(auth.slice(6), 'base64').toString();
  var parts = decoded.split(':');
  var suppliedUser = parts[0];
  var suppliedPass = parts.slice(1).join(':');

  if (suppliedUser === user && suppliedPass === pass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  return res.status(401).send('Invalid credentials.');
}

// Public: submit a booking / reservation request from the calculator cart.
// Captures both the requested install date (November) and takedown date (January).
app.post('/api/bookings', function (req, res) {
  var body = req.body || {};
  var name = body.name;
  var email = body.email;
  var phone = body.phone;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'Name, email, and phone are required.' });
  }

  var bookings = readJSON(BOOKINGS_FILE);
  var newBooking = {
    id: Date.now(),
    name: name,
    email: email,
    phone: phone,
    address: body.address || '',
    sqft: body.sqft || null,
    stories: body.stories || null,
    package: body.package || '',
    items: Array.isArray(body.items) ? body.items : [],
    addons: body.addons || {},
    estimate: body.estimate || null,
    preferredDate: body.preferredDate || '',
    takedownDate: body.takedownDate || '',
    notes: body.notes || '',
    status: 'new',
    createdAt: new Date().toISOString()
  };

  bookings.push(newBooking);
  writeJSON(BOOKINGS_FILE, bookings);
  res.status(201).json({ success: true, booking: newBooking });
});

// Admin: list all bookings.
app.get('/api/bookings', requireAdmin, function (req, res) {
  res.json(readJSON(BOOKINGS_FILE));
});

// Admin: update a booking (e.g. change status, confirm a date).
app.patch('/api/bookings/:id', requireAdmin, function (req, res) {
  var bookings = readJSON(BOOKINGS_FILE);
  var idx = -1;
  for (var i = 0; i < bookings.length; i++) {
    if (String(bookings[i].id) === req.params.id) { idx = i; break; }
  }
  if (idx === -1) {
    return res.status(404).json({ error: 'Booking not found.' });
  }
  bookings[idx] = Object.assign({}, bookings[idx], req.body);
  writeJSON(BOOKINGS_FILE, bookings);
  res.json({ success: true, booking: bookings[idx] });
});

// Admin: customers derived from the booking history.
app.get('/api/customers', requireAdmin, function (req, res) {
  var bookings = readJSON(BOOKINGS_FILE);
  var map = {};
  bookings.forEach(function (b) {
    var key = (b.email || '').toLowerCase();
    if (!key) { return; }
    if (!map[key]) {
      map[key] = {
        name: b.name,
        email: b.email,
        phone: b.phone,
        address: b.address,
        bookingCount: 0,
        totalEstimate: 0
      };
    }
    map[key].bookingCount += 1;
    map[key].totalEstimate += (b.estimate || 0);
  });
  res.json(Object.values(map));
});

// Admin: inventory list.
app.get('/api/inventory', requireAdmin, function (req, res) {
  res.json(readJSON(INVENTORY_FILE));
});

// Admin: add a new inventory item.
app.post('/api/inventory', requireAdmin, function (req, res) {
  var item = (req.body || {}).item;
  var quantity = (req.body || {}).quantity;
  if (!item) {
    return res.status(400).json({ error: 'Item name is required.' });
  }
  var inventory = readJSON(INVENTORY_FILE);
  var newItem = { id: Date.now(), item: item, quantity: quantity || 0 };
  inventory.push(newItem);
  writeJSON(INVENTORY_FILE, inventory);
  res.status(201).json(newItem);
});

// Admin: update an inventory item's quantity.
app.patch('/api/inventory/:id', requireAdmin, function (req, res) {
  var inventory = readJSON(INVENTORY_FILE);
  var idx = -1;
  for (var i = 0; i < inventory.length; i++) {
    if (String(inventory[i].id) === req.params.id) { idx = i; break; }
  }
  if (idx === -1) {
    return res.status(404).json({ error: 'Inventory item not found.' });
  }
  inventory[idx] = Object.assign({}, inventory[idx], req.body);
  writeJSON(INVENTORY_FILE, inventory);
  res.json(inventory[idx]);
});

// Admin dashboard page (protected by the same Basic Auth gate).
app.get('/admin', requireAdmin, function (req, res) {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, function () {
  console.log('Syracuse Christmas Lights server running on port ' + PORT);
});
