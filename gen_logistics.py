#!/usr/bin/env python3
"""Generate enriched logistics.sql"""
import random
random.seed(42)

out = []

# Schema
out.append("""-- Supply chain / logistics schema and sample data
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  manager VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number VARCHAR(50) NOT NULL UNIQUE,
  origin_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  destination VARCHAR(255) NOT NULL,
  carrier VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  weight_kg NUMERIC(8,2),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  sku VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  reorder_point INTEGER NOT NULL DEFAULT 10,
  unit_cost_cents INTEGER NOT NULL,
  last_restocked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  distance_km NUMERIC(8,1) NOT NULL,
  estimated_hours NUMERIC(5,1) NOT NULL,
  carrier VARCHAR(100) NOT NULL,
  cost_per_kg_cents INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);""")

def uid(prefix, n):
    return f"{prefix}-0000-0000-0000-{n:012d}"

def esc(s):
    return s.replace("'", "''")

# Warehouses
warehouses = [
    (1, 'West Coast Hub', 'Los Angeles, CA', 85000, 'Diana Torres', 'active', '2023-01-15 08:00:00'),
    (2, 'East Coast Distribution', 'Newark, NJ', 95000, 'Kevin Marshall', 'active', '2023-01-15 08:00:00'),
    (3, 'Midwest Fulfillment', 'Chicago, IL', 72000, 'Sandra Olsen', 'active', '2023-02-10 09:00:00'),
    (4, 'Southeast Depot', 'Atlanta, GA', 55000, 'Marcus Reid', 'active', '2023-03-15 10:00:00'),
    (5, 'Pacific Northwest Center', 'Seattle, WA', 45000, 'Amy Nakamura', 'active', '2023-04-01 08:00:00'),
    (6, 'Southwest Gateway', 'Dallas, TX', 68000, 'Roberto Gutierrez', 'active', '2023-05-20 09:00:00'),
    (7, 'Desert Distribution', 'Phoenix, AZ', 42000, 'Jennifer Walsh', 'active', '2023-07-10 08:00:00'),
    (8, 'Mountain Hub', 'Denver, CO', 38000, 'David Kim', 'maintenance', '2023-09-01 10:00:00'),
    (9, 'Coastal Warehouse', 'Miami, FL', 52000, 'Aisha Johnson', 'active', '2024-01-15 08:00:00'),
    (10, 'River City Logistics', 'Memphis, TN', 78000, 'Thomas Chen', 'expanding', '2024-03-01 09:00:00'),
]

out.append("\n-- Warehouses (10)")
vals = []
for w in warehouses:
    vals.append(f"('{uid('a0000000', w[0])}', '{esc(w[1])}', '{esc(w[2])}', {w[3]}, '{esc(w[4])}', '{w[5]}', '{w[6]}')")
out.append(f"INSERT INTO warehouses (id, name, location, capacity, manager, status, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Shipments (300)
wh_ids = [uid('a0000000', i) for i in range(1, 11)]
wh_cities = ['Los Angeles, CA', 'Newark, NJ', 'Chicago, IL', 'Atlanta, GA', 'Seattle, WA', 'Dallas, TX', 'Phoenix, AZ', 'Denver, CO', 'Miami, FL', 'Memphis, TN']
carriers_dist = ['FedEx']*25 + ['UPS']*25 + ['USPS']*20 + ['DHL']*15 + ['Amazon']*15
statuses_dist = ['delivered']*50 + ['in_transit']*25 + ['out_for_delivery']*10 + ['exception']*10 + ['label_created']*5
us_cities = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA',
             'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA', 'Austin, TX', 'Jacksonville, FL',
             'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC', 'Indianapolis, IN', 'San Francisco, CA',
             'Seattle, WA', 'Denver, CO', 'Nashville, TN', 'Portland, OR', 'Las Vegas, NV', 'Detroit, MI',
             'Minneapolis, MN', 'Boston, MA', 'El Paso, TX', 'Tampa, FL', 'Orlando, FL', 'St. Louis, MO',
             'Baltimore, MD', 'Kansas City, MO', 'Sacramento, CA', 'Boise, ID', 'Richmond, VA', 'Salt Lake City, UT']

