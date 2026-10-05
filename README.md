# Haat - E-Commerce Website

A responsive online shop built with **HTML, CSS and vanilla JavaScript** (no frameworks).
Browse products, filter and search, manage a live cart, apply coupons and place a demo order.

**Live demo:** https://soumya234a2.github.io/e-commerce-website/

## Features

- **Product listing** with prices, discounts and ratings (12 products in 4 categories)
- **Category filters**, **live search** and **sorting** (price, rating)
- **Cart drawer** with add, increase, decrease and remove, with instant price updates and no page reloads
- **Cart saved in localStorage**, so it survives a page refresh
- **Billing summary** that auto-calculates subtotal, coupon discount, 18% GST, delivery fee and the final payable amount
- **Coupon codes:** `SAVE10` (10% off) and `FLAT200` (Rs. 200 off above Rs. 1,500)
- **Free delivery** above Rs. 999 (otherwise Rs. 49)
- **Checkout form** with validation (name, 10-digit mobile number, address) and an order confirmation
- **Responsive** layout for desktop and mobile, keyboard accessible, respects reduced-motion settings

## Tech stack

HTML5, CSS3 (custom properties, grid, flexbox), JavaScript (ES6, DOM, localStorage)

## Project structure

```
index.html   page structure: header, product grid, cart drawer, checkout modals
style.css    design tokens, layout, responsive rules
script.js    data, storage, cart logic, billing, rendering, events
```

`script.js` is split into small functions: `addToCart`, `changeQty`, `removeFromCart`,
`calculateDiscount`, `calculateBill`, `renderProducts`, `renderCart`, `validateCheckout`, `placeOrder`.

## Run locally

Download or clone the repo and open `index.html` in a browser. No build step is needed.

```
git clone https://github.com/soumya234a2/e-commerce-website.git
```

## Note

This is a practice project. No real orders are placed and no payment is taken.

## Author

**Soumyaranjan Naik** - B.Tech Computer Science and Engineering
GitHub: https://github.com/soumya234a2
