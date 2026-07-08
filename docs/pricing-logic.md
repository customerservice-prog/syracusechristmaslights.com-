# Pricing Calculator Logic

This defines the formula the site's instant estimate tool should use. It is grounded in docs/market-research.md and is meant to be implemented client-side in script.js, then later moved server-side once a real property-data API is added.

## Inputs collected from the visitor
- Total house square footage (manual entry for now; see note below on automated lookup)
- Number of stories: 1, 2, or 3 plus
- Package tier: Basic, Standard, or Premium
- Add-ons: number of trees to wrap (small or large), garland or wreath count, permanent year-round housing upgrade yes or no

## Step 1: Estimate roofline linear footage from square footage
Most visitors do not know their linear footage, so estimate it from the footprint.

  footprint_sqft = total_house_sqft divided by number_of_stories
    estimated_perimeter_ft = 4 times the square root of footprint_sqft, times a shape factor
      shape_factor default = 1.15 to account for non-square footprints, bump-outs, and garages

      ## Step 2: Base rate per linear foot by package tier
      - Basic: 4.50 dollars per ft, single strand, one color, customer handles takedown
      - Standard: 7.00 dollars per ft, roofline and gutters, professional takedown included
      - Premium: 10.00 dollars per ft, roofline, gutters and accents, storage included

      ## Step 3: Story multiplier for labor complexity at height
      - 1 story: times 1.0
      - 2 story: times 1.15
      - 3 plus story: times 1.3

      ## Step 4: Add-ons, flat amount per item
      - Small tree wrap: 45 dollars each
      - Large tree wrap: 85 dollars each
      - Garland or wreath: 35 dollars each
      - Permanent housing upgrade: plus 3.00 dollars per ft

      ## Combined formula
      estimated_price = estimated_perimeter_ft times tier_rate times story_multiplier, plus the sum of all add-ons

      ## Guardrails
      - Minimum job charge: 275 dollars, matching the low end of the local market for small properties
      - Instant online quotes cap out around 3,000 dollars; above that, show a custom quote request instead of instant checkout, since large or complex jobs vary too much for a flat formula
      - Always label the result as an estimate, confirmed after a short photo or on-site review

      ## Note on automated house-size lookup
      True automatic square footage or roofline detection needs a paid data source, such as a solar or building-insights API, or a county GIS parcel lookup, plus a server-held API key. That integration belongs in a later development phase with a real backend, not in the browser-based prototype, since keys must never live in client-side code. Until then, the calculator should accept manual entry with a short explanation of why an exact on-site measurement will confirm the final price.
      
