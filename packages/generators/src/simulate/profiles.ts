import type { SimulationProfile } from './eventStream.js';
import { EVENT_CATALOG } from './eventStream.js';

const saasStartup: SimulationProfile = {
  name: 'saas-startup',
  description: 'SaaS startup simulation: signups, logins, page views, purchases, API calls with diurnal traffic',
  duration: '1-day',
  eventSources: [
    {
      source: 'app',
      weight: 3,
      types: EVENT_CATALOG,
    },
    {
      source: 'stripe',
      weight: 1,
      types: [
        { type: 'payment_intent.succeeded', weight: 40, payloadTemplate: { amount: 2999, currency: 'usd' } },
        { type: 'payment_intent.payment_failed', weight: 5, payloadTemplate: { amount: 2999, currency: 'usd' } },
        { type: 'customer.subscription.created', weight: 10, payloadTemplate: { plan: 'pro' } },
        { type: 'invoice.paid', weight: 15, payloadTemplate: { amount: 2999 } },
      ],
    },
  ],
  correlationRules: [
    {
      trigger: 'purchase.completed',
      sequence: ['payment_intent.succeeded', 'notification.email_sent', 'analytics.event_tracked'],
      delayMs: [100, 5000],
      probability: 0.9,
    },
    {
      trigger: 'user.signup',
      sequence: ['notification.email_sent', 'analytics.event_tracked'],
      delayMs: [50, 2000],
      probability: 0.95,
    },
  ],
  trafficPattern: 'diurnal',
};

const ecommercePeak: SimulationProfile = {
  name: 'ecommerce-peak',
  description: 'E-commerce peak sale event: high traffic spike with purchase surges and payment processing',
  duration: '1-day',
  eventSources: [
    {
      source: 'app',
      weight: 4,
      types: [
        { type: 'page.view', weight: 50, payloadTemplate: { path: '/products', duration_ms: 2500 } },
        { type: 'purchase.completed', weight: 20, payloadTemplate: { amount: 7999, currency: 'usd', items: 3 } },
        { type: 'user.login', weight: 15, payloadTemplate: { method: 'password', success: true } },
        { type: 'user.signup', weight: 8, payloadTemplate: { method: 'email', source: 'campaign' } },
        { type: 'error.occurred', weight: 7, payloadTemplate: { code: 'ERR_CAPACITY', severity: 'error' } },
      ],
    },
    {
      source: 'stripe',
      weight: 2,
      types: [
        { type: 'payment_intent.succeeded', weight: 35, payloadTemplate: { amount: 7999, currency: 'usd' } },
        { type: 'payment_intent.payment_failed', weight: 10, payloadTemplate: { amount: 7999, currency: 'usd' } },
        { type: 'charge.refunded', weight: 5, payloadTemplate: { amount: 3000 } },
      ],
    },
  ],
  correlationRules: [
    {
      trigger: 'purchase.completed',
      sequence: ['payment_intent.succeeded', 'notification.email_sent', 'notification.push_sent', 'analytics.event_tracked'],
      delayMs: [200, 10000],
      probability: 0.85,
    },
  ],
  trafficPattern: 'spike',
};

const apiService: SimulationProfile = {
  name: 'api-service',
  description: 'API microservice: HTTP request traffic with latency distribution and error rates',
  duration: '1-day',
  eventSources: [
    {
      source: 'api',
      weight: 5,
      types: [
        { type: 'api.call', weight: 60, payloadTemplate: { method: 'GET', path: '/api/v1/data', status: 200, latency_ms: 45 } },
        { type: 'api.call', weight: 20, payloadTemplate: { method: 'POST', path: '/api/v1/data', status: 201, latency_ms: 80 } },
        { type: 'api.call', weight: 10, payloadTemplate: { method: 'PUT', path: '/api/v1/data', status: 200, latency_ms: 60 } },
        { type: 'error.occurred', weight: 5, payloadTemplate: { code: 'ERR_TIMEOUT', severity: 'warning' } },
        { type: 'error.occurred', weight: 5, payloadTemplate: { code: 'ERR_500', severity: 'error' } },
      ],
    },
  ],
  correlationRules: [
    {
      trigger: 'error.occurred',
      sequence: ['notification.push_sent', 'analytics.event_tracked'],
      delayMs: [500, 5000],
      probability: 0.7,
    },
  ],
  trafficPattern: 'diurnal',
};

export const SIMULATION_PROFILES: SimulationProfile[] = [
  saasStartup,
  ecommercePeak,
  apiService,
];

export function getSimulationProfile(name: string): SimulationProfile | undefined {
  return SIMULATION_PROFILES.find((p) => p.name === name);
}
