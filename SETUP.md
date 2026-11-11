# Setup and deployment

Use Node 22. Run `npm ci`, copy `.env.example` to `.env.local`, configure the values, then run `npm run dev`. Without credentials, the storefront shows a setup notice and empty inventory; no simulated backend is used.

## Supabase

Create a free project and run `supabase/migrations/001_store.sql` once in its SQL editor. This creates tables, RLS, transactional checkout, order-update functions and a public image bucket with admin-only writes. Set the project URL, anon key and server-only service role key in the environment. Never commit secrets.

Create the first administrator manually in Supabase Authentication. Disable public signup. Run `insert into public.admins(user_id) values ('THE_AUTH_USER_UUID');` in the SQL editor. Sign in at `/admin/login`. No app endpoint creates admin memberships. Add products, delivery charges, payment numbers and store policies. Uncheck Active to archive products without deleting purchase history. Gallery URL order controls image order; the first is primary. Removing a URL detaches the image; storage objects require manual cleanup. Optional `supabase/seed.sql` contains explicitly labeled development samples.

## Netlify

Push source to GitHub and import the repository into Netlify. Choose `main`, enable automatic deployments, and use the committed `netlify.toml` (`npm run build`, `.next`, Node 22). Netlify detects Next.js and supplies its server runtime. Set all three environment variables for builds and runtime in Netlify. Configure the resulting production URL in Supabase Auth settings. Use the free Netlify subdomain; no paid domain is required. Database changes appear on refresh without redeployment.

Supabase and Netlify accounts/deployments are not provisioned by this repository. Live integration needs owner credentials and service connections. Monitor free-tier limits.

## Security and verification

Checkout calculates prices and shipping in PostgreSQL, locks product rows, decrements stock and creates customer/order/item snapshots in one transaction. A unique idempotency key prevents duplicate retries. Normalized phone numbers have a uniqueness constraint. Manual payments start unverified. Cancellation restores stock once, and restoration checks availability. RLS protects customer data and admin changes. Public settings must never contain secrets.

Run `npm run typecheck`, `npm run lint`, `npm run build`, and `node --experimental-strip-types --test tests/checkout.test.ts`.

Before launch test against a dedicated Supabase project: anonymous and non-admin access denial; image uploads; add/edit/archive products; guest checkout; concurrent orders against stock 1; duplicate checkout key retries; all three Bangladesh phone formats matching one customer; repeated cancellation/restoration; unchanged historical prices; keyboard dialog behavior and mobile layouts; Netlify runtime and automatic deployment. These live checks need configured services.

## Known remaining work

Catalog initially fetches up to 500 products and progressively displays 12. Admin tables currently load all records; server pagination is needed for growth. Customer sorting/statistics and order date/status filters are not yet as extensive as the full specification. Category cover images, logo rendering, and a separate product-images table are not implemented; gallery URLs use an ordered array. Images use lazy native rendering, not a configured production image optimizer. Add durable rate limiting or bot protection before public checkout at scale. No automated payment verification, SMS, or email provider is integrated. Live database/security/concurrency tests and Netlify deployment remain unverified until services are configured.
