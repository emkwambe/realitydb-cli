-- ═══════════════════════════════════════════════════════════════════
-- SQL DEBUGGING CHALLENGE
-- Designed-to-fail pedagogical data with 5 intentional query traps
-- Tables: customers(200), products(50), orders(300), reviews(150)
-- ═══════════════════════════════════════════════════════════════════
-- TRAP 1 (JOIN):     50 customers have ZERO orders — INNER JOIN loses them
-- TRAP 2 (NULL):     Cancelled orders have shipped_at = NULL — != NULL always false
-- TRAP 3 (AGG):      Cancelled total=$0, returned total=NEGATIVE — skews averages
-- TRAP 4 (NAME):     Two "John Smith" entries — GROUP BY name merges them
-- TRAP 5 (TEMPORAL): Feb 2024 & Aug 2024 have zero delivered orders — gaps in GROUP BY
-- ═══════════════════════════════════════════════════════════════════

-- ─── SCHEMA ─────────────────────────────────────────────────────────

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100),
  membership VARCHAR(50) NOT NULL DEFAULT 'standard',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  status VARCHAR(50) NOT NULL,
  total NUMERIC(10,2) NOT NULL,
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ─── CUSTOMERS: 200 rows ───────────────────────────────────────────
-- Customers 151-200 have ZERO orders (JOIN trap)
-- Customers 42 and 137 are both "John Smith" (duplicate name trap)

INSERT INTO customers (id, first_name, last_name, email, city, membership, created_at)
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
  CASE
    WHEN i % 5 < 3 THEN 'standard'
    WHEN i % 5 = 3 THEN 'premium'
    ELSE 'vip'
  END,
  '2023-06-01'::timestamp + (i * INTERVAL '2 days' + (i % 7) * INTERVAL '5 hours')
FROM generate_series(1, 200) AS g(i);

-- TRAP 4: Two "John Smith" with different IDs, emails, and cities
UPDATE customers SET first_name = 'John', last_name = 'Smith',
  email = 'john.smith.chi@example.com', city = 'Chicago' WHERE id = 42;
UPDATE customers SET first_name = 'John', last_name = 'Smith',
  email = 'john.smith.den@example.com', city = 'Denver' WHERE id = 137;

SELECT setval('customers_id_seq', 200);

-- ─── PRODUCTS: 50 rows ─────────────────────────────────────────────
-- Products 41-50 have ZERO orders (dead inventory for LEFT JOIN exercise)

INSERT INTO products (id, name, category, price, stock_quantity, created_at)
SELECT
  i,
  (ARRAY[
    'Wireless Headphones','USB-C Charging Hub','Adjustable Laptop Stand','Mechanical Keyboard',
    'LED Monitor Light','HD Webcam 1080p','Extended Mouse Pad','Cable Management Kit',
    'Screen Protector Film','Fast Phone Charger',
    'Cotton T-Shirt','Denim Jacket','Running Shoes','Leather Wallet','Sunglasses Classic',
    'Wool Beanie Hat','Canvas Backpack','Silk Scarf','Athletic Shorts','Oxford Dress Shirt',
    'Cast Iron Skillet','Bamboo Cutting Board','French Press Coffee','Steel Water Bottle','Ceramic Mug Set',
    'Digital Kitchen Timer','Mixing Bowl Set','Whistling Tea Kettle','Herb Garden Kit','Knife Sharpener',
    'Yoga Mat Premium','Resistance Band Set','Speed Jump Rope','Foam Roller','Dumbbell Pair 10lb',
    'Cycling Gloves','Swim Goggles Pro','Tennis Ball Pack','Merino Hiking Socks','Microfiber Sport Towel',
    'SQL Cookbook','Data Science Guide','Python Programming','Database Internals','Clean Code',
    'Design Patterns','Algorithm Manual','Statistics Intro','Machine Learning 101','Web Dev Handbook'
  ])[i],
  CASE
    WHEN i <= 10 THEN 'Electronics'
    WHEN i <= 20 THEN 'Clothing'
    WHEN i <= 30 THEN 'Home & Kitchen'
    WHEN i <= 40 THEN 'Sports'
    ELSE 'Books'
  END,
  ROUND(((((i * 1373 + 29) % 491) * 100 + 999)::numeric) / 100, 2),
  (i * 7 + 13) % 200 + 5,
  '2023-03-01'::timestamp + (i * INTERVAL '4 days')
FROM generate_series(1, 50) AS g(i);

SELECT setval('products_id_seq', 50);

-- ─── ORDERS: 300 rows ──────────────────────────────────────────────
-- Month layout (Q4 gets 2x orders):
--   Jan 2024: orders 1-15     | Feb 2024: orders 16-30 (TRAP: no delivered)
--   Mar 2024: orders 31-45    | Apr 2024: orders 46-60
--   May 2024: orders 61-75    | Jun 2024: orders 76-90
--   Jul 2024: orders 91-105   | Aug 2024: orders 106-120 (TRAP: no delivered)
--   Sep 2024: orders 121-135  | Oct 2024: orders 136-150
--   Nov 2024: orders 151-180 (30 — Q4 spike)
--   Dec 2024: orders 181-210 (30 — Q4 spike)
--   Jan 2025: orders 211-225  | Feb 2025: orders 226-240
--   Mar 2025: orders 241-255  | Apr 2025: orders 256-270
--   May 2025: orders 271-285  | Jun 2025: orders 286-300
--
-- Status rules:
--   cancelled → total = 0.00, shipped_at = NULL, delivered_at = NULL
--   returned  → total = NEGATIVE, shipped_at NOT NULL, delivered_at NOT NULL
--   Trap months (Feb, Aug 2024) → only cancelled/processing/returned (NO delivered)

