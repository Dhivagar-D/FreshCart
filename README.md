# 🥬 FreshCart – Hyperlocal B2B Marketplace for Fresh Produce Procurement

FreshCart is a production-oriented, full-stack B2B e-commerce platform connecting regional farmers and agricultural producers directly with restaurants, hotels, cafes, and commercial catering kitchens.

---

## 🌟 Key Features

1. **Strict 20 km Hyperlocal Vendor Discovery:**
   - Powered by MongoDB **GeoJSON Point** and **`2dsphere`** indexing.
   - Enforces a strict 20,000-meter straight-line radius on the backend.
   - Live OpenFreeMap/MapLibre map displaying buyer and vendor proximity.

2. **Multi-Vendor Cart & Single Checkout:**
   - Restaurant buyers can add items from multiple distinct farmers into one cart.
   - Items are dynamically grouped by supplier with vendor-specific subtotals and MOQ checks.

3. **Multi-Vendor Order Splitting:**
   - A single buyer checkout splits into independent child vendor orders.
   - Uses conditional atomic stock decrements; transaction/saga compensation is still a production hardening task.
   - Each supplier fulfills and tracks their own orders independently.

4. **Marketplace Payments & Commissions:**
   - Razorpay order creation and signed webhook verification are implemented when credentials are configured.
   - Vendor payout/commission calculations are recorded; automatic split transfers and settlement ledger are not yet enabled.
   - Configurable platform commission (default 5.0%) and audit logging.

5. **Automated PDF Invoicing & In-Browser Download:**
   - Built-in **PDFKit** engine streams legal tax invoices on the fly.
   - Generates PDF invoices from checkout and split vendor order data; verify tax/legal invoice fields with an accountant before launch.

6. **Role-Based Portals:**
   - **Buyer:** Discovery map, produce catalog, multi-vendor cart, order history & PDF invoices.
   - **Vendor:** Inventory management, live stock adjuster, incoming orders fulfillment stepper.
   - **Admin:** Marketplace GMV, commission fee updater, KYC vendor verification, live audit trail.

---

## 🔑 Local demo credentials (only after explicit demo seeding)

| Role | Email | Password | Coordinates / Notes |
|---|---|---|---|
| **Restaurant Buyer** | `buyer@freshcart.local` | `password123` | RS Puram, Coimbatore `[76.9558, 11.0168]` |
| **Vendor 1 (~1.4 km)** | `anand@farmfresh.local` | `password123` | Coimbatore Farm Fresh Produce |
| **Vendor 2 (~3.9 km)** | `suresh@kovaigreens.local` | `password123` | Kovai Agro Greens & Fruits |
| **Vendor 3 (~7.8 km)** | `mahesh@coimbatoredairy.local` | `password123` | Coimbatore Valley Dairy & Farmstead |
| **Vendor 4 (~28.8 km)** | `ramesh@pollachidrygoods.local` | `password123` | *Strictly excluded from 20km search!* |
| **Administrator** | `admin@freshcart.local` | `admin123` | Platform operations & GMV analytics |

---

## 🚀 Running the Application

Install dependencies first: `npm install --prefix server` and `npm install --prefix client`. Configure `server/.env` as described below. For demo accounts, explicitly set `SEED_DEMO_DATA=true` before the first server start; this deletes existing demo collections.

Build the frontend for the single-server deployment with `npm run build --prefix client`.

### Option A: Run Full-Stack Server (Serves both API and Built Client UI)
```bash
npm run server
```
Visit: **http://localhost:5000**

### Option B: Run with Vite Hot-Reloading Development Server
Terminal 1 (Backend API):
```bash
npm run server
```

Terminal 2 (Vite Frontend):
```bash
npm run client
```
Visit: **http://localhost:5173**. For a LAN browser, use the host machine's
LAN address, for example `http://192.168.56.1:5173`.
*(API requests are automatically proxied to port 5000)*

### Option C: Run with Docker Compose

```bash
docker compose up -d --build
```

Open the client at **http://localhost:5174**. The API is available at
**http://localhost:5001** because port 5000 may already be used by a local
development server. MongoDB runs in the `freshcart-mongo` container with a
persistent Docker volume. To inspect this Docker database in MongoDB Compass,
connect to `mongodb://127.0.0.1:27018/freshcart`; port 27017 may belong to a
separate Windows MongoDB installation.

### Option D: Deploy to a VPS with Docker Compose

