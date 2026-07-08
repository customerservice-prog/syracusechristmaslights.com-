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

                                                if (result.overCap) {
                                                  priceEl.textContent = 'Custom quote needed';
                                                  noteEl.textContent = 'Your project looks larger or more complex than our instant calculator covers. Reach out and we will build a custom quote.';
                                                } else {
                                                  priceEl.textContent = formatCurrency(result.total) + ' estimated';
                                                  noteEl.textContent = 'Based on an estimated ' + result.perimeter.toFixed(0) + ' ft of roofline. This is a starting estimate, confirmed after a quick photo or on-site review.';
                                                }

                                                resultBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          });
});
