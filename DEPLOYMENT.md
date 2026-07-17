# ShopVN Production Deployment Checklist

This project should be deployed as two public services:

- Frontend static site: Vercel
- Backend API: a Node.js host such as Render, Railway, Fly.io, or a VPS
- Backend worker: a background Node.js process for BullMQ jobs
- Database: managed PostgreSQL
- Cache and queue broker: managed Redis

## 1. Deploy Backend First

Deploy `ecommerce-backend` as a Node/Docker web service.

Required environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://...
DB_SSL=true
FRONTEND_URL=https://your-vercel-site.vercel.app
BACKEND_URL=https://your-backend-domain.example.com
CORS_ORIGINS=https://your-vercel-site.vercel.app
JWT_SECRET=generate-a-long-random-secret
JWT_REFRESH_SECRET=generate-another-long-random-secret
WEBHOOK_SHARED_SECRET=generate-a-long-random-secret
API_RATE_LIMIT_MAX=300
API_RATE_LIMIT_WINDOW_SECONDS=60
JSON_BODY_LIMIT=2mb
FORM_BODY_LIMIT=2mb
DB_SYNC_ON_STARTUP=true
SEED_ON_STARTUP=true
ENSURE_INVENTORY_ON_STARTUP=true
```

Health checks:

- `/health`: app process is alive
- `/ready`: app can connect to PostgreSQL

Run the worker as a separate process:

```bash
npm run worker
```

On Render this is represented by the `shopvn-worker` service in `render.yaml`.
Render does not support the `free` instance type for background workers, so the worker uses `starter`.

## 2. Configure Payment Sandbox Webhooks

Use your public backend URL, not localhost.

VNPay:

```env
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
VNPAY_URL=https://sandbox.vnpayment.vn/paygate/pay.html
VNPAY_RETURN_URL=https://your-backend-domain.example.com/api/payment/vnpay/return
VNPAY_IPN_URL=https://your-backend-domain.example.com/api/payment/vnpay/ipn
```

MoMo:

```env
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
MOMO_API_URL=https://test-payment.momo.vn/v3/gateway/api
MOMO_IPN_URL=https://your-backend-domain.example.com/api/payment/webhooks/momo/callback
```

PayOS:

```env
PAYOS_CLIENT_ID=...
PAYOS_API_KEY=...
PAYOS_CHECKSUM_KEY=...
PAYOS_API_URL=https://api.payos.vn/v1
```

Webhook target:

```text
https://your-backend-domain.example.com/api/payment/webhooks/payos/callback
```

Mock marketplace webhooks:

- `POST /api/webhooks/shopee`
- `POST /api/webhooks/tiktok`

Send either `x-webhook-secret: <WEBHOOK_SHARED_SECRET>` or
`x-webhook-signature: sha256=<hmac_sha256_json_body>`.

## 3. Deploy Frontend To Vercel

Set the frontend backend URL in:

```text
js/config.js
```

Example:

```js
window.SHOPVN_CONFIG = {
  backendApiUrl: 'https://your-backend-domain.example.com/api'
};
```

Then deploy the repository root to Vercel as a static site.

## 4. Smoke Test After Deploy

Run these manually after both services are public:

1. Open the Vercel frontend.
2. Register a new user.
3. Login.
4. Add product to cart.
5. Checkout with COD.
6. Checkout with VNPay sandbox.
7. Checkout with MoMo sandbox.
8. Checkout with PayOS sandbox and confirm webhook updates the order to paid.
9. Open `/ready` on backend and confirm `database: connected`.
10. Confirm browser console has no CORS or mixed-content errors.

## 5. Next Production Steps

After deploy is stable:

- Add automated load tests for product list, login, cart sync, and order creation.
- Add email notification delivery checks.
- Add request/error monitoring with alerts.
- Add CI checks for backend tests and frontend Selenium smoke tests.
