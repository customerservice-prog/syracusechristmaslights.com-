# Technical Specification: syracusechristmaslights.com Platform

Goal: a marketing site with an instant price calculator, online booking with a Stripe deposit, and an admin backend for scheduling, customer records, inventory, and payment tracking. Deployment target is Railway (frontend, backend, and Postgres).

## Recommended architecture
- Frontend: Next.js (React), covering the marketing site, calculator, and booking flow
- Backend: Node.js/Express or Next.js API routes as a REST API
- Database: PostgreSQL, using Railway managed Postgres
- Admin auth: simple email and password or magic-link login, admin role only
- Payments: Stripe Checkout plus webhooks, added last per owner's plan
- Hosting: Railway for frontend, backend, Postgres, and any background jobs
- Optional house-size data source: a solar or building-insights API, or a county GIS parcel API, called only from the server, with the key stored in Railway environment variables, never in frontend code

## Core data models
- Customer: name, address, phone, email, notes
- Quote: customer reference, size and story inputs, package tier, add-ons, calculated price, status such as draft, booked, or expired
- Booking: quote reference, scheduled install date, scheduled removal date, assigned crew, status
- Payment: booking reference, Stripe payment intent id, amount, type such as deposit or final, status
- InventoryItem: name, category such as lights, clips, timers, or extension cords, quantity on hand, quantity reserved, reorder threshold
- CalendarEvent: linked booking or internal event, date and time, crew, event type such as install, removal, or consult

## Key flows
1. A visitor enters approximate square footage, story count, and package tier, and the calculator (see docs/pricing-logic.md) returns an instant estimate.
2. The visitor books a slot, which creates a Quote and a tentative Booking, then is redirected to Stripe Checkout for a deposit.
3. A Stripe webhook confirms payment; the Booking is marked confirmed, the calendar slot is locked, inventory is reserved based on estimated linear footage, and a confirmation email is sent.
4. The admin dashboard provides a calendar view of install and removal jobs by crew, a customer list, inventory levels with low-stock alerts, a payments ledger, and job detail pages with before and after photos.
5. After the season, the flow supports removal scheduling, inventory restock, and review requests.

## Phased build plan
- Phase 1, now: static marketing site with a working client-side calculator and finished content, no payments yet.
- Phase 2: booking form plus database and admin dashboard for calendar, customers, and inventory, using manual or invoice-based payment instead of live Stripe.
- Phase 3: Stripe Checkout and webhooks for deposits and final payment, once the owner has created a Stripe account and generated keys.
- Phase 4: automated house-size lookup through a paid property-data API, to reduce manual entry.

## Security notes
- All secrets, including the Stripe secret key, any Google or GIS API key, and database credentials, belong in Railway environment variables, never committed to the repository and never entered by a browser assistant.
- The admin dashboard must sit behind authentication before any real deployment goes live.
- Customer payment details should never touch this codebase directly; Stripe Checkout or Stripe Elements should handle all card data so it never passes through the app's own servers.
