-- ═══════════════════════════════════════════════════════════════════
-- SQL DEBUGGING CHALLENGE — EXPANDED
-- Designed-to-fail pedagogical data with 10 intentional query traps
-- Tables: suppliers(20), customers(500), products(100), orders(2000),
--         order_items(5000), reviews(500), inventory_log(1500),
--         customer_events(3000)
-- Total: ~12,620 rows across 8 tables
-- ═══════════════════════════════════════════════════════════════════
-- TRAP  1 (JOIN):          150 customers have ZERO orders — INNER JOIN loses them
-- TRAP  2 (AGG):           Cancelled total=$0, returned total=NEGATIVE — skews averages
-- TRAP  3 (NULL):          Cancelled/processing orders have shipped_at = NULL — != NULL always false
-- TRAP  4 (NAME):          Two "John Smith" + two "Maria Garcia" — GROUP BY name merges them
-- TRAP  5 (TEMPORAL):      Feb/Aug 2024 have zero delivered; 3-week gap Dec 15 – Jan 5
-- TRAP  6 (OVER-DISCOUNT): ~100 order_items have discount_cents > subtotal
-- TRAP  7 (FAKE REVIEW):   25 reviews have rating=5 but body says "terrible" / "broken"
-- TRAP  8 (NULL vs ZERO):  3 suppliers have reliability_score = NULL (new, not bad)
-- TRAP  9 (RUNNING TOTAL): Adjustment entries break inventory balance chain
-- TRAP 10 (FUNNEL):        Event counts ≠ customer counts; users skip funnel stages
-- ═══════════════════════════════════════════════════════════════════

-- ─── SCHEMA ─────────────────────────────────────────────────────────

CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  lead_time_days INTEGER NOT NULL,
  reliability_score NUMERIC(3,2),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100),
  membership VARCHAR(50) NOT NULL DEFAULT 'standard',
  loyalty_tier VARCHAR(20) NOT NULL DEFAULT 'none',
  signup_source VARCHAR(50) NOT NULL DEFAULT 'organic',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id),
  weight_grams INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  status VARCHAR(50) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  discount_code VARCHAR(50),
  shipping_cost_cents INTEGER NOT NULL DEFAULT 0,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inventory_log (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  change_type VARCHAR(50) NOT NULL,
  quantity_change INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE customer_events (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  event_type VARCHAR(50) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── SUPPLIERS: 20 rows ──────────────────────────────────────────
-- TRAP 8: Suppliers 18-20 have NULL reliability_score (new, not unreliable)

INSERT INTO suppliers (id, name, country, lead_time_days, reliability_score, created_at)
SELECT
  i,
  (ARRAY[
    'Apex Electronics','Global Parts Co','Summit Manufacturing','Pacific Supply','Nordic Components',
    'Atlas Industrial','Delta Wholesale','Prime Materials','Echo Logistics','Zenith Corp',
    'Vertex Trading','Omega Supplies','Pioneer Goods','Cascade Imports','Sterling Exports',
    'Quantum Parts','Titan Resources','Horizon Supply','Nova Distribution','Pinnacle Sourcing'
  ])[i],
  (ARRAY[
    'US','China','Germany','Japan','UK','South Korea','Taiwan','India','Mexico','Canada',
    'US','China','Germany','Japan','UK','South Korea','Taiwan','India','Mexico','Canada'
  ])[i],
  (ARRAY[7,14,21,10,18,12,15,25,8,11,9,20,16,13,22,14,17,30,6,19])[i],
  CASE
    WHEN i >= 18 THEN NULL
    ELSE ROUND((0.60 + (((i * 7 + 3) % 35)::numeric / 100))::numeric, 2)
  END,
  '2022-06-01'::timestamp + (i * INTERVAL '15 days')
FROM generate_series(1, 20) AS g(i);

SELECT setval('suppliers_id_seq', 20);

-- ─── CUSTOMERS: 500 rows ─────────────────────────────────────────
-- Customers 351-500 have ZERO orders (30% — JOIN trap)
-- TRAP 4: Two "John Smith" (ids 42, 137) + two "Maria Garcia" (ids 85, 195)

INSERT INTO customers (id, first_name, last_name, email, city, membership, loyalty_tier, signup_source, created_at)
SELECT
  i,
  (ARRAY[
    'James','Mary','Robert','Patricia','Michael','Jennifer','William','Linda','David','Elizabeth',
    'Richard','Barbara','Joseph','Susan','Thomas','Jessica','Charles','Sarah','Christopher','Karen',
    'Daniel','Nancy','Matthew','Lisa','Anthony','Betty','Mark','Margaret','Donald','Sandra',
    'Steven','Ashley','Paul','Dorothy','Andrew','Kimberly','Joshua','Emily','Kenneth','Donna'
  ])[((i * 7 + 3) % 40) + 1],
  (ARRAY[
    'Anderson','Brown','Clark','Davis','Evans','Foster','Garcia','Harris','Jackson','Johnson',
    'King','Lee','Martin','Nelson','Owens','Parker','Quinn','Roberts','Scott','Taylor'
  ])[((i * 13 + 5) % 20) + 1],
  'user' || i || '@example.com',
  (ARRAY[
    'New York','Los Angeles','Chicago','Houston','Phoenix',
    'Philadelphia','San Antonio','San Diego','Dallas','Austin',
    'Jacksonville','San Jose','Indianapolis','Columbus','Charlotte',
    'Denver','Seattle','Portland','Nashville','Memphis'
  ])[((i * 11 + 2) % 20) + 1],
  CASE WHEN i % 5 < 3 THEN 'standard' WHEN i % 5 = 3 THEN 'premium' ELSE 'vip' END,
  CASE WHEN i % 10 < 1 THEN 'gold' WHEN i % 10 < 3 THEN 'silver' WHEN i % 10 < 6 THEN 'bronze' ELSE 'none' END,
  CASE WHEN i % 8 < 3 THEN 'organic' WHEN i % 8 < 5 THEN 'referral' WHEN i % 8 < 7 THEN 'paid_ad' ELSE 'social' END,
  '2023-01-01'::timestamp + (i * INTERVAL '10 hours' + (i % 7) * INTERVAL '3 hours')
FROM generate_series(1, 500) AS g(i);

-- TRAP 4: Duplicate names — different IDs, emails, cities
UPDATE customers SET first_name = 'John', last_name = 'Smith',
  email = 'john.smith.chi@example.com', city = 'Chicago' WHERE id = 42;
UPDATE customers SET first_name = 'John', last_name = 'Smith',
  email = 'john.smith.den@example.com', city = 'Denver' WHERE id = 137;
UPDATE customers SET first_name = 'Maria', last_name = 'Garcia',
  email = 'maria.garcia.nyc@example.com', city = 'New York' WHERE id = 85;
UPDATE customers SET first_name = 'Maria', last_name = 'Garcia',
  email = 'maria.garcia.la@example.com', city = 'Los Angeles' WHERE id = 195;

SELECT setval('customers_id_seq', 500);

-- ─── PRODUCTS: 100 rows ──────────────────────────────────────────
-- Products 86-100: zero orders (dead inventory, 15 products)
-- Products 91-100: is_active = false (10% inactive)

INSERT INTO products (id, name, category, price, stock_quantity, supplier_id, weight_grams, is_active, created_at)
SELECT
  i,
  (ARRAY[
    'Wireless Headphones','USB-C Charging Hub','Adjustable Laptop Stand','Mechanical Keyboard',
    'LED Monitor Light','HD Webcam 1080p','Extended Mouse Pad','Cable Management Kit',
    'Screen Protector Film','Fast Phone Charger','Bluetooth Speaker Mini','Wireless Ergonomic Mouse',
    'USB Flash Drive 64GB','HDMI Cable Premium','Portable Power Bank','Noise Cancelling Buds',
    'Smart Plug WiFi','Digital Photo Frame','Webcam Ring Light','Laptop Cooling Pad',
    'Cotton T-Shirt','Denim Jacket','Running Shoes','Leather Wallet','Sunglasses Classic',
    'Wool Beanie Hat','Canvas Backpack','Silk Scarf','Athletic Shorts','Oxford Dress Shirt',
    'Linen Pants','Rain Jacket','Fleece Hoodie','Leather Belt','Ankle Boots',
    'Polo Shirt','Cargo Shorts','Winter Gloves','Baseball Cap','Dress Socks Pack',
    'Cast Iron Skillet','Bamboo Cutting Board','French Press Coffee','Steel Water Bottle','Ceramic Mug Set',
    'Digital Kitchen Timer','Mixing Bowl Set','Whistling Tea Kettle','Herb Garden Kit','Knife Sharpener',
    'Air Purifier Compact','Scented Candle Set','Throw Blanket Plush','Desk Organizer','Ceramic Plant Pot',
    'Wine Glass Set','Baking Sheet Duo','Spice Rack Bamboo','Welcome Door Mat','Picture Frame Set',
    'Yoga Mat Premium','Resistance Band Set','Speed Jump Rope','Foam Roller','Dumbbell Pair 10lb',
    'Cycling Gloves','Swim Goggles Pro','Tennis Ball Pack','Merino Hiking Socks','Microfiber Sport Towel',
    'Pull Up Bar','Ab Wheel Roller','Boxing Hand Wraps','Lacrosse Ball Set','Climbing Chalk Bag',
    'Running Armband','Yoga Block Set','Kettlebell 15lb','Agility Ladder','Sport Headband Pack',
    'SQL Cookbook','Data Science Guide','Python Programming','Database Internals','Clean Code',
    'Design Patterns','Algorithm Manual','Statistics Intro','Machine Learning 101','Web Dev Handbook',
    'Cloud Architecture','DevOps Handbook','System Design Guide','Refactoring Legacy','Testing Best Practices',
    'API Design Patterns','Kubernetes Primer','Data Engineering','Security Fundamentals','Blockchain Basics'
  ])[i],
  CASE
    WHEN i <= 20 THEN 'Electronics'
    WHEN i <= 40 THEN 'Clothing'
    WHEN i <= 60 THEN 'Home & Kitchen'
    WHEN i <= 80 THEN 'Sports'
    ELSE 'Books'
  END,
  ROUND(((((i * 1373 + 29) % 49001) + 999)::numeric) / 100, 2),
  (i * 7 + 13) % 200 + 5,
  ((i - 1) % 20) + 1,
  (i * 37 + 100) % 5000 + 50,
  CASE WHEN i > 90 THEN false ELSE true END,
  '2023-03-01'::timestamp + (i * INTERVAL '2 days')
FROM generate_series(1, 100) AS g(i);

SELECT setval('products_id_seq', 100);

-- ─── ORDERS: 2000 rows ───────────────────────────────────────────
-- Month layout (18 months, Jan 2024 – Jun 2025):
--   Months 1-9 (Jan–Sep 2024): 100 orders each = 900
--   Month 10 (Oct 2024): 150 orders (Q4 ramp)
--   Month 11 (Nov 2024): 200 orders (Q4 peak)
--   Month 12 (Dec 2024): 150 orders, DAYS 1-14 ONLY (gap starts Dec 15)
--   Month 13 (Jan 2025): 100 orders, DAYS 6-28 ONLY (gap ends Jan 5)
--   Months 14-18 (Feb–Jun 2025): 100 orders each = 500
--
-- TRAP 2: cancelled=$0, returned=NEGATIVE
-- TRAP 3: cancelled/processing have shipped_at=NULL
-- TRAP 5: Feb(2) & Aug(8) 2024 have ZERO delivered; 3-week gap Dec 15 – Jan 5

WITH base AS (
  SELECT
    i,
    CASE
      WHEN i <= 900  THEN ((i - 1) / 100) + 1
      WHEN i <= 1050 THEN 10
      WHEN i <= 1250 THEN 11
      WHEN i <= 1400 THEN 12
      WHEN i <= 1500 THEN 13
      ELSE ((i - 1501) / 100) + 14
    END AS month_idx,
    CASE
      WHEN i <= 900  THEN (i - 1) % 100
      WHEN i <= 1050 THEN i - 901
      WHEN i <= 1250 THEN i - 1051
      WHEN i <= 1400 THEN i - 1251
      WHEN i <= 1500 THEN i - 1401
      ELSE (i - 1501) % 100
    END AS row_in_month,
    ((i * 7 + 3) % 350) + 1 AS cid
  FROM generate_series(1, 2000) AS g(i)
),
with_details AS (
  SELECT
    b.*,
    CASE
      WHEN b.month_idx = 12 THEN (b.row_in_month % 14) + 1
      WHEN b.month_idx = 13 THEN (b.row_in_month % 23) + 6
      ELSE (b.row_in_month % 28) + 1
    END AS day_in_month,
    CASE
      WHEN b.month_idx IN (2, 8) THEN
        CASE WHEN b.i % 10 < 3 THEN 'cancelled'
             WHEN b.i % 10 < 5 THEN 'processing'
             ELSE 'returned' END
      WHEN (b.i * 7 + 3) % 20 < 8  THEN 'delivered'
      WHEN (b.i * 7 + 3) % 20 < 11 THEN 'shipped'
      WHEN (b.i * 7 + 3) % 20 < 14 THEN 'processing'
      WHEN (b.i * 7 + 3) % 20 < 18 THEN 'cancelled'
      ELSE 'returned'
    END AS status
  FROM base b
),
with_dates AS (
  SELECT
    d.*,
    ('2024-01-01'::date + (d.month_idx - 1) * INTERVAL '1 month'
      + (d.day_in_month - 1) * INTERVAL '1 day'
      + (d.i % 12) * INTERVAL '1 hour')::timestamp AS base_date
  FROM with_details d
)
INSERT INTO orders (id, customer_id, status, total, discount_code, shipping_cost_cents, shipped_at, delivered_at, created_at)
SELECT
  i,
  cid,
  status,
  CASE
    WHEN status = 'cancelled' THEN 0.00
    WHEN status = 'returned'  THEN -ROUND(((i * 1373 + 29) % 49001 + 999)::numeric / 100, 2)
    ELSE ROUND(((i * 1373 + 29) % 49001 + 999)::numeric / 100, 2)
  END,
  CASE WHEN i % 5 = 0 THEN
    (ARRAY['SAVE10','WELCOME20','FLASH15','VIP25','HOLIDAY30'])[((i / 5) % 5) + 1]
  ELSE NULL END,
  (i % 5 + 1) * 199,
  CASE
    WHEN status IN ('shipped','delivered','returned')
      THEN base_date + INTERVAL '1 day' + (i % 3) * INTERVAL '1 day'
    ELSE NULL
  END,
  CASE
    WHEN status IN ('delivered','returned')
      THEN base_date + INTERVAL '4 days' + (i % 4) * INTERVAL '1 day'
    ELSE NULL
  END,
  base_date
FROM with_dates
ORDER BY i;

SELECT setval('orders_id_seq', 2000);

-- ─── ORDER ITEMS: 5000 rows ──────────────────────────────────────
-- Distribution: orders 1-500 get 4 items, 501-1000 get 3, 1001-1500 get 2, 1501-2000 get 1
-- Products 1-85 only (86-100 = dead inventory, zero order_items)
-- TRAP 6: ~100 items get over-discounted (discount > subtotal)

WITH items AS (
  SELECT
    i,
    CASE
      WHEN i <= 2000 THEN i
      WHEN i <= 3500 THEN i - 2000
      WHEN i <= 4500 THEN i - 3500
      ELSE i - 4500
    END AS oid,
    ((i * 13 + 5) % 85) + 1 AS pid,
    (i % 4) + 1 AS qty,
    ((i * 1373 + 29) % 4000) + 500 AS upc,
    CASE WHEN i % 4 = 0 THEN ((i * 7) % 300) + 50 ELSE 0 END AS dc
  FROM generate_series(1, 5000) AS g(i)
)
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents, discount_cents, created_at)
SELECT it.i, it.oid, it.pid, it.qty, it.upc, it.dc, o.created_at
FROM items it
JOIN orders o ON o.id = it.oid;

-- TRAP 6: Over-discounting — discount exceeds subtotal for ~100 items
UPDATE order_items SET discount_cents = unit_price_cents * quantity + (id % 500) + 100
WHERE id % 50 = 7;

SELECT setval('order_items_id_seq', 5000);

-- ─── REVIEWS: 500 rows ───────────────────────────────────────────
-- Only delivered/returned orders get reviews
-- Rating distribution: 5★ 30%, 4★ 25%, 3★ 20%, 2★ 15%, 1★ 10%
-- TRAP 7: 25 fake reviews (rating=5, body says "terrible"/"broken", is_verified=false)

WITH eligible AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY o.id) AS rid,
    o.id AS oid,
    o.customer_id AS cid,
    ((o.id * 13 + 5) % 85) + 1 AS pid,
    CASE
      WHEN (o.id * 7 + 3) % 20 < 6  THEN 5
      WHEN (o.id * 7 + 3) % 20 < 11 THEN 4
      WHEN (o.id * 7 + 3) % 20 < 15 THEN 3
      WHEN (o.id * 7 + 3) % 20 < 18 THEN 2
      ELSE 1
    END AS rating,
    o.created_at AS order_date,
    (o.id % 3) AS variant
  FROM orders o
  WHERE o.status IN ('delivered', 'returned')
  ORDER BY o.id
  LIMIT 500
)
INSERT INTO reviews (id, order_id, customer_id, product_id, rating, body, is_verified, helpful_count, created_at)
SELECT
  rid, oid, cid, pid, rating,
  CASE rating
    WHEN 5 THEN (ARRAY[
      'Excellent! Exactly what I needed. Highly recommend to anyone looking for quality.',
      'Amazing quality and fast shipping. Will definitely buy again from this store.',
      'Perfect product that exceeded all my expectations. Could not be happier.'
    ])[variant + 1]
    WHEN 4 THEN (ARRAY[
      'Good product that works well. Minor issues but overall satisfied with purchase.',
      'Pretty good overall with small room for improvement. Would still recommend.',
      'Solid purchase and happy with it for the price. Does what it should.'
    ])[variant + 1]
    WHEN 3 THEN (ARRAY[
      'Decent product that gets the job done but nothing particularly special about it.',
      'Average quality overall. Not bad but definitely not great either honestly.',
      'It works exactly as described in the listing. Just okay though nothing more.'
    ])[variant + 1]
    WHEN 2 THEN (ARRAY[
      'Below expectations unfortunately. Quality could be much better for this price point.',
      'Disappointed with what I received. Does not match the description very well at all.',
      'Not worth the price honestly. Feels cheaply made and probably will not last long.'
    ])[variant + 1]
    ELSE (ARRAY[
      'Very disappointed with this purchase. Product arrived damaged and customer support was completely unhelpful throughout the process. Waited weeks for a response and still no resolution at all.',
      'Absolute waste of money. The item broke within the first week of normal use. Tried contacting the seller multiple times through every channel but received zero response whatsoever.',
      'Do not buy this product. It looks nothing like the pictures in the listing and the material quality is genuinely terrible. Return process has been an absolute nightmare from start to finish.'
    ])[variant + 1]
  END,
  CASE WHEN rid % 5 = 0 THEN false ELSE true END,
  (rid * 7 + 3) % 50,
  order_date + INTERVAL '5 days' + variant * INTERVAL '2 days'
