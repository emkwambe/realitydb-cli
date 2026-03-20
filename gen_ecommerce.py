#!/usr/bin/env python3
"""Generate enriched ecommerce.sql"""
import random
from datetime import datetime, timedelta
random.seed(42)

out = []

out.append("""CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  city VARCHAR(100),
  country VARCHAR(100) NOT NULL DEFAULT 'US',
  lifetime_value_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  brand VARCHAR(100),
  sku VARCHAR(50) NOT NULL UNIQUE,
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  ordered_at TIMESTAMP NOT NULL DEFAULT now(),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rating INTEGER NOT NULL,
  title VARCHAR(255),
  body TEXT,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);""")

def uid(prefix, n):
    return f"{prefix}-0000-0000-0000-{n:012d}"
def esc(s):
    return s.replace("'", "''")
def fmt_ts(dt):
    return dt.strftime('%Y-%m-%d %H:%M:%S')

base_date = datetime(2023, 6, 1)
end_date = datetime(2026, 2, 28)
total_days = (end_date - base_date).days

def random_date():
    if random.random() < 0.6:
        d = datetime(2025, 3, 1) + timedelta(days=random.randint(0, 365))
        if d > end_date: d = end_date - timedelta(days=random.randint(0,60))
        return d
    return base_date + timedelta(days=random.randint(0, total_days))

first_names = ['Sofia', 'James', 'Maria', 'Wei', 'Priya', 'Carlos', 'Fatima', 'David', 'Aisha', 'Robert',
    'Mei', 'Ahmed', 'Elena', 'Thomas', 'Ana', 'Marcus', 'Yuki', 'Kevin', 'Carmen', 'William',
    'Deepa', 'Patrick', 'Rosa', 'Dmitri', 'Zara', 'Samuel', 'Lin', 'Omar', 'Grace', 'Raj',
    'Isabella', 'Liam', 'Valentina', 'Noah', 'Amara', 'Ethan', 'Nadia', 'Lucas', 'Hana', 'Mason',
    'Jennifer', 'Daniel', 'Sarah', 'Alexander', 'Emily', 'Benjamin', 'Rachel', 'Kwame', 'Lisa', 'Jamal',
    'Olivia', 'Hiroshi', 'Emma', 'Diego', 'Chloe', 'Ivan', 'Layla', 'Henrik', 'Aaliyah', 'Pedro',
    'Mia', 'Sanjay', 'Ava', 'Kofi', 'Gabriela', 'Hassan', 'Diana', 'Andrei', 'Ingrid', 'Yusuf',
    'Jessica', 'Michael', 'Amanda', 'Brian', 'Nicole', 'Ryan', 'Stephanie', 'Jason', 'Lauren', 'Justin',
    'Ashley', 'Brandon', 'Amber', 'Tyler', 'Kayla', 'Joshua', 'Megan', 'Andrew', 'Brittany', 'Nathan',
    'Tanya', 'Chris', 'Bianca', 'Derek', 'Suki', 'Jordan', 'Katarina', 'Sean', 'Nia', 'Kyle']
last_names = ['Santos', 'Chen', 'Williams', 'Patel', 'Hernandez', 'Kim', 'Johnson', 'Nguyen', 'Garcia',
    'Brown', 'Martinez', 'Davis', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris',
    'Lee', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Lopez',
    'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez',
    'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart',
    'Sanchez', 'Morris', 'Rogers', 'Okafor', 'Mueller', 'Tanaka', 'Singh', 'Johansson', 'Petrov',
    'Costa', 'Dubois', 'Nakamura', 'Kowalski']

cities_weighted = (['New York']*12 + ['Los Angeles']*10 + ['Chicago']*8 + ['Houston']*7 +
    ['Phoenix']*5 + ['Philadelphia']*5 + ['San Antonio']*4 + ['San Diego']*4 + ['Dallas']*4 +
    ['San Jose']*3 + ['Austin']*3 + ['Jacksonville']*3 + ['Fort Worth']*3 + ['Columbus']*3 +
    ['Charlotte']*3 + ['Indianapolis']*3 + ['San Francisco']*3 + ['Seattle']*3 + ['Denver']*3 +
    ['Nashville']*3)