from datetime import datetime, timedelta
base_date = datetime(2023, 6, 1)
end_date = datetime(2026, 2, 28)
total_days = (end_date - base_date).days

def random_date_recency():
    """60% in last 12 months"""
    if random.random() < 0.6:
        d = datetime(2025, 3, 1) + timedelta(days=random.randint(0, 365))
        if d > end_date:
            d = end_date - timedelta(days=random.randint(0, 30))
        return d
    else:
        return base_date + timedelta(days=random.randint(0, total_days))

def fmt_ts(dt):
    return dt.strftime('%Y-%m-%d %H:%M:%S')

out.append("\n-- Shipments (300)")
shipment_rows = []
for i in range(1, 301):
    trk_prefix = "TRK-2025" if i > 200 else "TRK-2024"
    trk = f"{trk_prefix}-{i:05d}"
    wh_idx = random.randint(0, 9)
    origin_id = wh_ids[wh_idx]
    dest = random.choice([c for c in us_cities if c != wh_cities[wh_idx]])
    carrier = random.choice(carriers_dist)
    status = random.choice(statuses_dist)
    weight = round(random.lognormvariate(3.0, 1.5), 2)
    weight = max(0.5, min(500.0, weight))

    created = random_date_recency()
    shipped_at = "NULL"
    delivered_at = "NULL"

    if status == 'label_created':
        pass
    elif status in ('in_transit', 'out_for_delivery', 'exception'):
        ship_d = created + timedelta(hours=random.randint(1, 24))
        shipped_at = f"'{fmt_ts(ship_d)}'"
    elif status == 'delivered':
        ship_d = created + timedelta(hours=random.randint(1, 24))
        deliver_d = ship_d + timedelta(hours=random.randint(12, 120))
        shipped_at = f"'{fmt_ts(ship_d)}'"
        delivered_at = f"'{fmt_ts(deliver_d)}'"

    shipment_rows.append((uid('b0000000', i), trk, origin_id, dest, carrier, status, weight, shipped_at, delivered_at, fmt_ts(created)))

