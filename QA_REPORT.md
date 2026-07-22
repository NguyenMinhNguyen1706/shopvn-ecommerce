# ShopVN QA Audit Report

## Scope

Audit date: 2026-07-06

Covered areas:
- Authentication/JWT/RBAC static review and unit tests
- Product/cart/order/checkout service-level behavior
- Frontend-backend API URL and CORS/deployment probes
- Security middleware, validation, XSS sanitization, upload, email, dependency audit
- SEO metadata and sitemap/robots basics
- Dark/light visual readability from the previous UI pass
- Lighthouse smoke tests for deployed Home and Products pages

## Fixes Applied

| Severity | Finding | Fix | Files |
|---|---|---|---|
| Critical | Local backend could not boot on Express 5 because `/api/*` route pattern throws `PathError`. | Replaced wildcard string route with RegExp-compatible route. | `ecommerce-backend/app.js` |
| Critical | Frontend production integration could silently use mock/local data because `USE_BACKEND_API` ignored default backend URL. | Enabled backend API by default and kept explicit opt-out via config. | `js/api.js` |
| High | `multer-storage-cloudinary` pulled vulnerable Cloudinary SDK chain. | Removed adapter, switched to `multer.memoryStorage()` and controlled Cloudinary upload stream. | `ecommerce-backend/src/middlewares/upload.middleware.js`, `ecommerce-backend/src/routes/upload.routes.js`, `ecommerce-backend/src/services/upload.service.js`, `ecommerce-backend/package.json` |
| High | Nodemailer advisory for message-level file/URL access. | Upgraded to Nodemailer 9.x and disabled file/URL access at transport and message levels. | `ecommerce-backend/src/services/email.service.js`, `ecommerce-backend/package.json` |
| High | XSS sanitizer only handled shallow string fields. | Added recursive sanitization for body/query/params. | `ecommerce-backend/src/middlewares/validation.middleware.js` |
| Medium | Redis-down rate limiting blocked local development APIs. | Production remains fail-closed; non-production now fails open by default. | `ecommerce-backend/src/middlewares/security.middleware.js` |
| Medium | Product detail/login/register lacked meta descriptions; robots/sitemap were missing. | Added descriptions, `robots.txt`, and `sitemap.xml`. | `product-detail.html`, `login.html`, `register.html`, `robots.txt`, `sitemap.xml` |
| Medium | Dependency audit had moderate `uuid` via Sequelize. | Used npm override to `uuid@11.1.1`; verified Sequelize still loads `uuid.v1/v4`. | `ecommerce-backend/package.json`, `ecommerce-backend/package-lock.json` |

## Verification Results

| Check | Result |
|---|---|
| Backend Jest | 9 suites passed, 62 tests passed |
| Backend production dependency audit | `npm audit --omit=dev`: 0 vulnerabilities |
| Backend JS syntax | `node --check`: pass for backend JS outside `node_modules/coverage` |
| Frontend JS syntax | `node --check`: pass for key frontend JS files |
| Backend local boot | `/health` returned 200 on local port 3999 |
| Express 5 API redirect | `/api/products` returned 307 locally instead of crashing |
| Vercel deployed frontend | `/` and `/products` returned 200 |
| Render deployed backend | `/health` returned 200 |
| Deployed CORS | `/api/products` allowed `https://shopvn-ecommerce.vercel.app` |
| Swagger | `/api-docs` returned 200 |
| SEO metadata scan | Main pages have title and meta description after patch |
| Lighthouse Home | Performance 69, Accessibility 88, Best Practices 100, SEO 90 |
| Lighthouse Products | Performance 74, Accessibility 90, Best Practices 100, SEO 90 |

## Remaining Risks

| Severity | Risk | Recommendation |
|---|---|---|
| High | Deployed Vercel still served old `js/api.js` during audit. | Redeploy frontend after merging this patch. |
| High | Deployed Render backend currently serves `/api/products`, while local code now supports `/api/v1` and redirect from `/api`. | Redeploy backend after merging this patch; keep frontend default `/api` for compatibility. |
| Medium | Lighthouse performance is below ideal, mainly from unminified/unused static CSS/JS. | Add a static build/minify step or Vercel build pipeline for CSS/JS minification. |
| Medium | Full browser E2E auth/cart/checkout was not completed with real test users and DB state. | Add Playwright or Cypress E2E using seeded test account and test database. |
| Medium | Admin dashboard was reviewed statically but not fully exercised as a real admin. | Add admin E2E coverage for product CRUD/order status. |

## Suggested Next QA Automation

1. Add `supertest` API integration tests after refactoring `app.js` to export the Express app without always starting the server.
2. Add Playwright smoke tests for deployed frontend:
   - Products render from backend
   - Register/login/logout
   - Add to cart
   - Checkout validation
   - Mobile 375px layout
3. Add a build step for minification:
   - `cssnano` or Lightning CSS for CSS
   - `terser`/esbuild for JS
4. Add CI workflow:
   - `npm ci`
   - `npm audit --omit=dev`
   - `npm test -- --runInBand`
   - `node --check` for frontend/backend JS
   - Optional Lighthouse CI budget
