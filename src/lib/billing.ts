/**
 * Cross-Platform Billing Service
 * 
 * Supports Google Play Billing (Android) and Apple In-App Purchase (iOS).
 * All purchases go through native store billing.
 */

import { supabase } from '@/integrations/supabase/client';

export type Platform = 'android' | 'ios' | 'web';
export type Store = 'google_play' | 'app_store' | 'none';

export interface BillingProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  type: 'subscription' | 'inapp';
  subscriptionPeriod?: string;
  badge?: string;
  hidden?: boolean;
  perMonthPrice?: string;
}

export interface BoostPackage {
  productId: string;
  count: number;
  price: string;
  priceAmountMicros: number;
  unitPrice: string;
  premiumPrice: string;
  premiumPriceAmountMicros: number;
}

export interface PurchaseResult {
  success: boolean;
  purchaseToken?: string;
  receiptData?: string;
  productId?: string;
  error?: string;
}

// Premium Subscription Product IDs
export const PREMIUM_PRODUCT_IDS = {
  WEEKLY: 'cafemeet_premium_weekly',
  MONTHLY: 'cafemeet_premium_monthly',
  THREE_MONTH: 'cafemeet_premium_3month',
  YEARLY: 'cafemeet_premium_yearly',
} as const;

// Boost Product IDs
export const BOOST_PRODUCT_IDS = {
  BOOST_1: 'cafemeet_boost_1',
  BOOST_3: 'cafemeet_boost_3',
  BOOST_5: 'cafemeet_boost_5',
  BOOST_10: 'cafemeet_boost_10',
} as const;

// Premium subscription display products
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
    perMonthPrice: '₺129,99/ay',
  },
  {
    productId: PREMIUM_PRODUCT_IDS.THREE_MONTH,
    title: '3 Aylık',
    description: 'En avantajlı plan',
    price: '₺299,99',
    priceAmountMicros: 299990000,
    priceCurrencyCode: 'TRY',
    type: 'subscription',
    subscriptionPeriod: 'P3M',
    badge: 'En Popüler',
    perMonthPrice: '₺100,00/ay',
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
    hidden: true,
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

/**
 * Detect current platform
 */
export function detectPlatform(): Platform {
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return 'ios';
  if (/Android/i.test(navigator.userAgent)) return 'android';
  return 'web';
}

/**
 * Get store for current platform
 */
export function getStore(): Store {
  const platform = detectPlatform();
  if (platform === 'android') return 'google_play';
  if (platform === 'ios') return 'app_store';
  return 'none';
}

/**
 * Check if native billing is available
 */
export async function isBillingAvailable(): Promise<boolean> {
  const platform = detectPlatform();
  if (platform === 'web') return false;

  if (platform === 'android') {
    return typeof (window as any).Capacitor !== 'undefined' &&
      typeof (window as any).CapacitorGooglePlayBilling !== 'undefined';
  }

  if (platform === 'ios') {
    return typeof (window as any).Capacitor !== 'undefined' &&
      typeof (window as any).CapacitorAppleIAP !== 'undefined';
  }

  return false;
}

/**
 * Check if billing SDK is ready for purchases
 */
export async function isBillingReady(): Promise<boolean> {
  const available = await isBillingAvailable();
  if (!available) return false;

  try {
    return false; // Not ready until native SDK is integrated
  } catch (error) {
    console.error('Error checking billing status:', error);
    return false;
  }
}

/**
 * Get available subscription products
 */
export async function getProducts(): Promise<BillingProduct[]> {
  return PREMIUM_PRODUCTS.filter(p => !p.hidden);
}

/**
 * Initiate a purchase flow through native store billing
 */
export async function purchaseSubscription(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  const billingReady = await isBillingReady();
  const platform = detectPlatform();

  if (!billingReady) {
    const storeMsg = platform === 'ios'
      ? 'App Store satın alma henüz hazır değil. Uygulama güncellemesini bekleyin.'
      : 'Google Play Billing henüz hazır değil. Uygulama güncellemesini bekleyin.';
    return { success: false, error: storeMsg };
  }

  try {
    // Native purchase would happen here via Capacitor plugin
    return {
      success: false,
      error: platform === 'ios'
        ? 'App Store satın alma henüz hazır değil.'
        : 'Google Play Billing henüz hazır değil.',
    };
  } catch (error) {
    console.error('Purchase error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Satın alma başarısız oldu',
    };
  }
}

/**
 * Verify purchase with backend (cross-platform)
 */
export async function verifyPurchase(
  params: {
    purchaseToken?: string;
    receiptData?: string;
    productId: string;
    userId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const platform = detectPlatform();

  try {
    if (platform === 'android' && params.purchaseToken) {
      const { data, error } = await supabase.functions.invoke('verify-google-purchase', {
        body: {
          purchaseToken: params.purchaseToken,
          productId: params.productId,
          userId: params.userId,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: data?.verified === true };
    }

    if (platform === 'ios' && params.receiptData) {
      const { data, error } = await supabase.functions.invoke('verify-apple-purchase', {
        body: {
          receiptData: params.receiptData,
          productId: params.productId,
          userId: params.userId,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: data?.verified === true };
    }

    return { success: false, error: 'Geçersiz platform veya eksik veri' };
  } catch (error) {
    return { success: false, error: 'Sunucu doğrulaması başarısız' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    if (data && data.expires_at && new Date(data.expires_at) > new Date()) {
      return {
        success: true,
        productId: data.product_id || data.google_play_product_id || undefined,
      };
    }

    return { success: false, error: 'Aktif abonelik bulunamadı' };
  } catch (error) {
    return { success: false, error: 'Geri yükleme başarısız oldu' };
  }
}

/**
 * Get store management URL for cancellation / subscription management
 */
export function getStoreManagementUrl(): string {
  const platform = detectPlatform();
  if (platform === 'ios') {
    return 'https://apps.apple.com/account/subscriptions';
  }
  return 'https://play.google.com/store/account/subscriptions';
}

/**
 * Get store name for display
 */
export function getStoreName(): string {
  const platform = detectPlatform();
  if (platform === 'ios') return 'App Store';
  return 'Google Play';
}

/**
 * Cancel subscription - redirects to store
 */
export async function cancelSubscription(): Promise<boolean> {
  window.open(getStoreManagementUrl(), '_blank');
  return true;
}
