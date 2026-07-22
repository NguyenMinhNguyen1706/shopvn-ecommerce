# ShopVN E-commerce QA Test Checklist

| ID | Module | Test Case | Steps | Expected Result | Priority | Status |
|---|---|---|---|---|---|---|
| AUTH-001 | Authentication | Register with valid data | Open register page, enter valid name/email/phone/password, submit | Account is created, access/refresh tokens returned, user is stored without password | Critical | Not Run |
| AUTH-002 | Authentication | Reject invalid email | Submit register/login form with `abc` as email | Form/API returns validation error and does not create/login user | High | Pass |
| AUTH-003 | Authentication | Reject short password | Submit register form with password shorter than 6 chars | API returns 400 validation error | High | Pass |
| AUTH-004 | Authentication | Login with valid account | Submit valid email/password | User is logged in, JWT saved, protected pages become available | Critical | Not Run |
| AUTH-005 | Authentication | Login with wrong password | Submit valid email with wrong password | API returns 401 with generic error, no token stored | High | Not Run |
| AUTH-006 | Authentication | Refresh token rotation | Expire access token, call protected API, trigger refresh | New access token is issued; reused refresh token is rejected | High | Not Run |
| AUTH-007 | Authentication | Logout | Login, click logout | Local tokens cleared, server refresh token revoked, access token blacklisted | High | Not Run |
| AUTH-008 | Authorization | Admin route blocks normal user | Call `/api/admin/*` with user token | API returns 403 | Critical | Static Pass |
| AUTH-009 | Authorization | Admin route blocks anonymous user | Call `/api/admin/*` without token | API returns 401 | Critical | Static Pass |
| PROD-001 | Product | Product list loads | Open products page | Product grid renders from backend or fallback data | Critical | Partial |
| PROD-002 | Product | Product card fields | Inspect product card | Name, image/icon, price, old price, rating, stock/sold info render correctly | High | Visual Pass |
| PROD-003 | Product | Product detail loads | Open product detail page with valid id | Gallery, name, price, stock, CTA and description render | Critical | Visual Pass |
| PROD-004 | Product | Missing product detail | Open detail page with invalid id | Clear error/empty state shown | Medium | Not Run |
| PROD-005 | Product | Stock displayed correctly | Compare product list/detail with API stock | UI stock matches API data | High | Not Run |
| SEARCH-001 | Search & Filter | Search by name | Search for `laptop` | Product list filters to matching products | High | Not Run |
| SEARCH-002 | Search & Filter | Filter by category | Select Laptop/Phone category | Product grid updates and active filter is visible | High | Partial |
| SEARCH-003 | Search & Filter | Filter by price | Set min/max price | Only products in range are shown | High | Not Run |
| SEARCH-004 | Search & Filter | Sort low to high | Select price ascending | Product order changes by price ascending | Medium | Partial |
| SEARCH-005 | Search & Filter | Sort high to low | Select price descending | Product order changes by price descending | Medium | Partial |
| SEARCH-006 | Search & Filter | Premium status multi-select | Select sale/new/in-stock options and apply | Chips update and filters are applied | Medium | Partial |
| CART-001 | Cart | Add one product | Click Add to Cart on a product | Product is added to cart and toast/count updates | Critical | Not Run |
| CART-002 | Cart | Add same product twice | Add same product twice | Quantity increments, duplicate cart row is not created | High | Not Run |
| CART-003 | Cart | Add multiple products | Add different products | Cart contains all selected products | High | Not Run |
| CART-004 | Cart | Update quantity | Change cart item quantity | Subtotal and total update correctly | Critical | Not Run |
| CART-005 | Cart | Reject zero quantity | Send quantity `0` to API | API returns 400 validation error | High | Pass |
| CART-006 | Cart | Reject negative quantity | Send negative quantity to API | API returns 400 validation error | High | Not Run |
| CART-007 | Cart | Remove one item | Click remove on cart item | Item disappears and total updates | High | Not Run |
| CART-008 | Cart | Clear cart | Remove all items or clear cart | Empty cart state appears | Medium | Not Run |
| CHECKOUT-001 | Checkout | Empty cart checkout blocked | Open checkout with empty cart | Checkout button/action is blocked with clear message | Critical | Visual Partial |
| CHECKOUT-002 | Checkout | Required receiver fields | Submit checkout with blank required fields | Form/API shows validation errors | Critical | Partial |
| CHECKOUT-003 | Checkout | Invalid phone | Submit phone outside 10-11 digit format | API returns validation error | High | Pass |
| CHECKOUT-004 | Checkout | Create COD order | Fill valid checkout form and confirm COD | Order is created and cart is cleared | Critical | Not Run |
| CHECKOUT-005 | Checkout | Persist order items | Create order with cart items | Order stores user, products, quantities, prices, total | Critical | Automated Service Pass |
| ORDER-001 | Order | View order history | Login and open orders page | User sees only their orders | High | Not Run |
| ORDER-002 | Order | View order detail | Open a valid order detail | Correct items, totals and status are shown | High | Not Run |
| ORDER-003 | Order | Cancel order | Cancel pending order | Status changes to cancelled and stock reservation is released | High | Automated Service Pass |
| ORDER-004 | Admin Order | Admin updates order status | Admin changes status | Status is updated and visible to user | High | Not Run |
| PAY-001 | Payment | COD method | Select COD at checkout | Order can be placed without external redirect | Critical | Not Run |
| PAY-002 | Payment | Bank transfer method | Select bank transfer | Payment instructions/QR show clearly | Medium | Not Run |
| PAY-003 | Payment | Payment gateway unavailable | Payment API fails | UI shows recoverable error | Medium | Not Run |
| API-001 | Frontend - Backend | Production API URL | Inspect deployed `js/api.js` | Frontend uses public backend URL, not localhost/mock-only mode | Critical | Fixed locally, redeploy required |
| API-002 | Frontend - Backend | Products API CORS | Request products with Vercel Origin | Backend returns correct CORS header | Critical | Pass |
| API-003 | Frontend - Backend | Backend health | Request `/health` | Backend returns 200 OK | Critical | Pass |
| API-004 | Frontend - Backend | API version compatibility | Request `/api/products` and `/api/v1/products` | Active production route works; frontend targets compatible route | High | Fixed locally, redeploy backend required |
| API-005 | Frontend - Backend | Loading state | Throttle network and open pages | Loading UI appears while data is fetched | Medium | Not Run |
| API-006 | Frontend - Backend | Error state | Simulate backend down | User sees clear error/fallback state | High | Not Run |
| RESP-001 | Responsive | Desktop 1440px | Open Home/Products/Cart/Checkout at 1440px | Layout is not broken | High | Visual Pass |
| RESP-002 | Responsive | Laptop 1024px | Open key pages at 1024px | Header/grid remain usable | High | Not Run |
| RESP-003 | Responsive | Tablet 768px | Open key pages at 768px | Layout stacks correctly, no overlap | High | Not Run |
| RESP-004 | Responsive | Mobile 375px | Open key pages at 375px | Buttons are tappable, cards/forms fit viewport | Critical | Partial |
| UX-001 | UX/UI | Button states | Hover/focus CTA buttons | Visible hover/focus feedback appears | Medium | Static Pass |
| UX-002 | UX/UI | Empty cart state | Open empty cart | Clear empty state and shopping CTA appear | Medium | Not Run |
| UX-003 | UX/UI | Toast success/error | Add cart/checkout fail | Toast communicates outcome clearly | Medium | Visual Partial |
| UX-004 | UX/UI | Dark mode readability | Toggle dark mode on key pages | Text, cards, inputs and nav remain readable | High | Pass |
| PERF-001 | Performance | Home Lighthouse | Run Lighthouse on home | LCP/CLS/INP within acceptable range for student project | Medium | Partial - Performance 69 |
| PERF-002 | Performance | Product list performance | Open products with throttling | Grid renders without long blocking interaction | Medium | Partial - Performance 74 |
| PERF-003 | Performance | Image optimization | Inspect product images | Images use proper sizing/lazy loading where possible | Medium | Not Run |
| SEO-001 | SEO | Page titles | Inspect all main HTML pages | Each page has meaningful `<title>` | Medium | Not Run |
| SEO-002 | SEO | Meta description | Inspect all main HTML pages | Each page has meta description | Medium | Not Run |
| SEO-003 | SEO | Image alt text | Inspect product/category images | Informative images have `alt` text | Medium | Not Run |
| SEO-004 | SEO | Sitemap/robots | Request `/sitemap.xml` and `/robots.txt` | Files exist or deployment intentionally omits them | Low | Not Run |
| A11Y-001 | Accessibility | Keyboard navigation | Tab through Home/Products/Checkout | Focus order is logical and visible | High | Not Run |
| A11Y-002 | Accessibility | Form labels | Inspect auth/checkout forms | Inputs have visible labels or accessible names | High | Partial |
| A11Y-003 | Accessibility | Icon-only buttons | Inspect wishlist/cart/theme buttons | Buttons have labels/aria-labels | Medium | Not Run |
| A11Y-004 | Accessibility | Contrast | Check light/dark key screens | Text contrast is readable | High | Visual Pass |
| SEC-001 | Security | No localhost in production | Search frontend/deployed API config | No production calls to localhost | Critical | Pass |
| SEC-002 | Security | No secrets in frontend | Search frontend files | No JWT secret/DB URL/API secret exposed | Critical | Pass |
| SEC-003 | Security | Password hashing | Inspect auth service | Password is hashed with bcrypt before save | Critical | Static Pass |
| SEC-004 | Security | JWT protected APIs | Inspect cart/order/admin routes | Protected routes use auth middleware | Critical | Static Pass |
| SEC-005 | Security | Admin RBAC | Inspect admin routes | Admin routes use authorization middleware | Critical | Static Pass |
| SEC-006 | Security | Rate limit | Inspect middleware and auth routes | API/auth rate limits are configured | High | Static Pass |
| SEC-007 | Security | XSS sanitization | Send nested script payload | Nested strings are sanitized recursively | High | Pass |
| SEC-008 | Security | SQL injection | Send SQL-like query/search payload | Sequelize/Joi prevent unsafe query execution | High | Not Run |
| SEC-009 | Security | Vulnerable dependencies | Run `npm audit --omit=dev` | No known production vulnerabilities remain | High | Pass |
| SEC-010 | Security | Upload adapter safety | Upload product image through admin endpoint | File is validated, stored in memory, uploaded through controlled Cloudinary stream | High | Static Pass |
| SEC-011 | Security | Email file/URL access | Send order confirmation email | Nodemailer disables file and URL access | High | Automated Pass |
| DEPLOY-001 | Deployment | Vercel frontend | Open deployed home/products | Frontend returns 200 on clean URLs | Critical | Pass |
| DEPLOY-002 | Deployment | Backend public URL | Request Render health | Backend returns 200 | Critical | Pass |
| DEPLOY-003 | Deployment | CORS | Request API with Vercel Origin | CORS allows frontend origin | Critical | Pass |
| DEPLOY-004 | Deployment | Refresh route | Open clean URLs directly | Vercel serves pages without 404 | High | Pass |
| DEPLOY-005 | Deployment | Swagger docs | Open backend `/api-docs` | Swagger UI loads | Medium | Pass |
| DEPLOY-006 | Deployment | Local backend boot | Start backend with Express 5 | Server boots and `/health` returns 200 | Critical | Pass |