FROM eligible;

-- TRAP 7: Fake reviews — 5-star rating with clearly negative body text
UPDATE reviews SET rating = 5, is_verified = false,
  body = CASE (id % 5)
    WHEN 0 THEN 'Terrible product, completely broken on arrival. Do not waste your money on this garbage.'
    WHEN 1 THEN 'Worst purchase I have ever made. The quality is absolutely awful and disappointing.'
    WHEN 2 THEN 'Broken after one single day of normal use. Total waste of money and time overall.'
    WHEN 3 THEN 'Horrible quality. Cheaply made garbage that falls apart immediately upon any use.'
    ELSE 'Absolutely the worst item I own. Nothing works as described. My biggest regret this year.'
  END
WHERE id % 20 = 0;

SELECT setval('reviews_id_seq', 500);

-- ─── INVENTORY LOG: 1500 rows ────────────────────────────────────
-- 100 products × ~15 entries each
-- TRAP 9: Adjustment entries have corrupted balance_after values

WITH raw AS (
  SELECT
    i,
    ((i - 1) / 15) + 1 AS pid,
    CASE
      WHEN (i - 1) % 15 = 0 THEN 'restock'
      WHEN i % 7 = 0 THEN 'adjustment'
      WHEN i % 5 = 0 THEN 'return'
      WHEN i % 3 = 0 THEN 'restock'
      ELSE 'sale'
    END AS ct,
    CASE
      WHEN (i - 1) % 15 = 0 THEN 100
      WHEN i % 7 = 0 THEN (i % 5) - 2
      WHEN i % 5 = 0 THEN (i % 3) + 1
      WHEN i % 3 = 0 THEN (i % 20) + 10
      ELSE -(i % 5 + 1)
    END AS qty_change,
    '2024-01-01'::timestamp + (i * INTERVAL '4 hours') AS ts
  FROM generate_series(1, 1500) AS g(i)
),
with_balance AS (
  SELECT r.*,
    SUM(r.qty_change) OVER (PARTITION BY r.pid ORDER BY r.i) AS running_bal
  FROM raw r
)
INSERT INTO inventory_log (id, product_id, change_type, quantity_change, balance_after, created_at)
SELECT i, pid, ct, qty_change, running_bal, ts FROM with_balance;