# Write in batches of 50
for batch_start in range(0, len(shipment_rows), 50):
    batch = shipment_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{r[1]}', '{r[2]}', '{esc(r[3])}', '{r[4]}', '{r[5]}', {r[6]}, {r[7]}, {r[8]}, '{r[9]}')")
    out.append(f"INSERT INTO shipments (id, tracking_number, origin_warehouse_id, destination, carrier, status, weight_kg, shipped_at, delivered_at, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Inventory (200) - 20 items per warehouse
products = [
    ('ELEC-TV-55', '55" 4K Smart TV', 42999), ('ELEC-LP-14', '14" Laptop Pro', 89999),
    ('ELEC-PHONE-13', 'Smartphone 13 Pro', 99999), ('ELEC-TAB-10', '10" Tablet', 44999),
    ('ELEC-HDPH-NC', 'Noise-Canceling Headphones', 29999), ('ELEC-WATCH-S8', 'Smart Watch Series 8', 39999),
    ('ELEC-SPK-BT', 'Bluetooth Speaker Portable', 7999), ('ELEC-MK-RGB', 'RGB Mechanical Keyboard', 12999),
    ('HOME-CHAIR-ERG', 'Ergonomic Office Chair', 34999), ('HOME-DESK-STD', 'Standing Desk Adjustable', 54999),
    ('HOME-VAC-RBT', 'Robot Vacuum Cleaner', 39999), ('HOME-BLND-PRO', 'Professional Blender', 14999),
    ('HOME-COFFEE-AUT', 'Automatic Espresso Machine', 64999), ('HOME-AIR-PUR', 'HEPA Air Purifier', 24999),
    ('CLOTH-JKT-WTR', 'Winter Jacket Insulated', 12999), ('CLOTH-SNK-RUN', 'Running Sneakers', 12999),
    ('SPORT-BIKE-MTN', 'Mountain Bike 27.5"', 74999), ('SPORT-YOGA-MAT', 'Premium Yoga Mat', 4999),
    ('FOOD-COFFEE-1KG', 'Single Origin Coffee Beans 1kg', 2499), ('FOOD-PROTEIN-12', 'Protein Bar Box of 12', 3499),
]

out.append("\n-- Inventory (200)")
inv_rows = []
inv_id = 0
for wh in range(10):
    for p_idx in range(20):
        inv_id += 1
        sku = products[p_idx][0]
        name = products[p_idx][1]
        cost = products[p_idx][2]
        qty = random.randint(0, 500)
        if random.random() < 0.10:
            qty = 0
        reorder = random.choice([10, 15, 20, 25, 30, 40, 50, 60, 75, 100])
        restock = random_date_recency() if random.random() > 0.1 else None
        created = datetime(2023, 1, 10) + timedelta(days=random.randint(0, 200))

        restock_str = f"'{fmt_ts(restock)}'" if restock else "NULL"
        inv_rows.append((uid('c0000000', inv_id), wh_ids[wh], sku, name, qty, reorder, cost, restock_str, fmt_ts(created)))

for batch_start in range(0, len(inv_rows), 50):
    batch = inv_rows[batch_start:batch_start+50]
    vals = []
    for r in batch:
        vals.append(f"('{r[0]}', '{r[1]}', '{r[2]}', '{esc(r[3])}', {r[4]}, {r[5]}, {r[6]}, {r[7]}, '{r[8]}')")
    out.append(f"INSERT INTO inventory (id, warehouse_id, sku, product_name, quantity, reorder_point, unit_cost_cents, last_restocked_at, created_at) VALUES\n" + ",\n".join(vals) + ";")

# Routes (50)
route_carriers = ['FedEx', 'UPS', 'USPS', 'DHL', 'Amazon']
route_data = []
route_id = 0
for i in range(10):
    for j in range(10):
        if i != j:
            route_data.append((wh_cities[i], wh_cities[j]))

random.shuffle(route_data)
route_data = route_data[:50]

# Approximate distances
def approx_distance(c1, c2):
    # Simple deterministic distance based on city indices
    city_coords = {
        'Los Angeles, CA': (34.0, -118.2), 'Newark, NJ': (40.7, -74.2), 'Chicago, IL': (41.9, -87.6),
        'Atlanta, GA': (33.7, -84.4), 'Seattle, WA': (47.6, -122.3), 'Dallas, TX': (32.8, -96.8),
        'Phoenix, AZ': (33.4, -112.1), 'Denver, CO': (39.7, -105.0), 'Miami, FL': (25.8, -80.2),
        'Memphis, TN': (35.1, -90.0)
    }
    lat1, lon1 = city_coords[c1]
    lat2, lon2 = city_coords[c2]
    import math
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return round(6371 * 2 * math.asin(math.sqrt(a)) * 1.3, 1)  # 1.3 for road vs straight line

out.append("\n-- Routes (50)")
route_rows = []
for idx, (orig, dest) in enumerate(route_data):
    route_id = idx + 1
    dist = approx_distance(orig, dest)
    hours = round(dist / 80, 1)  # ~80 km/h average
    carrier = route_carriers[idx % 5]
    cost = random.randint(20, 80)
    active = 'true' if idx < 45 else 'false'
    route_rows.append((uid('d0000000', route_id), orig, dest, dist, hours, carrier, cost, active))

vals = []
for r in route_rows:
    vals.append(f"('{r[0]}', '{esc(r[1])}', '{esc(r[2])}', {r[3]}, {r[4]}, '{r[5]}', {r[6]}, {r[7]})")
out.append(f"INSERT INTO routes (id, origin, destination, distance_km, estimated_hours, carrier, cost_per_kg_cents, active) VALUES\n" + ",\n".join(vals) + ";")

with open('/home/user/databox/apps/sandbox/public/data/logistics.sql', 'w') as f:
    f.write('\n\n'.join(out) + '\n')

print(f"Generated logistics.sql")
