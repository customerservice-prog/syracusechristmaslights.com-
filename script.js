// Syracuse Christmas Lights - instant cart-based estimate calculator
// Formula source: docs/pricing-logic.md
// Note: the #stories select stores the story multiplier directly
// (1, 1.15, or 1.3), matching docs/pricing-logic.md step 3.

var SHAPE_FACTOR = 1.15;
var MIN_PRICE = 275;
var SOFT_CAP = 3000;
var SMALL_TREE_PRICE = 45;
var LARGE_TREE_PRICE = 85;
var GARLAND_PRICE = 35;
var WALKWAY_RATE = 6;

var TREE_SURCHARGE = { 0: 0, 1.5: 15, 3: 30 };
var GARLAND_SURCHARGE = { 0: 0, 1.5: 10, 3: 20 };
var WALKWAY_STYLE_RATE = { 0: 0, 1.5: 1, 3: 2 };

var measuredFootprintSqFt = null;
var measuredPerimeterFt = null;
var roofMap = null;
var roofDrawnItems = null;
var lightBulbLayer = null;

var cart = [];
var cartCounter = 0;
var lastCartTotal = 0;
var currentItemType = 'roofline';

function storyCountForMultiplier(multiplier) {
if (multiplier <= 1.0) { return 1; }
if (multiplier <= 1.15) { return 2; }
return 3;
}

function tierLabelForRate(rate) {
if (rate <= 4.5) { return 'Basic'; }
if (rate <= 7.0) { return 'Standard'; }
return 'Premium';
}

function formatCurrency(amount) {
return '$' + Math.round(amount);
}

function computeRooflinePrice(inputs) {
var storyCount = storyCountForMultiplier(inputs.storyMultiplier);
var footprint, perimeter;
if (inputs.measuredFootprint && inputs.measuredPerimeter) {
footprint = inputs.measuredFootprint;
perimeter = inputs.measuredPerimeter;
} else {
footprint = inputs.sqft / storyCount;
perimeter = 4 * Math.sqrt(footprint) * SHAPE_FACTOR;
}

var effectiveRate = inputs.tierRate + inputs.lightingModifier;
var price = perimeter * effectiveRate * inputs.storyMultiplier;

return { price: price, perimeter: perimeter };
}

function styleModifier() {
var sel = document.getElementById('lightingStyle');
return sel ? (parseFloat(sel.value) || 0) : 0;
}

function styleLabel() {
var sel = document.getElementById('lightingStyle');
return sel && sel.selectedOptions.length ? sel.selectedOptions[0].text : 'Warm white mini lights (classic)';
}