-- TRAP 9: Corrupt balance_after on adjustment entries
UPDATE inventory_log SET balance_after = balance_after + (id % 23) - 11
WHERE change_type = 'adjustment';

SELECT setval('inventory_log_id_seq', 1500);

-- ─── CUSTOMER EVENTS: 3000 rows ──────────────────────────────────
-- Funnel distribution: 45% page_view, 23% add_to_cart, 11% checkout_start,
--   6% purchase, 15% abandon
-- TRAP 10: Event counts ≠ unique customers per stage; users skip stages;
--   naive COUNT(*) GROUP BY event_type gives wrong conversion rates

INSERT INTO customer_events (id, customer_id, event_type, session_id, created_at)
SELECT
  i,
  ((i * 7 + 3) % 500) + 1,
  CASE
    WHEN i % 100 < 45 THEN 'page_view'
    WHEN i % 100 < 68 THEN 'add_to_cart'
    WHEN i % 100 < 79 THEN 'checkout_start'
    WHEN i % 100 < 85 THEN 'purchase'
    ELSE 'abandon'
  END,
  'sess_' || (((i * 7 + 3) % 500) + 1) || '_' || (((i - 1) / 6) + 1),
  '2024-01-01'::timestamp + (i * INTERVAL '8 minutes')
FROM generate_series(1, 3000) AS g(i);

SELECT setval('customer_events_id_seq', 3000);