WITH base AS (
  SELECT
    i,
    -- Month index: 1=Jan2024, 2=Feb2024, ..., 18=Jun2025
    CASE
      WHEN i <= 150 THEN ((i - 1) / 15) + 1
      WHEN i <= 180 THEN 11
      WHEN i <= 210 THEN 12
      ELSE ((i - 211) / 15) + 13
    END AS month_idx,
    -- Day within month (spread across the month)
    CASE
      WHEN i <= 150 THEN ((i - 1) % 15) * 2
      WHEN i <= 180 THEN (i - 151)
      WHEN i <= 210 THEN (i - 181)
      ELSE ((i - 211) % 15) * 2
    END AS day_in_month,
    -- Customer: 1-150 only (151-200 have no orders = JOIN trap)
    ((i * 7 + 3) % 150) + 1 AS cid,
    -- Product: 1-40 only (41-50 have no orders = dead inventory)
    ((i * 13 + 5) % 40) + 1 AS pid
  FROM generate_series(1, 300) AS g(i)
),
with_status AS (
  SELECT
    b.*,
    CASE
      -- TRAP MONTHS (month 2 = Feb, month 8 = Aug): NO delivered or shipped
      WHEN b.month_idx = 2 THEN
        CASE WHEN b.i % 10 < 3 THEN 'cancelled' WHEN b.i % 10 < 5 THEN 'processing' ELSE 'returned' END
      WHEN b.month_idx = 8 THEN
        CASE WHEN b.i % 10 < 3 THEN 'cancelled' WHEN b.i % 10 < 5 THEN 'processing' ELSE 'returned' END
      -- Normal months: ~40% delivered, ~15% shipped, ~15% processing, ~20% cancelled, ~10% returned
      WHEN (b.i * 7 + 3) % 20 < 8 THEN 'delivered'
      WHEN (b.i * 7 + 3) % 20 < 11 THEN 'shipped'
      WHEN (b.i * 7 + 3) % 20 < 14 THEN 'processing'
      WHEN (b.i * 7 + 3) % 20 < 18 THEN 'cancelled'
      ELSE 'returned'
    END AS status
  FROM base b
),
with_dates AS (
  SELECT
    s.*,
    ('2024-01-01'::date + (s.month_idx - 1) * INTERVAL '1 month' + s.day_in_month * INTERVAL '1 day'
      + (s.i % 12) * INTERVAL '1 hour')::timestamp AS base_date
  FROM with_status s
)
INSERT INTO orders (id, customer_id, product_id, status, total, shipped_at, delivered_at, created_at)
SELECT
  d.i,
  d.cid,
  d.pid,
  d.status,
  -- TRAP 3: cancelled=$0, returned=NEGATIVE
  CASE
    WHEN d.status = 'cancelled' THEN 0.00
    WHEN d.status = 'returned'  THEN -ROUND(((d.i * 1373 + 29) % 49001 + 999)::numeric / 100, 2)
    ELSE ROUND(((d.i * 1373 + 29) % 49001 + 999)::numeric / 100, 2)
  END,
  -- shipped_at: NULL for cancelled/processing; base_date + 1-3 days for others
  CASE
    WHEN d.status IN ('shipped', 'delivered', 'returned')
      THEN d.base_date + INTERVAL '1 day' + (d.i % 3) * INTERVAL '1 day'
    ELSE NULL
  END,
  -- delivered_at: only for delivered/returned; shipped_at + 2-5 days
  CASE
    WHEN d.status IN ('delivered', 'returned')
      THEN d.base_date + INTERVAL '4 days' + (d.i % 4) * INTERVAL '1 day'
    ELSE NULL
  END,
  d.base_date
FROM with_dates d
ORDER BY d.i;

SELECT setval('orders_id_seq', 300);

-- ─── REVIEWS: 150 rows ─────────────────────────────────────────────
-- Only delivered and returned orders get reviews (NOT processing/shipped/cancelled)
-- Rating distribution: 5★ 30%, 4★ 25%, 3★ 20%, 2★ 15%, 1★ 10%
-- 1-star reviews have significantly longer body text (complaint correlation)

WITH eligible AS (
  SELECT
    ROW_NUMBER() OVER (ORDER BY o.id) AS rid,
    o.id AS oid,
    o.customer_id AS cid,
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
  LIMIT 150
)
INSERT INTO reviews (id, order_id, customer_id, rating, body, created_at)
SELECT
  rid,
  oid,
  cid,
  rating,
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
      'Extremely disappointed with this purchase. The product arrived damaged and customer support was completely unhelpful throughout the entire process. After waiting two weeks for any kind of response, I was told they could not process a refund at all. The quality is far below what was advertised on the listing and I would absolutely not recommend this to anyone considering buying it. Complete waste of money and a terrible experience from start to finish.',
      'Absolute waste of money and I regret this purchase entirely. The item broke within the very first week of normal use which is unacceptable. I have tried contacting the seller multiple times through every available channel but received zero response whatsoever. Save yourself the trouble and headache and buy from a reputable brand instead. This is by far the worst online shopping experience I have ever had in my entire life and I have been shopping online for over a decade.',
      'Do not buy this product under any circumstances no matter how good the deal looks. It looks absolutely nothing like the pictures shown in the listing and the material quality is genuinely terrible upon close inspection. I requested a return immediately but the process has been an absolute nightmare from the very start with endless back and forth. Still waiting for my refund after three full weeks of daily emails and phone calls to their support team. Buyer beware because you will certainly regret this purchase.'
    ])[variant + 1]
  END,
  order_date + INTERVAL '5 days' + variant * INTERVAL '2 days'
FROM eligible;

SELECT setval('reviews_id_seq', 150);
