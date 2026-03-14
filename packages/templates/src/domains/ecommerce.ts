import type { DomainTemplate } from '../types.js';

export const ecommerceTemplate: DomainTemplate = {
  name: 'ecommerce',
  version: '2.0',
  description: 'E-commerce store with categories, products, orders, and reviews',
  targetTables: ['customers', 'categories', 'products', 'orders', 'order_items', 'reviews'],
  tableConfigs: new Map([
    ['customers', {
      tableName: 'customers',
      matchPattern: ['customers', '*customer*'],
      rowCountMultiplier: 1.0,
      columnOverrides: [
        { columnName: 'email', strategy: { kind: 'email' } },
        { columnName: 'first_name', strategy: { kind: 'first_name' } },
        { columnName: 'last_name', strategy: { kind: 'last_name' } },
        { columnName: 'phone', strategy: { kind: 'phone' } },
        {
          columnName: 'city',
          strategy: {
            kind: 'enum',
            options: {
              values: ['New York', 'Los Angeles', 'London', 'Toronto', 'Berlin', 'Sydney', 'Tokyo', 'San Francisco', 'Chicago', 'Austin'],
            },
          },
        },
        {
          columnName: 'country',
          strategy: {
            kind: 'enum',
            options: {
              values: ['US', 'CA', 'UK', 'DE', 'FR', 'AU', 'JP', 'BR', 'IN', 'Other'],
              weights: [0.40, 0.08, 0.10, 0.08, 0.06, 0.05, 0.05, 0.04, 0.04, 0.10],
            },
          },
        },
        {
          columnName: 'lifetime_value_cents',
          strategy: { kind: 'money', options: { min: 0, max: 2000000 } },
        },
        {
          columnName: 'created_at',
          matchPattern: ['created_at', 'registered_at', 'signed_up_at'],
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['categories', {
      tableName: 'categories',
      matchPattern: ['categories', '*categor*'],
      rowCountMultiplier: 0.2,
      columnOverrides: [
        {
          columnName: 'name',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books', 'Toys', 'Beauty', 'Food & Drink', 'Automotive', 'Office'],
              weights: [0.18, 0.16, 0.12, 0.10, 0.10, 0.08, 0.08, 0.06, 0.06, 0.06],
            },
          },
        },
        {
          columnName: 'slug',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
      ],
    }],
    ['products', {
      tableName: 'products',
      matchPattern: ['products', 'items', 'catalog', '*product*', '*item*', '*catalog*'],
      rowCountMultiplier: 0.5,
      columnOverrides: [
        {
          columnName: 'name',
          strategy: {
            kind: 'enum',
            options: {
              values: [
                'Wireless Headphones', 'USB-C Cable', 'Phone Case',
                'Laptop Stand', 'Mechanical Keyboard', 'Mouse Pad',
                'Monitor Light', 'Webcam HD', 'Desk Organizer',
                'Portable Charger', 'Smart Watch', 'Fitness Tracker',
                'Bluetooth Speaker', 'Screen Protector', 'Tablet Sleeve',
                'Cable Management Kit', 'Ring Light', 'Microphone USB',
                'External SSD', 'Ergonomic Chair Pad',
              ],
            },
          },
        },
        {
          columnName: 'description',
          strategy: { kind: 'text', options: { mode: 'medium' } },
        },
        {
          columnName: 'price_cents',
          matchPattern: ['price_cents', 'price'],
          strategy: { kind: 'money', options: { min: 499, max: 29999 } },
        },
        {
          columnName: 'compare_at_price_cents',
          strategy: { kind: 'money', options: { min: 0, max: 200000 } },
          description: 'Nullable — original price before discount',
        },
        {
          columnName: 'brand',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Acme', 'NovaCore', 'PeakGear', 'CraftLine', 'TrueForm', 'EverBright', 'Nexus', 'Primewave', 'Solidcraft', 'Zenith'],
            },
          },
        },
        {
          columnName: 'category',
          strategy: {
            kind: 'enum',
            options: {
              values: ['Electronics', 'Accessories', 'Office', 'Audio', 'Wearables'],
              weights: [0.30, 0.25, 0.20, 0.15, 0.10],
            },
          },
        },
        {
          columnName: 'sku',
          strategy: { kind: 'custom', options: { name: 'sku' } },
        },
        {
          columnName: 'rating',
          strategy: { kind: 'float', options: { min: 1.0, max: 5.0 } },
        },
        {
          columnName: 'review_count',
          strategy: { kind: 'integer', options: { min: 0, max: 500 } },
        },
        {
          columnName: 'in_stock',
          strategy: { kind: 'boolean', options: { trueWeight: 0.85 } },
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
    ['orders', {
      tableName: 'orders',
      matchPattern: ['orders', 'purchases', '*order*', '*purchase*'],
      rowCountMultiplier: 2.5,
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['delivered', 'shipped', 'processing', 'pending', 'canceled', 'returned'],
              weights: [0.40, 0.15, 0.12, 0.10, 0.13, 0.10],
            },
          },
        },
        {
          columnName: 'total_cents',
          matchPattern: ['total_cents', 'total', 'amount'],
          strategy: { kind: 'money', options: { min: 499, max: 99999 } },
        },
        {
          columnName: 'discount_cents',
          strategy: { kind: 'money', options: { min: 0, max: 50000 } },
        },
        {
          columnName: 'currency',
          strategy: {
            kind: 'enum',
            options: {
              values: ['USD', 'EUR', 'GBP'],
              weights: [0.65, 0.22, 0.13],
            },
          },
        },
        {
          columnName: 'ordered_at',
          matchPattern: ['ordered_at', 'order_date', 'placed_at'],
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
        {
          columnName: 'shipped_at',
          matchPattern: ['shipped_at', 'ship_date'],
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — null for pending/processing orders',
        },
        {
          columnName: 'delivered_at',
          matchPattern: ['delivered_at', 'delivery_date'],
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
          description: 'Nullable — null for non-delivered orders',
        },
      ],
    }],
    ['order_items', {
      tableName: 'order_items',
      matchPattern: ['order_items', 'line_items', 'cart_items', '*order_item*', '*line_item*'],
      rowCountMultiplier: 3.5,
      columnOverrides: [
        {
          columnName: 'quantity',
          strategy: { kind: 'integer', options: { min: 1, max: 5 } },
        },
        {
          columnName: 'unit_price_cents',
          matchPattern: ['unit_price_cents', 'unit_price', 'price_cents'],
          strategy: { kind: 'money', options: { min: 499, max: 29999 } },
        },
      ],
    }],
    ['reviews', {
      tableName: 'reviews',
      matchPattern: ['reviews', '*review*', 'ratings', '*rating*'],
      rowCountMultiplier: 2.0,
      columnOverrides: [
        {
          columnName: 'rating',
          strategy: {
            kind: 'enum',
            options: {
              values: [5, 4, 3, 2, 1],
              weights: [0.35, 0.30, 0.15, 0.10, 0.10],
            },
          },
        },
        {
          columnName: 'title',
          strategy: { kind: 'text', options: { mode: 'short' } },
        },
        {
          columnName: 'body',
          strategy: { kind: 'text', options: { mode: 'medium' } },
        },
        {
          columnName: 'verified_purchase',
          strategy: { kind: 'boolean', options: { trueWeight: 0.75 } },
        },
        {
          columnName: 'created_at',
          strategy: { kind: 'timestamp', options: { mode: 'past' } },
        },
      ],
    }],
  ]),
};