The production stack is separate from the development stack:
`docker-compose.production.yml` runs MongoDB on the private Docker network,
builds the React application into an Nginx image, and exposes only HTTP on
port 80. Do not expose MongoDB or the Express port directly to the internet.

On a new Ubuntu VPS:

```bash
sudo apt update
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable --now docker
git clone <your-repository-url> freshcart
cd freshcart
cp .env.production.example .env.production
```

Edit `.env.production` and replace every placeholder. Generate hex-only
secrets so they can safely be used in the MongoDB connection string:

```bash
openssl rand -hex 32   # MONGO_ROOT_PASSWORD
openssl rand -hex 48   # JWT_SECRET
```

Set `FRONTEND_URL` to the final HTTPS origin, for example
`https://freshcart.example.com`. Before exposing the site publicly, put
Nginx, Caddy, or a cloud load balancer with TLS in front of port 80. The
application itself must remain configured with `NODE_ENV=production`,
`ALLOW_EPHEMERAL_DB=false`, and `SEED_DEMO_DATA=false`.

Start and verify the stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
curl http://127.0.0.1/api/health
```

Create the first administrator without demo seeding:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml \
  exec server node src/createAdmin.js
```

The production MongoDB data is stored in the `freshcart-mongo-data` Docker
volume. Back it up before upgrades and keep an off-server copy. Configure
HTTPS, firewall ports 22/80/443, SSH keys, automatic security updates, and
off-site MongoDB backups before accepting real customer orders.

### Option E: Deploy to Render

Render does not provide a MongoDB service for this application. Create a
MongoDB Atlas cluster first, allow Render's outbound access as appropriate,
create a database user, and copy the Atlas connection string for the
`freshcart` database. Do not use the local Docker MongoDB URL on Render.

The repository includes [render.yaml](./render.yaml) and
[Dockerfile.render](./Dockerfile.render). In Render:

1. Push this repository to GitHub or another Git provider.
2. Select **New > Blueprint** and connect the repository.
3. Keep the blueprint service name `freshcart`.
4. Set `MONGO_URI` to the MongoDB Atlas connection string.
5. Set `FRONTEND_URL` to the final Render URL, for example
   `https://freshcart.onrender.com`.
6. Confirm `NODE_ENV=production`, `ALLOW_EPHEMERAL_DB=false`, and
   `SEED_DEMO_DATA=false`.
7. Add Razorpay credentials only when online payments are ready; use test
   credentials first.
8. Deploy and wait for `/api/health` to pass.

The Render service serves both the React UI and Express API from one origin,
so browser requests continue to use relative `/api/...` paths. The service
uses the `PORT` value supplied by Render automatically.

After the first successful deployment, open the Render service Shell and run
the admin bootstrap command. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and
`ADMIN_PASSWORD` as secret environment variables first; the password must be
at least 14 characters:

```bash
node src/createAdmin.js
```

Do not enable `SEED_DEMO_DATA` on Render. It is destructive and disabled in
production by design. On the Render free plan, the service may sleep when
idle; use a paid instance for reliable marketplace availability. Configure
Razorpay webhooks to use:
`https://<your-render-service>.onrender.com/api/payments/webhook`.

---

## 🧪 Testing the 20 km Rule

1. Open the **Nearby Vendors** tab.
2. Note that the 3 vendors at approximately 1.4 km, 4.2 km, and 8.3 km are listed as eligible.
3. Observe that **Rural Agro Hub (approximately 27.5 km)** is strictly filtered out by the MongoDB geospatial engine.
4. Use the **Buyer Location** pill in the top header to switch your coordinates and watch the OpenFreeMap view update dynamically.

## 🗺️ OpenFreeMap integration

The client uses MapLibre GL JS with the public OpenFreeMap Liberty style:
`https://tiles.openfreemap.org/styles/liberty`. No API key is required. The
OpenFreeMap source repository can be cloned for local tile/style development:

```bash
gh repo clone hyperknot/openfreemap
```

The map is centered on the selected buyer coordinates and places eligible
vendors in green, excluded vendors in red, and the buyer in blue.


## Production-hardening additions

This update preserves the existing React + Express + MongoDB modular-monolith structure and adds the following foundations:

