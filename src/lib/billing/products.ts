/**
 * Product definitions for CafeMeet IAP
 */
import type { BillingProduct, BoostPackage } from './types';

// Premium Subscription Product IDs
export const PREMIUM_PRODUCT_IDS = {
  WEEKLY: 'cafemeet_premium_weekly',
  MONTHLY: 'cafemeet_premium_monthly',
  YEARLY: 'cafemeet_premium_yearly',
} as const;

// Boost Product IDs
export const BOOST_PRODUCT_IDS = {
  BOOST_1: 'cafemeet_boost_1',
  BOOST_3: 'cafemeet_boost_3',
  BOOST_5: 'cafemeet_boost_5',
  BOOST_10: 'cafemeet_boost_10',
} as const;

// All subscription product IDs
export const ALL_SUBSCRIPTION_IDS = [
  PREMIUM_PRODUCT_IDS.WEEKLY,
  PREMIUM_PRODUCT_IDS.MONTHLY,
  PREMIUM_PRODUCT_IDS.YEARLY,
];

// All boost product IDs (consumable)
export const ALL_BOOST_IDS = [
  BOOST_PRODUCT_IDS.BOOST_1,
  BOOST_PRODUCT_IDS.BOOST_3,
  BOOST_PRODUCT_IDS.BOOST_5,
  BOOST_PRODUCT_IDS.BOOST_10,
];

// Fallback display products (used when native store prices can't be fetched)
export const PREMIUM_PRODUCTS: BillingProduct[] = [
  {
    productId: PREMIUM_PRODUCT_IDS.WEEKLY,
    title: 'Haftalık',
    description: 'Hemen dene, istediğin zaman iptal et',
    price: '₺89,99',
    priceAmountMicros: 89990000,
    priceCurrencyCode: 'TRY',
    type: 'subscription',
    subscriptionPeriod: 'P1W',
    perMonthPrice: '₺359,96/ay',
  },
  {
    productId: PREMIUM_PRODUCT_IDS.MONTHLY,
    title: 'Aylık',
    description: 'En çok tercih edilen başlangıç planı',
    price: '₺129,99',
    priceAmountMicros: 129990000,
    priceCurrencyCode: 'TRY',
    type: 'subscription',
    subscriptionPeriod: 'P1M',
    badge: 'En Popüler',
    perMonthPrice: '₺129,99/ay',
  },
  {
    productId: PREMIUM_PRODUCT_IDS.YEARLY,
    title: 'Yıllık',
    description: 'Maksimum tasarruf',
    price: '₺799,99',
    priceAmountMicros: 799990000,
    priceCurrencyCode: 'TRY',
    type: 'subscription',
    subscriptionPeriod: 'P1Y',
    perMonthPrice: '₺66,67/ay',
  },
];

// Boost packages
export const BOOST_PACKAGES: BoostPackage[] = [
  {
    productId: BOOST_PRODUCT_IDS.BOOST_1,
    count: 1,
    price: '₺39,99',
    priceAmountMicros: 39990000,
    unitPrice: '₺39,99',
    premiumPrice: '₺31,99',
    premiumPriceAmountMicros: 31990000,
  },
  {
    productId: BOOST_PRODUCT_IDS.BOOST_3,
    count: 3,
    price: '₺99,99',
    priceAmountMicros: 99990000,
    unitPrice: '₺33,33',
    premiumPrice: '₺79,99',
    premiumPriceAmountMicros: 79990000,
  },
  {
    productId: BOOST_PRODUCT_IDS.BOOST_5,
    count: 5,
    price: '₺149,99',
    priceAmountMicros: 149990000,
    unitPrice: '₺30,00',
    premiumPrice: '₺119,99',
    premiumPriceAmountMicros: 119990000,
  },
  {
    productId: BOOST_PRODUCT_IDS.BOOST_10,
    count: 10,
    price: '₺249,99',
    priceAmountMicros: 249990000,
    unitPrice: '₺25,00',
    premiumPrice: '₺199,99',
    premiumPriceAmountMicros: 199990000,
  },
];

// Premium boost duration bonus in minutes
export const PREMIUM_BOOST_BONUS_MINUTES = 10;