# Customers (200)
out.append("\n-- Customers (200)")
cust_rows = []
for i in range(1, 201):
    fn = first_names[(i-1) % len(first_names)]
    ln = last_names[(i-1) % len(last_names)]
    email = f"{fn.lower()}.{ln.lower()}@example.com"
    phone = f"555-{i:04d}"
    city = random.choice(cities_weighted)
    ltv = random.randint(0, 200000)
    created = random_date()
    cust_rows.append((i, email, fn, ln, phone, city, ltv, fmt_ts(created)))

for bs in range(0, len(cust_rows), 50):
    batch = cust_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('e0000000', r[0])}', '{r[1]}', '{esc(r[2])}', '{esc(r[3])}', '{r[4]}', '{r[5]}', 'US', {r[6]}, '{r[7]}')")
    out.append(f"INSERT INTO customers (id, email, first_name, last_name, phone, city, country, lifetime_value_cents, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Categories (8)
cats = [
    (1, 'Electronics', 'electronics'), (2, 'Clothing', 'clothing'), (3, 'Home & Garden', 'home-garden'),
    (4, 'Books', 'books'), (5, 'Sports', 'sports'), (6, 'Toys', 'toys'), (7, 'Beauty', 'beauty'), (8, 'Food', 'food'),
]
out.append("\n-- Categories (8)")
vals = []
for c in cats:
    vals.append(f"('{uid('f0000000', c[0])}', '{esc(c[1])}', '{c[2]}', NULL)")
out.append(f"INSERT INTO categories (id, name, slug, parent_id) VALUES\n" + ",\n".join(vals) + ";")

# Products (100) - ~12-13 per category
products_by_cat = {
    1: [  # Electronics
        ('Wireless Noise-Canceling Headphones', 14999, 'AudioMax', 'ELEC-001'),
        ('Smart Watch Pro', 29999, 'TechWear', 'ELEC-002'),
        ('USB-C Hub 7-in-1', 4999, 'ConnectPro', 'ELEC-003'),
        ('Mechanical Gaming Keyboard', 12999, 'KeyTech', 'ELEC-004'),
        ('4K Webcam Ultra', 8999, 'VisionTech', 'ELEC-005'),
        ('Portable Bluetooth Speaker', 3999, 'SoundWave', 'ELEC-006'),
        ('Wireless Charging Pad', 2499, 'ChargePro', 'ELEC-007'),
        ('Noise-Canceling Earbuds', 19999, 'AudioMax', 'ELEC-008'),
        ('Smart Home Hub', 9999, 'HomeTech', 'ELEC-009'),
        ('External SSD 1TB', 8499, 'DataVault', 'ELEC-010'),
        ('Gaming Mouse RGB', 5999, 'KeyTech', 'ELEC-011'),
        ('Smart Doorbell Camera', 14999, 'HomeTech', 'ELEC-012'),
        ('Tablet 10.2 inch', 34999, 'TechWear', 'ELEC-013'),
    ],
    2: [  # Clothing
        ('Organic Cotton T-Shirt', 2499, 'EcoWear', 'CLTH-001'),
        ('Slim Fit Denim Jeans', 5999, 'DenimCo', 'CLTH-002'),
        ('Waterproof Running Jacket', 8999, 'RunFit', 'CLTH-003'),
        ('Merino Wool Sweater', 7999, 'NordicKnit', 'CLTH-004'),
        ('Athletic Performance Shorts', 3499, 'RunFit', 'CLTH-005'),
        ('Leather Belt Classic', 2999, 'LeatherCraft', 'CLTH-006'),
        ('Down Winter Parka', 14999, 'NordicKnit', 'CLTH-007'),
        ('Linen Button-Down Shirt', 4499, 'EcoWear', 'CLTH-008'),
        ('Fleece Zip-Up Hoodie', 4999, 'ComfortWear', 'CLTH-009'),
        ('Chino Pants Relaxed Fit', 4499, 'DenimCo', 'CLTH-010'),
        ('Cashmere Scarf', 6999, 'NordicKnit', 'CLTH-011'),
        ('Canvas Sneakers', 5499, 'StreetStep', 'CLTH-012'),
    ],
    3: [  # Home & Garden
        ('Standing Desk Electric', 49999, 'ErgoDesk', 'HOME-001'),
        ('LED Desk Lamp Smart', 3999, 'LightTech', 'HOME-002'),
        ('Ceramic Plant Pot Set', 2999, 'GreenHome', 'HOME-003'),
        ('Robot Vacuum Cleaner', 39999, 'CleanBot', 'HOME-004'),
        ('Air Purifier HEPA', 24999, 'PureAir', 'HOME-005'),
        ('Memory Foam Pillow Set', 4999, 'SleepWell', 'HOME-006'),
        ('Stainless Cookware Set', 14999, 'ChefPro', 'HOME-007'),
        ('Garden Tool Set 12pc', 3499, 'GreenHome', 'HOME-008'),
        ('Smart Thermostat', 19999, 'HomeTech', 'HOME-009'),
        ('Weighted Blanket 15lb', 5999, 'SleepWell', 'HOME-010'),
        ('Indoor Herb Garden Kit', 2999, 'GreenHome', 'HOME-011'),
        ('Espresso Machine Auto', 64999, 'BrewMaster', 'HOME-012'),
        ('Electric Kettle Glass', 3499, 'BrewMaster', 'HOME-013'),
    ],
    4: [  # Books
        ('SQL Mastery Complete Guide', 3999, 'TechPress', 'BOOK-001'),
        ('Clean Code Handbook', 4499, 'DevBooks', 'BOOK-002'),
        ('Data Structures & Algorithms', 3499, 'TechPress', 'BOOK-003'),
        ('Python for Data Science', 4999, 'TechPress', 'BOOK-004'),
        ('System Design Interview', 3999, 'DevBooks', 'BOOK-005'),
        ('Machine Learning Fundamentals', 5499, 'TechPress', 'BOOK-006'),
        ('The Art of Problem Solving', 2999, 'DevBooks', 'BOOK-007'),
        ('Cloud Architecture Patterns', 4499, 'TechPress', 'BOOK-008'),
        ('JavaScript: The Good Parts', 2999, 'DevBooks', 'BOOK-009'),
        ('Designing Data-Intensive Apps', 4999, 'TechPress', 'BOOK-010'),
        ('The Pragmatic Programmer', 4499, 'DevBooks', 'BOOK-011'),
        ('Intro to Algorithms', 6999, 'TechPress', 'BOOK-012'),
    ],
    5: [  # Sports
        ('Non-Slip Yoga Mat', 3499, 'FlexFit', 'SPRT-001'),
        ('Resistance Band Set', 1999, 'FlexFit', 'SPRT-002'),
        ('Insulated Water Bottle', 2499, 'HydroMax', 'SPRT-003'),
        ('Hiking Boots Waterproof', 13999, 'TrailPro', 'SPRT-004'),
        ('Adjustable Dumbbell Set', 29999, 'IronFit', 'SPRT-005'),
        ('Running Shoes Lightweight', 11999, 'RunFit', 'SPRT-006'),
        ('Cycling Helmet Aero', 8999, 'RideSafe', 'SPRT-007'),
        ('Tennis Racket Pro', 14999, 'CourtKing', 'SPRT-008'),
        ('Foam Roller Recovery', 2499, 'FlexFit', 'SPRT-009'),
        ('Swim Goggles Anti-Fog', 1999, 'AquaPro', 'SPRT-010'),
        ('Jump Rope Speed', 1499, 'FlexFit', 'SPRT-011'),
        ('Camping Tent 4-Person', 19999, 'TrailPro', 'SPRT-012'),
        ('Basketball Official Size', 2999, 'CourtKing', 'SPRT-013'),
    ],
    6: [  # Toys
        ('Building Block Set 500pc', 3999, 'BuildFun', 'TOYS-001'),
        ('Remote Control Car', 4999, 'SpeedToy', 'TOYS-002'),
        ('Science Experiment Kit', 2999, 'EduPlay', 'TOYS-003'),
        ('Wooden Puzzle Set', 1999, 'ClassicToy', 'TOYS-004'),
        ('Art Supply Kit Deluxe', 3499, 'CreativeKids', 'TOYS-005'),
        ('Board Game Collection', 2999, 'GameNight', 'TOYS-006'),
        ('Stuffed Animal Giant', 2499, 'CuddlePal', 'TOYS-007'),
        ('Drone with Camera', 7999, 'SkyFly', 'TOYS-008'),
        ('Play Kitchen Set', 8999, 'PlayTime', 'TOYS-009'),
        ('Model Train Set', 11999, 'ClassicToy', 'TOYS-010'),
        ('Action Figure Collection', 1999, 'HeroPlay', 'TOYS-011'),
        ('Musical Instrument Set Kids', 2999, 'EduPlay', 'TOYS-012'),
    ],
    7: [  # Beauty
        ('Vitamin C Serum', 2999, 'GlowSkin', 'BEAU-001'),
        ('Moisturizing Face Cream', 3499, 'GlowSkin', 'BEAU-002'),
        ('Hair Dryer Professional', 7999, 'StylePro', 'BEAU-003'),
        ('Organic Shampoo Set', 1999, 'NatureLux', 'BEAU-004'),
        ('Makeup Brush Set 12pc', 2499, 'BeautyTool', 'BEAU-005'),
        ('Retinol Night Cream', 3999, 'GlowSkin', 'BEAU-006'),
        ('Electric Toothbrush', 8999, 'OralCare', 'BEAU-007'),
        ('Sunscreen SPF 50', 1499, 'SunShield', 'BEAU-008'),
        ('Perfume Eau de Parfum', 6999, 'Fragrance', 'BEAU-009'),
        ('Nail Polish Set 8-Pack', 1999, 'ColorNail', 'BEAU-010'),
        ('Face Mask Variety Pack', 1499, 'GlowSkin', 'BEAU-011'),
        ('Curling Iron Ceramic', 4999, 'StylePro', 'BEAU-012'),
    ],
    8: [  # Food
        ('Coffee Beans Single Origin 1kg', 1899, 'BeanCraft', 'FOOD-001'),
        ('Chocolate Protein Bars 12pk', 2999, 'NutriMax', 'FOOD-002'),
        ('Japanese Green Tea Variety', 2499, 'TeaHouse', 'FOOD-003'),
        ('Organic Honey Raw 16oz', 1299, 'NatureBee', 'FOOD-004'),
        ('Mixed Nuts Premium 2lb', 1999, 'NutriMax', 'FOOD-005'),
        ('Dark Chocolate Truffles', 2499, 'ChocoLux', 'FOOD-006'),
        ('Olive Oil Extra Virgin', 1699, 'MediterraneanBest', 'FOOD-007'),
        ('Protein Powder Whey 2lb', 3499, 'NutriMax', 'FOOD-008'),
        ('Dried Fruit Assortment', 1499, 'NatureBee', 'FOOD-009'),
        ('Hot Sauce Gift Set', 1999, 'SpiceKing', 'FOOD-010'),
        ('Matcha Powder Ceremonial', 2999, 'TeaHouse', 'FOOD-011'),
        ('Granola Variety Pack', 1299, 'NutriMax', 'FOOD-012'),
        ('Artisan Pasta Collection', 1799, 'MediterraneanBest', 'FOOD-013'),
    ],
}

all_products = []
prod_id = 0
for cat_id, prods in products_by_cat.items():
    for name, price, brand, sku in prods:
        prod_id += 1
        compare = int(price * random.uniform(1.15, 1.35)) if random.random() < 0.4 else None
        rating = round(random.uniform(2.5, 5.0), 1)
        if rating > 5.0: rating = 5.0
        review_count = random.randint(5, 500)
        in_stock = 'true' if random.random() < 0.9 else 'false'
        created = random_date()
        desc = f"Premium quality {name.lower()}"
        all_products.append((prod_id, name, desc, cat_id, price, compare, brand, sku, rating, review_count, in_stock, fmt_ts(created)))

out.append("\n-- Products (100)")
for bs in range(0, len(all_products), 50):
    batch = all_products[bs:bs+50]
    vals = []
    for r in batch:
        comp_str = str(r[5]) if r[5] else "NULL"
        vals.append(f"('{uid('10000000', r[0])}', '{esc(r[1])}', '{esc(r[2])}', '{uid('f0000000', r[3])}', {r[4]}, {comp_str}, '{r[6]}', '{r[7]}', {r[8]}, {r[9]}, {r[10]}, '{r[11]}')")
    out.append(f"INSERT INTO products (id, name, description, category_id, price_cents, compare_at_price_cents, brand, sku, rating, review_count, in_stock, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Orders (400)
status_dist = ['delivered']*180 + ['shipped']*80 + ['processing']*60 + ['cancelled']*48 + ['returned']*32

out.append("\n-- Orders (400)")
order_rows = []
delivered_orders = []  # (order_idx, customer_id, delivered_at)
for i in range(1, 401):
    cust_id = random.randint(1, 200)
    status = status_dist[i-1]
    total = random.randint(999, 200000)
    discount = 0 if random.random() < 0.7 else random.randint(100, int(total * 0.2))
    ordered = random_date()

    if status in ('cancelled', 'processing'):
        shipped_str = "NULL"
        delivered_str = "NULL"
    elif status == 'shipped':
        ship = ordered + timedelta(days=random.randint(1, 3))
        shipped_str = f"'{fmt_ts(ship)}'"
        delivered_str = "NULL"
    else:  # delivered, returned
        ship = ordered + timedelta(days=random.randint(1, 3))
        deliver = ship + timedelta(days=random.randint(1, 5))
        shipped_str = f"'{fmt_ts(ship)}'"
        delivered_str = f"'{fmt_ts(deliver)}'"
        delivered_orders.append((i, cust_id, deliver))

    order_rows.append((i, cust_id, status, total, discount, fmt_ts(ordered), shipped_str, delivered_str))

for bs in range(0, len(order_rows), 50):
    batch = order_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('20000000', r[0])}', '{uid('e0000000', r[1])}', '{r[2]}', {r[3]}, {r[4]}, 'USD', '{r[5]}', {r[6]}, {r[7]})")
    out.append(f"INSERT INTO orders (id, customer_id, status, total_cents, discount_cents, currency, ordered_at, shipped_at, delivered_at) VALUES\n" + ",\n".join(vals) + ";")

# Order Items (800)
# Power law: 50% have 1, 25% have 2, 12% have 3, 8% have 4, 5% have 5
items_per_order = []
for i in range(400):
    r = random.random()
    if r < 0.50: n = 1
    elif r < 0.75: n = 2
    elif r < 0.87: n = 3
    elif r < 0.95: n = 4
    else: n = 5
    items_per_order.append(n)

# Adjust to get ~800 total
total_items = sum(items_per_order)
# Fine, whatever we get is close enough

out.append(f"\n-- Order Items ({total_items})")
item_rows = []
item_id = 0
for order_idx in range(400):
    n_items = items_per_order[order_idx]
    used_products = set()
    for _ in range(n_items):
        item_id += 1
        prod_idx = random.randint(0, len(all_products)-1)
        while prod_idx in used_products:
            prod_idx = random.randint(0, len(all_products)-1)
        used_products.add(prod_idx)
        prod = all_products[prod_idx]
        qty = random.choices([1, 2, 3], weights=[70, 20, 10])[0]
        item_rows.append((item_id, order_idx+1, prod[0], qty, prod[4]))

for bs in range(0, len(item_rows), 50):
    batch = item_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('30000000', r[0])}', '{uid('20000000', r[1])}', '{uid('10000000', r[2])}', {r[3]}, {r[4]})")
    out.append(f"INSERT INTO order_items (id, order_id, product_id, quantity, unit_price_cents) VALUES\n" + ",\n".join(vals) + ";")