- **Security:** CORS allowlist from `FRONTEND_URL`, JWT secrets must be configured (no hardcoded fallback), role validation prevents public admin registration, and vendor listings/actions require admin approval.
- **Persistent data:** the server fails to start if MongoDB is unavailable unless the development-only `ALLOW_EPHEMERAL_DB=true` option is explicitly enabled. Do not enable ephemeral storage in production.
- **Real Razorpay flow:** `POST /api/payments/create-intent` creates a real Razorpay order using server-side credentials; `POST /api/payments/webhook` verifies the HMAC signature on the raw body and only then confirms payment. `POST /api/payments/refund` is admin-only and requests a full provider refund. Configure the webhook URL in Razorpay Dashboard and subscribe to `payment.captured`, `order.paid`, and `payment.failed`.
- **Freshness metadata:** products support harvest date, grade, expected availability, shelf-life days, origin, and organic-certification flag. These are supplier-provided claims; certification should be checked before being advertised as verified.
- **Fulfillment controls:** vendor order status transitions are validated, vendor ownership is checked, order changes are recorded, and stock is restored on cancellation/payment failure. Delivery partner/tracking/proof fields are included in the order model.
- **Scheduled purchasing API:** `/api/scheduled-orders` supports buyer-owned weekly/biweekly/monthly purchase templates, pausing, editing the next run date, and deletion. This stores schedules; it does **not** automatically place orders or charge buyers. A worker/queue and buyer confirmation flow are required before enabling automatic recurring purchases.
- **Demand planning baseline:** `GET /api/products/forecast/summary` returns a transparent 30-day moving-average baseline and seven-day reorder suggestion. It is a planning estimate, not a trained ML forecast.

### Environment setup

1. Copy `server/.env.example` to `server/.env` (PowerShell: `Copy-Item server/.env.example server/.env`).
2. Generate a unique secret and replace `JWT_SECRET` (PowerShell: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`). Never commit actual secrets.
3. Set `MONGO_URI` to a persistent MongoDB database for production. Keep `ALLOW_EPHEMERAL_DB` only for local development.
4. For online payments, set Razorpay **test** credentials and configure the webhook secret. Test payment success, failure, duplicate webhook delivery, and refunds before switching to live credentials.
5. For local sample data only, set `SEED_DEMO_DATA=true` in `server/.env` and start the server once; this seed deletes existing demo collections and creates predictable demo logins. Set it back to `false` after seeding. Demo credentials are for local development only. Never use the demo seed in production. For a non-demo database, set `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` (14+ characters) in `server/.env`, then run `npm run create-admin --prefix server` once. This creates an admin only if that email does not already exist.
6. Install dependencies in both `server` and `client`, then run the server and Vite client using the scripts at the repository root.

For the first Render deployment only, the Blueprint initializes an empty
Atlas database with Coimbatore demo users, vendors, and products. This is
guarded by `INITIALIZE_EMPTY_DATABASE=true` and only runs when the database
has no users. After the first successful deployment, set
`SEED_DEMO_DATA=false` and `INITIALIZE_EMPTY_DATABASE=false` in Render so
future restarts cannot initialize demo data.

### Checking live database updates in MongoDB Compass

Connect Compass to the Docker database during local development:

```text
mongodb://127.0.0.1:27018/freshcart
```

Select the `freshcart` database and use these queries in the Compass
Documents tab. Replace the placeholder product ID with the `_id` from the
product document:

```javascript
// Confirm products and their latest persistence timestamps.
db.products.find(
  {},
  { name: 1, vendorId: 1, price: 1, stock: 1, updatedAt: 1 }
).sort({ updatedAt: -1 })

// Inspect one product after editing it in the vendor portal.
db.products.findOne({ _id: ObjectId("<product-id>") })

// Find products changed recently (last 15 minutes).
db.products.find({
  updatedAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) }
}).sort({ updatedAt: -1 })
```

After saving an edit in the vendor portal, refresh the document in Compass.
The changed fields and `updatedAt` should change without restarting the
server. To verify the API reads the same record, call
`GET /api/products/<product-id>` while authenticated as an appropriate user.

### Important launch checks

- Existing checkouts reserve stock before payment. Production deployment should add a timed reservation expiry/worker and database transaction or saga compensation for partial checkout failures.
- COD is a limited workflow; vendor delivery confirmation currently reconciles the checkout after all child orders are delivered. Before a real launch, require explicit cash-collected confirmation and implement a proper settlement ledger.
- Refund endpoint is full-checkout only. Partial vendor-order refunds, dispute handling, and idempotent refund reconciliation need additional testing.
- Scheduled order records are templates only; no recurring charge or automatic order placement occurs.
- Run authorization, race-condition, webhook replay, backup/restore, and load tests before onboarding real customers.
