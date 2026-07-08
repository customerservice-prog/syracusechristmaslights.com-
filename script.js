// Syracuse Christmas Lights - instant estimate calculator
// Formula source: docs/pricing-logic.md
// Note: the #stories select stores the story multiplier directly
// (1, 1.15, or 1.3), matching docs/pricing-logic.md step 3.

var SHAPE_FACTOR = 1.15;
var MIN_PRICE = 275;
var MAX_INSTANT_QUOTE = 3000;
var SMALL_TREE_PRICE = 45;
var LARGE_TREE_PRICE = 85;
var GARLAND_PRICE = 35;
var PERMANENT_UPGRADE_PER_FT = 3;

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

function calculateEstimate(inputs) {
  var storyCount = storyCountForMultiplier(inputs.storyMultiplier);
  var footprint = inputs.sqft / storyCount;
  var perimeter = 4 * Math.sqrt(footprint) * SHAPE_FACTOR;

var basePrice = perimeter * inputs.tierRate * inputs.storyMultiplier;

var addOnTotal = 0;
  addOnTotal += inputs.smallTrees * SMALL_TREE_PRICE;
  addOnTotal += inputs.largeTrees * LARGE_TREE_PRICE;
  addOnTotal += inputs.garland * GARLAND_PRICE;

if (inputs.permanent) {
  addOnTotal += perimeter * PERMANENT_UPGRADE_PER_FT;
}

var total = basePrice + addOnTotal;

if (total < MIN_PRICE) {
  total = MIN_PRICE;
}

return {
  perimeter: perimeter,
  total: total,
  overCap: total > MAX_INSTANT_QUOTE
};
}

function formatCurrency(amount) {
  return '$' + amount.toFixed(0);
}

var lastEstimate = null;

function buildReservationForm() {
  var wrap = document.createElement('div');
  wrap.id = 'reservation-wrap';

wrap.innerHTML =
  '<h4>Reserve This Estimate</h4>' +
  '<p>Tell us how to reach you and your preferred install window. This does not charge you anything or guarantee a date - our team will follow up to confirm.</p>' +
  '<form id="reservation-form">' +
  '<label>Your Name<input type="text" id="res-name" required></label>' +
  '<label>Email<input type="email" id="res-email" required></label>' +
  '<label>Phone<input type="tel" id="res-phone" required></label>' +
  '<label>Address<input type="text" id="res-address" placeholder="Street address in the Syracuse area"></label>' +
  '<label>Preferred Install Date<input type="date" id="res-date"></label>' +
  '<label>Notes<textarea id="res-notes" rows="2" placeholder="Anything else we should know?"></textarea></label>' +
  '<button type="submit" id="res-submit">Request This Date</button>' +
  '<p id="res-status"></p>' +
  '</form>';

return wrap;
}

document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('estimate-form');
  if (!form) { return; }

                          form.addEventListener('submit', function (event) {
                            event.preventDefault();

                                                var sqft = parseFloat(document.getElementById('sqft').value) || 0;
                            var storyMultiplier = parseFloat(document.getElementById('stories').value) || 1;
                            var tierRate = parseFloat(document.getElementById('tier').value) || 7;
                            var smallTrees = parseFloat(document.getElementById('smallTrees').value) || 0;
                            var largeTrees = parseFloat(document.getElementById('largeTrees').value) || 0;
                            var garland = parseFloat(document.getElementById('garland').value) || 0;
                            var permanent = document.getElementById('permanent').checked;

                                                var result = calculateEstimate({
                                                  sqft: sqft,
                                                  storyMultiplier: storyMultiplier,
                                                  tierRate: tierRate,
                                                  smallTrees: smallTrees,
                                                  largeTrees: largeTrees,
                                                  garland: garland,
                                                  permanent: permanent
                                                });

                                                var resultBox = document.getElementById('result');
                            var priceEl = document.getElementById('result-price');
                            var noteEl = document.getElementById('result-note');

                                                resultBox.hidden = false;

                                                var existingReservation = document.getElementById('reservation-wrap');
                            if (existingReservation) {
                              existingReservation.parentNode.removeChild(existingReservation);
                            }

                                                if (result.overCap) {
                                                  priceEl.textContent = 'Custom quote needed';
                                                  noteEl.textContent = 'Your project looks larger or more complex than our instant calculator covers. Reach out and we will build a custom quote.';
                                                  lastEstimate = null;
                                                } else {
                                                  priceEl.textContent = formatCurrency(result.total) + ' estimated';
                                                  noteEl.textContent = 'Based on an estimated ' + result.perimeter.toFixed(0) + ' ft of roofline. This is a starting estimate, confirmed after a quick photo or on-site review.';

                            lastEstimate = {
                              sqft: sqft,
                              stories: storyCountForMultiplier(storyMultiplier),
                              package: tierLabelForRate(tierRate),
                              addons: {
                                smallTrees: smallTrees,
                                largeTrees: largeTrees,
                                garland: garland,
                                permanent: permanent
                              },
                              estimate: Math.round(result.total)
                            };

                            var reservationForm = buildReservationForm();
                                                  resultBox.appendChild(reservationForm);

                            document.getElementById('reservation-form').addEventListener('submit', function (e) {
                              e.preventDefault();
                              var statusEl = document.getElementById('res-status');
                              var submitBtn = document.getElementById('res-submit');
                              var payload = {
                                name: document.getElementById('res-name').value,
                                email: document.getElementById('res-email').value,
                                phone: document.getElementById('res-phone').value,
                                address: document.getElementById('res-address').value,
                                preferredDate: document.getElementById('res-date').value,
                                notes: document.getElementById('res-notes').value,
                                sqft: lastEstimate.sqft,
                                stories: lastEstimate.stories,
                                package: lastEstimate.package,
                                addons: lastEstimate.addons,
                                estimate: lastEstimate.estimate
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
                                                                                           statusEl.textContent = 'Thanks! We received your request and will follow up by email or phone to confirm your date.';
                                                                                           document.getElementById('reservation-form').reset();
                                                                                           submitBtn.disabled = false;
                                                                                         }).catch(function () {
                                                                                           statusEl.textContent = 'Something went wrong sending your request. Please call or email us directly for now.';
                                                                                           submitBtn.disabled = false;
                                                                                         });
                            });
                                                }

                                                resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          });
});