function computeCurrentItem() {
var modifier = styleModifier();
var label = styleLabel();
var type = currentItemType;

if (type === 'roofline') {
var sqft = parseFloat(document.getElementById('sqft').value) || 0;
var storyMultiplier = parseFloat(document.getElementById('stories').value) || 1;
var tierRate = parseFloat(document.getElementById('tier').value) || 7;
var tierLabel = tierLabelForRate(tierRate);

var calc = computeRooflinePrice({
sqft: sqft,
storyMultiplier: storyMultiplier,
tierRate: tierRate,
lightingModifier: modifier,
measuredFootprint: measuredFootprintSqFt,
measuredPerimeter: measuredPerimeterFt
});

return {
valid: true,
type: 'roofline',
label: 'Roofline & Gutter Lighting - ' + tierLabel,
detail: label + ', approx ' + calc.perimeter.toFixed(0) + ' ft',
price: calc.price,
meta: { sqft: sqft, stories: storyCountForMultiplier(storyMultiplier), package: tierLabel, lightingStyle: label }
};
} else if (type === 'trees') {
var smallTrees = parseFloat(document.getElementById('smallTrees').value) || 0;
var largeTrees = parseFloat(document.getElementById('largeTrees').value) || 0;
if (smallTrees <= 0 && largeTrees <= 0) { return { valid: false }; }
var tSurcharge = TREE_SURCHARGE[modifier] || 0;
var tPrice = smallTrees * (SMALL_TREE_PRICE + tSurcharge) + largeTrees * (LARGE_TREE_PRICE + tSurcharge);
var parts = [];
if (smallTrees > 0) { parts.push(smallTrees + ' small'); }
if (largeTrees > 0) { parts.push(largeTrees + ' large'); }

return {
valid: true,
type: 'trees',
label: 'Tree Wrapping',
detail: parts.join(', ') + ' tree(s), ' + label,
price: tPrice,
meta: { lightingStyle: label }
};
} else if (type === 'garland') {
var garlandQty = parseFloat(document.getElementById('garlandQty').value) || 0;
if (garlandQty <= 0) { return { valid: false }; }
var gSurcharge = GARLAND_SURCHARGE[modifier] || 0;
var gPrice = garlandQty * (GARLAND_PRICE + gSurcharge);

return {
valid: true,
type: 'garland',
label: 'Garland & Wreaths',
detail: garlandQty + ' section(s), ' + label,
price: gPrice,
meta: { lightingStyle: label }
};
} else if (type === 'walkway') {
var walkwayFt = parseFloat(document.getElementById('walkwayFt').value) || 0;
if (walkwayFt <= 0) { return { valid: false }; }
var wRate = WALKWAY_RATE + (WALKWAY_STYLE_RATE[modifier] || 0);
var wPrice = walkwayFt * wRate;

return {
valid: true,
type: 'walkway',
label: 'Walkway / Pathway Lighting',
detail: walkwayFt + ' ft, ' + label,
price: wPrice,
meta: { lightingStyle: label }
};
}
return { valid: false };
}

function addCartItem(item) {
item.id = ++cartCounter;
cart.push(item);
renderCart();
}

function removeCartItem(id) {
cart = cart.filter(function (i) { return i.id !== id; });
renderCart();
}

function renderCart() {
var listEl = document.getElementById('cart-list');
var totalEl = document.getElementById('cart-total');
var noteEl = document.getElementById('cart-note');
var checkoutBtn = document.getElementById('cart-checkout-btn');
var miniCart = document.getElementById('mini-cart');
var miniCartText = document.getElementById('mini-cart-text');
if (!listEl) { return; }

if (!cart.length) {
listEl.innerHTML = '<li class="cart-empty">No items added yet. Add your roofline, trees, garland, or walkway lighting above.</li>';
totalEl.hidden = true;
noteEl.textContent = '';
checkoutBtn.hidden = true;
var existingReservation = document.getElementById('reservation-wrap');
if (existingReservation) { existingReservation.parentNode.removeChild(existingReservation); }
var resultBox = document.getElementById('result');
if (resultBox) { resultBox.hidden = true; }
if (miniCart) { miniCart.hidden = true; }
return;
}

listEl.innerHTML = cart.map(function (item) {
return '<li class="cart-item">' +
'<span class="cart-item-info"><strong>' + item.label + '</strong><br>' + item.detail + '</span>' +
'<span class="cart-item-price">' + formatCurrency(item.price) + '</span>' +
'<button type="button" class="cart-remove-btn" data-id="' + item.id + '" aria-label="Remove item">Remove</button>' +
'</li>';
}).join('');

Array.prototype.forEach.call(listEl.querySelectorAll('.cart-remove-btn'), function (btn) {
btn.addEventListener('click', function () {
removeCartItem(parseInt(btn.getAttribute('data-id'), 10));
});
});

var rawTotal = cart.reduce(function (sum, i) { return sum + i.price; }, 0);
var total = Math.max(rawTotal, MIN_PRICE);

totalEl.hidden = false;
totalEl.textContent = 'Cart Total: ' + formatCurrency(total);

if (total > SOFT_CAP) {
noteEl.textContent = 'Your project is larger than our typical instant range. This total is still a solid starting point - we will confirm final pricing after a quick photo or on-site review.';
} else if (rawTotal < MIN_PRICE) {
noteEl.textContent = 'A ' + formatCurrency(MIN_PRICE) + ' minimum applies to every project, so your total has been adjusted up to the minimum.';
} else {
noteEl.textContent = 'This is a starting estimate, confirmed after a quick photo or on-site review.';
}

checkoutBtn.hidden = false;
lastCartTotal = total;

if (miniCart && miniCartText) {
miniCart.hidden = false;
miniCartText.textContent = cart.length + (cart.length === 1 ? ' item' : ' items') + ' - ' + formatCurrency(total);
}
}

