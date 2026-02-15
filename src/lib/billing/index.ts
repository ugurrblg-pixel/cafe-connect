/**
 * Cross-Platform Billing Service
 * 
 * Supports Google Play Billing (Android) and Apple In-App Purchase (iOS).
 * Uses cordova-plugin-purchase (CdvPurchase) for native store integration.
 */

// Re-export everything from modules
export type { BillingProduct, BoostPackage, PurchaseResult, VerifyResult, Platform, Store } from './types';
export {
  PREMIUM_PRODUCT_IDS,
  BOOST_PRODUCT_IDS,
  ALL_SUBSCRIPTION_IDS,
  ALL_BOOST_IDS,
  PREMIUM_PRODUCTS,
  BOOST_PACKAGES,
  PREMIUM_BOOST_BONUS_MINUTES,
} from './products';
export {
  detectPlatform,
  getStore,
  initializeBilling,
  isBillingAvailable,
  isBillingReady,
  getProducts,
  purchaseSubscription,
  purchaseBoost,
  restorePurchases,
  checkSubscriptionStatus,
  getStoreManagementUrl,
  getStoreName,
  cancelSubscription,
} from './nativeBilling';