# Reviews (250) - only for delivered/returned orders
rating_dist = [5]*87 + [4]*75 + [3]*50 + [2]*25 + [1]*13
review_titles_5 = ['Absolutely love it!', 'Best purchase ever', 'Exceeded expectations', 'Highly recommend', 'Perfect quality',
    'Amazing product', 'Worth every penny', 'Outstanding quality', 'Five stars all the way', 'Couldn''t be happier']
review_titles_4 = ['Great product', 'Very satisfied', 'Good quality', 'Would buy again', 'Solid choice',
    'Really nice', 'Good value', 'Pleased with purchase', 'Works great', 'Happy with it']
review_titles_3 = ['Decent product', 'Average quality', 'It''s okay', 'Not bad', 'Gets the job done',
    'Mixed feelings', 'Expected more', 'Adequate', 'Room for improvement', 'Mediocre']
review_titles_2 = ['Disappointed', 'Below expectations', 'Not worth it', 'Could be better', 'Underwhelming']
review_titles_1 = ['Terrible quality', 'Complete waste of money', 'Do not buy', 'Very disappointed', 'Worst purchase']

review_bodies_5 = ['This is exactly what I was looking for. Great quality and fast shipping.',
    'Impressed with the build quality. Works perfectly right out of the box.',
    'My family loves this product. Would definitely buy again.']