function updateLivePreview() {
var el = document.getElementById('live-preview-price');
if (!el) { return; }
var item = computeCurrentItem();
el.textContent = item.valid ? formatCurrency(item.price) : '$0';
}

function seasonDateRanges() {
var now = new Date();
var currentYear = now.getFullYear();
var installYear = currentYear;
// If we are already in December or later in the year, point at next year's November season.
if (now.getMonth() >= 11) { installYear = currentYear + 1; }
var takedownYear = installYear + 1;
function pad(n) { return n < 10 ? ('0' + n) : String(n); }
return {
installMin: installYear + '-11-01',
installMax: installYear + '-11-30',
takedownMin: takedownYear + '-01-01',
takedownMax: takedownYear + '-01-31'
};
}

function buildReservationForm() {
var ranges = seasonDateRanges();
var wrap = document.createElement('div');
wrap.id = 'reservation-wrap';

wrap.innerHTML =
'<h4>Reserve These Items</h4>' +
'<p>Tell us how to reach you, then pick your install date in November and your takedown date in January. This does not charge you anything or guarantee a date - our team will follow up to confirm both.</p>' +
'<form id="reservation-form">' +
'<label>Your Name<input type="text" id="res-name" required></label>' +
'<label>Email<input type="email" id="res-email" required></label>' +
'<label>Phone<input type="tel" id="res-phone" required></label>' +
'<label>Address<input type="text" id="res-address" placeholder="Street address in the Syracuse area"></label>' +
'<label>Preferred Install Date (November)<input type="date" id="res-date" min="' + ranges.installMin + '" max="' + ranges.installMax + '" required></label>' +
'<label>Preferred Takedown Date (January)<input type="date" id="res-takedown-date" min="' + ranges.takedownMin + '" max="' + ranges.takedownMax + '"></label>' +
'<label>Notes<textarea id="res-notes" rows="2" placeholder="Anything else we should know?"></textarea></label>' +
'<button type="submit" id="res-submit">Request These Dates</button>' +
'<p id="res-status"></p>' +
'</form>';

return wrap;
}

function updateItemFieldsVisibility() {
['roofline', 'trees', 'garland', 'walkway'].forEach(function (t) {
var el = document.getElementById('fields-' + t);
if (el) { el.hidden = (t !== currentItemType); }
});
}

function handleAddToCart() {
var item = computeCurrentItem();
if (!item.valid) { return; }
addCartItem(item);
updateLivePreview();
}

function handleCheckout() {
var resultBox = document.getElementById('result');
if (!resultBox || !cart.length) { return; }
resultBox.hidden = false;

var existingReservation = document.getElementById('reservation-wrap');
if (existingReservation) { existingReservation.parentNode.removeChild(existingReservation); }

var reservationForm = buildReservationForm();
resultBox.appendChild(reservationForm);

document.getElementById('reservation-form').addEventListener('submit', function (e) {
e.preventDefault();
var statusEl = document.getElementById('res-status');
var submitBtn = document.getElementById('res-submit');

var rooflineItem = cart.filter(function (i) { return i.type === 'roofline'; })[0];

var payload = {
name: document.getElementById('res-name').value,
email: document.getElementById('res-email').value,
phone: document.getElementById('res-phone').value,
address: document.getElementById('res-address').value,
preferredDate: document.getElementById('res-date').value,
takedownDate: document.getElementById('res-takedown-date').value,
notes: document.getElementById('res-notes').value,
items: cart.map(function (i) { return { type: i.type, label: i.label, detail: i.detail, price: Math.round(i.price) }; }),
package: cart.map(function (i) { return i.label; }).join(' + '),
sqft: rooflineItem ? rooflineItem.meta.sqft : null,
stories: rooflineItem ? rooflineItem.meta.stories : null,
estimate: Math.round(lastCartTotal)
};

submitBtn.disabled = true;
statusEl.textContent = 'Sending...';

fetch('/api/bookings', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify(payload)
}).then(function (res) {
if (!res.ok) { throw new Error('Request failed'); }
return res.json();
}).then(function () {
statusEl.textContent = 'Thanks! We received your request and will follow up by email or phone to confirm your install and takedown dates.';
document.getElementById('reservation-form').reset();
submitBtn.disabled = false;
}).catch(function () {
statusEl.textContent = 'Something went wrong sending your request. Please call or email us directly for now.';
submitBtn.disabled = false;
});
});

resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.addEventListener('DOMContentLoaded', function () {
var navToggle = document.getElementById('nav-toggle');
var siteNav = document.getElementById('site-nav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', function () {
    var isOpen = siteNav.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  Array.prototype.forEach.call(siteNav.querySelectorAll('a'), function (link) {
    link.addEventListener('click', function () {
      siteNav.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

var itemTypeGrid = document.getElementById('itemTypeGrid');
if (itemTypeGrid) {
Array.prototype.forEach.call(itemTypeGrid.querySelectorAll('.item-type-card'), function (btn) {
btn.addEventListener('click', function () {
currentItemType = btn.getAttribute('data-type');
Array.prototype.forEach.call(itemTypeGrid.querySelectorAll('.item-type-card'), function (b) {
b.classList.remove('active');
});
btn.classList.add('active');
updateItemFieldsVisibility();
updateLivePreview();
});
});
updateItemFieldsVisibility();
}

var addBtn = document.getElementById('add-to-cart-btn');
if (addBtn) { addBtn.addEventListener('click', handleAddToCart); }

var checkoutBtn = document.getElementById('cart-checkout-btn');
if (checkoutBtn) { checkoutBtn.addEventListener('click', handleCheckout); }

var miniCartBtn = document.getElementById('mini-cart-view-btn');
if (miniCartBtn) {
miniCartBtn.addEventListener('click', function () {
var cartBox = document.getElementById('cart-box');
if (cartBox) { cartBox.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});
}

var cartBuilder = document.querySelector('.cart-builder');
if (cartBuilder) {
cartBuilder.addEventListener('input', updateLivePreview);
cartBuilder.addEventListener('change', updateLivePreview);
}

var sqftInput = document.getElementById('sqft');
if (sqftInput) {
sqftInput.addEventListener('input', function () {
measuredFootprintSqFt = null;
measuredPerimeterFt = null;
var mapStatus = document.getElementById('map-status');
if (mapStatus) { mapStatus.textContent = ''; }
});
}

updateLivePreview();
initRoofMap();
});

function geocodeAddress(address) {
var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);
return fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (res) {
if (!res.ok) { throw new Error('Geocoding failed'); }
return res.json();
}).then(function (results) {
if (!results || !results.length) { throw new Error('No results'); }
return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
});
}

function squareMetersToFeet(m2) {
return m2 * 10.7639;
}

function updateMapStatus(text) {
var el = document.getElementById('map-status');
if (el) { el.textContent = text; }
}

function tileXYFromLatLon(lat, lon, zoom) {
  var latRad = (lat * Math.PI) / 180;
  var n = Math.pow(2, zoom);
  var x = Math.floor(((lon + 180) / 360) * n);
  var y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x: x, y: y };
}

function ensureSatelliteImagery(map, attemptsLeft) {
  attemptsLeft = typeof attemptsLeft === 'number' ? attemptsLeft : 4;
  var zoom = map.getZoom();
  if (zoom <= 16 || attemptsLeft <= 0) { return; }
  var center = map.getCenter();
  var tile = tileXYFromLatLon(center.lat, center.lng, zoom);
  var url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/' + zoom + '/' + tile.y + '/' + tile.x;
  fetch(url).then(function (r) { return r.blob(); }).then(function (blob) {
    if (blob.size < 6000 && map.getZoom() === zoom) {
      map.setZoom(zoom - 1);
      ensureSatelliteImagery(map, attemptsLeft - 1);
    }
  }).catch(function () {});
}

function fetchBuildingFootprint(lat, lon) {
var query = '[out:json][timeout:25];way(around:25,' + lat + ',' + lon + ')["building"];out geom;';
var url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
return fetch(url).then(function (res) {
if (!res.ok) { throw new Error('Overpass request failed'); }
return res.json();
}).then(function (data) {
if (!data.elements || !data.elements.length) { throw new Error('No buildings found'); }
var point = turf.point([lon, lat]);
var best = null;

data.elements.forEach(function (el) {
if (best || !el.geometry || el.geometry.length < 3) { return; }
var coords = el.geometry.map(function (g) { return [g.lon, g.lat]; });
if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
coords.push(coords[0]);
}
var poly;
try { poly = turf.polygon([coords]); } catch (e) { return; }
if (turf.booleanPointInPolygon(point, poly)) { best = coords; }
});

if (!best) {
var closestDist = Infinity;
data.elements.forEach(function (el) {
if (!el.geometry || el.geometry.length < 3) { return; }
var coords = el.geometry.map(function (g) { return [g.lon, g.lat]; });
if (coords[0][0] !== coords[coords.length - 1][0] || coords[0][1] !== coords[coords.length - 1][1]) {
coords.push(coords[0]);
}
var poly;
try { poly = turf.polygon([coords]); } catch (e) { return; }
var c = turf.centroid(poly).geometry.coordinates;
var d = turf.distance(point, turf.point(c), { units: 'meters' });
if (d < closestDist) { closestDist = d; best = coords; }
});
}

if (!best) { throw new Error('No usable building geometry'); }
return best;
});
}

function onRoofDrawn(layer) {
var useBtn = document.getElementById('map-use-btn');
var clearBtn = document.getElementById('map-clear-btn');
var previewBtn = document.getElementById('map-preview-btn');
clearLightPreview();
var geojson = layer.toGeoJSON();

var areaM2 = turf.area(geojson);
var areaFt2 = squareMetersToFeet(areaM2);

var line = turf.polygonToLine(geojson);
var perimeterKm = turf.length(line, { units: 'kilometers' });
var perimeterFt = perimeterKm * 3280.84;

measuredFootprintSqFt = Math.round(areaFt2);
measuredPerimeterFt = Math.round(perimeterFt);

updateMapStatus('Traced roof: about ' + measuredFootprintSqFt + ' sq ft, ' + measuredPerimeterFt + ' ft of roofline.');

if (useBtn) { useBtn.hidden = false; }
if (clearBtn) { clearBtn.hidden = false; }
if (previewBtn) { previewBtn.hidden = false; }
}

function clearLightPreview() {
if (lightBulbLayer && roofMap) { roofMap.removeLayer(lightBulbLayer); }
lightBulbLayer = null;
}

function bulbColorFor(styleIndex, i) {
var palette;
if (styleIndex === 0) { return '#ffd27a'; }
if (styleIndex === 1) {
palette = ['#ff4d4d', '#4da6ff', '#ffd24d', '#4dff88', '#c04dff'];
return palette[i % palette.length];
}
if (styleIndex === 2) {
palette = ['#ffb347', '#ff6666', '#66b3ff', '#ffdb4d'];
return palette[i % palette.length];
}
palette = ['#ff0000', '#ff8000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#8000ff'];
return palette[i % palette.length];
}

function bulbIconFor(color, big, delay) {
var size = big ? 14 : 9;
return L.divIcon({
className: '',
html: '<div class="light-bulb-dot" style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';box-shadow:0 0 6px 2px ' + color + ';border-radius:50%;animation-delay:' + delay + 's;"></div>',
iconSize: [size, size],
iconAnchor: [size / 2, size / 2]
});
}

function previewLights() {
if (!roofMap || !roofDrawnItems || !roofDrawnItems.getLayers().length) {
updateMapStatus('Trace or auto-detect your roofline first, then preview your lights.');
return;
}
clearLightPreview();
var layer = roofDrawnItems.getLayers()[0];
var geojson = layer.toGeoJSON();
var line;
try {
line = turf.polygonToLine(geojson);
} catch (e) {
return;
}
var totalLen = turf.length(line, { units: 'meters' });
if (!totalLen || totalLen <= 0) { return; }
var styleSelect = document.getElementById('lightingStyle');
var styleIndex = styleSelect ? styleSelect.selectedIndex : 0;
if (styleIndex < 0) { styleIndex = 0; }
var big = styleIndex === 2;
var spacing = big ? 1.0 : 0.6;
var maxBulbs = 220;
var count = Math.min(maxBulbs, Math.max(1, Math.floor(totalLen / spacing)));
spacing = totalLen / count;
lightBulbLayer = L.layerGroup();
for (var i = 0; i <= count; i++) {
var d = i * spacing;
var pt = turf.along(line, d, { units: 'meters' });
var coords = pt.geometry.coordinates;
var color = bulbColorFor(styleIndex, i);
var marker = L.marker([coords[1], coords[0]], { icon: bulbIconFor(color, big, (i % 10) * 0.08), interactive: false });
lightBulbLayer.addLayer(marker);
}
lightBulbLayer.addTo(roofMap);
updateMapStatus('Light preview added along your roofline. Pick a different lighting style above to see it update here.');
}

function initRoofMap() {
var searchBtn = document.getElementById('map-search-btn');
var addressInput = document.getElementById('map-address');
var useBtn = document.getElementById('map-use-btn');
var clearBtn = document.getElementById('map-clear-btn');
var previewBtn = document.getElementById('map-preview-btn');

if (!searchBtn || typeof L === 'undefined') { return; }

searchBtn.addEventListener('click', function () {
var address = addressInput.value.trim();
if (!address) {
updateMapStatus('Enter an address first.');
return;
}

updateMapStatus('Looking up your address...');

geocodeAddress(address).then(function (loc) {
var mapEl = document.getElementById('roof-map');
mapEl.style.display = 'block';

if (!roofMap) {
roofMap = L.map('roof-map').setView([loc.lat, loc.lon], 20);
        ensureSatelliteImagery(roofMap);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
maxZoom: 21,
attribution: 'Tiles &copy; Esri'
}).addTo(roofMap);

roofDrawnItems = new L.FeatureGroup();
roofMap.addLayer(roofDrawnItems);

var drawControl = new L.Control.Draw({
draw: {
polygon: true,
polyline: false,
circle: false,
circlemarker: false,
marker: false,
rectangle: false
},
edit: {
featureGroup: roofDrawnItems
}
});
roofMap.addControl(drawControl);

roofMap.on(L.Draw.Event.CREATED, function (event) {
roofDrawnItems.clearLayers();
roofDrawnItems.addLayer(event.layer);
onRoofDrawn(event.layer);
});

roofMap.on(L.Draw.Event.EDITED, function (event) {
event.layers.eachLayer(function (layer) {
onRoofDrawn(layer);
});
});
} else {
roofMap.setView([loc.lat, loc.lon], 20);
      ensureSatelliteImagery(roofMap);
}

updateMapStatus('Found it! Looking up your building outline...');

fetchBuildingFootprint(loc.lat, loc.lon).then(function (coords) {
var latlngs = coords.map(function (c) { return [c[1], c[0]]; });
roofDrawnItems.clearLayers();
clearLightPreview();
var polygon = L.polygon(latlngs);
roofDrawnItems.addLayer(polygon);
onRoofDrawn(polygon);
updateMapStatus('Auto-detected your building footprint: ' + measuredFootprintSqFt + ' sq ft, ' + measuredPerimeterFt + ' ft of roofline. Drag the corner handles with the edit tool above the map if it needs adjusting, or clear it to trace manually.');
}).catch(function () {
updateMapStatus('Found it! We could not auto-detect your building outline here, so please trace your roofline with the polygon tool on the map.');
});
}).catch(function () {
updateMapStatus('Could not find that address. Try including city and state.');
});
});

if (useBtn) {
useBtn.addEventListener('click', function () {
if (measuredFootprintSqFt && measuredPerimeterFt) {
var sqftField = document.getElementById('sqft');
if (sqftField) { sqftField.value = measuredFootprintSqFt; }
updateMapStatus('Using traced measurement: ' + measuredFootprintSqFt + ' sq ft, ' + measuredPerimeterFt + ' ft of roofline. Calculate your estimate below.');
updateLivePreview();
}
});
}

if (previewBtn) {
previewBtn.addEventListener('click', previewLights);
}

var lightingStyleSelect = document.getElementById('lightingStyle');
if (lightingStyleSelect) {
lightingStyleSelect.addEventListener('change', function () {
if (lightBulbLayer) { previewLights(); }
});
}

if (clearBtn) {
clearBtn.addEventListener('click', function () {
if (roofDrawnItems) { roofDrawnItems.clearLayers(); }
measuredFootprintSqFt = null;
measuredPerimeterFt = null;
clearLightPreview();
useBtn.hidden = true;
clearBtn.hidden = true;
if (previewBtn) { previewBtn.hidden = true; }
updateMapStatus('Trace cleared. Draw a new polygon on the map.');
updateLivePreview();
});
}
}

document.addEventListener('DOMContentLoaded', function () {
var animatedSections = document.querySelectorAll('.fade-in-section');
if ('IntersectionObserver' in window) {
var observer = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
entry.target.classList.add('visible');
observer.unobserve(entry.target);
}
});
}, { threshold: 0.01, rootMargin: '0px 0px 200px 0px' });
Array.prototype.forEach.call(animatedSections, function (el) { observer.observe(el); });
} else {
Array.prototype.forEach.call(animatedSections, function (el) { el.classList.add('visible'); });
}
});

