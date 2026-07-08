# Syracuse Christmas Lights

Marketing site and instant price calculator for a Christmas light installation business serving Syracuse, NY. This is a phase 1 prototype: a working static site with a client-side price estimator. No payments or backend yet.

## What's here
- index.html, style.css, script.js: a working marketing site with an instant estimate calculator (no build step needed, just open index.html or deploy the folder as-is)
- docs/market-research.md: competitor and regional pricing research
- docs/pricing-logic.md: the formula the calculator implements
- docs/site-content.md: source copy for the site
- docs/technical-spec.md: the full plan for phase 2 and 3, including the booking, calendar, inventory, and Stripe-based backend, targeted at Railway

## Current status
Phase 1 only: static site plus calculator, deployed as plain HTML/CSS/JS. No database, no booking backend, and no Stripe integration yet, by design, since Stripe setup is intentionally being done last.

## Next steps
See docs/technical-spec.md for the phased build plan toward a full booking and operations platform on Railway. Any future API keys or secrets (Stripe, Google or GIS data, database credentials) must be added directly in Railway's environment variables, never committed to this repository.