review_bodies_4 = ['Good product overall. Minor issues but nothing major.',
    'Works well for the price. Packaging could be better.',
    'Happy with this purchase. Delivery was quick.']
review_bodies_3 = ['It does what it says but nothing special. Okay for the price.',
    'Average product. Not terrible but not amazing either.',
    'Works fine but I expected a bit more for what I paid.']
review_bodies_2 = ['Not very impressed. The quality feels cheap and flimsy.',
    'Had some issues right away. Customer service was slow to respond.',
    'Doesn''t match the description well. Somewhat disappointed with the purchase.']
review_bodies_1 = ['Absolutely terrible. Broke within the first week of use. The materials feel incredibly cheap and the craftsmanship is nonexistent. I tried contacting customer support multiple times but never got a response. Complete waste of money.',
    'This is the worst product I have ever purchased. It arrived damaged, the instructions were incomprehensible, and when I finally got it assembled it didn''t work at all. Save your money and buy literally anything else.',
    'Do not waste your money on this product. It looks nothing like the photos. The quality is abysmal and it stopped working after three days. I am extremely frustrated with this purchase and the lack of any customer support.']

out.append("\n-- Reviews (250)")
review_rows = []
for i in range(1, 251):
    rating = rating_dist[(i-1) % len(rating_dist)]
    # Pick a delivered/returned order
    order_info = delivered_orders[(i-1) % len(delivered_orders)]
    order_idx, cust_id, deliver_dt = order_info
    prod_idx = random.randint(1, len(all_products))
    verified = 'true' if random.random() < 0.8 else 'false'
    created = deliver_dt + timedelta(days=random.randint(1, 30))

    if rating == 5:
        title = review_titles_5[(i-1) % len(review_titles_5)]
        body = review_bodies_5[(i-1) % len(review_bodies_5)]
    elif rating == 4:
        title = review_titles_4[(i-1) % len(review_titles_4)]
        body = review_bodies_4[(i-1) % len(review_bodies_4)]
    elif rating == 3:
        title = review_titles_3[(i-1) % len(review_titles_3)]
        body = review_bodies_3[(i-1) % len(review_bodies_3)]
    elif rating == 2:
        title = review_titles_2[(i-1) % len(review_titles_2)]
        body = review_bodies_2[(i-1) % len(review_bodies_2)]
    else:
        title = review_titles_1[(i-1) % len(review_titles_1)]
        body = review_bodies_1[(i-1) % len(review_bodies_1)]

    review_rows.append((i, prod_idx, cust_id, rating, title, body, verified, fmt_ts(created)))

for bs in range(0, len(review_rows), 50):
    batch = review_rows[bs:bs+50]
    vals = []
    for r in batch:
        vals.append(f"('{uid('40000000', r[0])}', '{uid('10000000', r[1])}', '{uid('e0000000', r[2])}', {r[3]}, '{esc(r[4])}', '{esc(r[5])}', {r[6]}, '{r[7]}')")
    out.append(f"INSERT INTO reviews (id, product_id, customer_id, rating, title, body, verified_purchase, created_at) VALUES\n" + ",\n".join(vals) + ";")

with open('/home/user/databox/apps/sandbox/public/data/ecommerce.sql', 'w') as f:
    f.write('\n\n'.join(out) + '\n')
print(f"Generated ecommerce.sql with {len(all_products)} products, {len(order_rows)} orders, {len(item_rows)} order_items, {len(review_rows)} reviews")
