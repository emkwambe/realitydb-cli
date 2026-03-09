import type { DomainTemplate } from '../types.js';

export const ecommerceTemplate: DomainTemplate = {
  name: 'ecommerce',
  version: '1.0',
  description: 'E-commerce store with products, orders, and customers',
  targetTables: ['customers', 'products', 'orders', 'order_items'],
  tableConfigs: new Map([
    ['customers', {
      tableName: 'customers',
      matchPattern: ['customers', 'users', '*customer*', '*user*'],
      columnOverrides: [
        { columnName: 'email', strategy: { kind: 'email' } },
        { columnName: 'first_name', strategy: { kind: 'first_name' } },
        { columnName: 'last_name', strategy: { kind: 'last_name' } },
        { columnName: 'phone', strategy: { kind: 'phone' } },
      ],
    }],
    ['products', {
      tableName: 'products',
      matchPattern: ['products', 'items', 'catalog', '*product*', '*item*', '*catalog*'],
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
          columnName: 'in_stock',
          strategy: { kind: 'boolean', options: { trueWeight: 0.85 } },
        },
      ],
    }],
    ['orders', {
      tableName: 'orders',
      matchPattern: ['orders', 'purchases', '*order*', '*purchase*'],
      columnOverrides: [
        {
          columnName: 'status',
          strategy: {
            kind: 'enum',
            options: {
              values: ['delivered', 'shipped', 'processing', 'pending', 'canceled', 'returned'],
              weights: [0.45, 0.15, 0.12, 0.10, 0.10, 0.08],
            },
          },
        },
        {
          columnName: 'total_cents',
          matchPattern: ['total_cents', 'total', 'amount'],
          strategy: { kind: 'money', options: { min: 499, max: 99999 } },
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
      ],
    }],
    ['order_items', {
      tableName: 'order_items',
      matchPattern: ['order_items', 'line_items', 'cart_items', '*order_item*', '*line_item*'],
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
  ]),
};