document.addEventListener('DOMContentLoaded', function () {
var lightbox = document.getElementById('lightbox');
var lightboxImg = document.getElementById('lightbox-img');
var lightboxCaption = document.getElementById('lightbox-caption');
var lightboxClose = document.getElementById('lightbox-close');
var galleryGrid = document.getElementById('gallery-grid');
if (!lightbox || !galleryGrid) { return; }

function openLightbox(figure) {
var img = figure.querySelector('img');
if (!img) { return; }
lightboxImg.src = img.src.replace('w=1200', 'w=1600');
lightboxImg.alt = img.alt;
lightboxCaption.textContent = figure.getAttribute('data-caption') || '';
lightbox.hidden = false;
}

function closeLightbox() {
lightbox.hidden = true;
lightboxImg.src = '';
}

Array.prototype.forEach.call(galleryGrid.querySelectorAll('.gallery-figure'), function (figure) {
figure.addEventListener('click', function () { openLightbox(figure); });
});

if (lightboxClose) { lightboxClose.addEventListener('click', closeLightbox); }
lightbox.addEventListener('click', function (e) {
if (e.target === lightbox) { closeLightbox(); }
});
document.addEventListener('keydown', function (e) {
if (e.key === 'Escape' && !lightbox.hidden) { closeLightbox(); }
});
});


document.addEventListener('DOMContentLoaded', function () {
  var faqItems = document.querySelectorAll('.faq-item');
  Array.prototype.forEach.call(faqItems, function (item) {
    var question = item.querySelector('h3');
    var answer = item.querySelector('p');
    if (!question || !answer) { return; }
    question.classList.add('faq-question');
    question.setAttribute('role', 'button');
    question.setAttribute('tabindex', '0');
    answer.classList.add('faq-answer');
    function toggleFaq() {
      var isOpen = item.classList.contains('faq-open');
      Array.prototype.forEach.call(faqItems, function (other) {
        other.classList.remove('faq-open');
      });
      if (!isOpen) { item.classList.add('faq-open'); }
    }
    question.addEventListener('click', toggleFaq);
    question.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFaq();
      }
    });
  });
  if (faqItems.length > 0) { faqItems[0].classList.add('faq-open'); }
});
