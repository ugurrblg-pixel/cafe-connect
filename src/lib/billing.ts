/**
 * Google Play Billing Service
 * 
 * This module provides the interface for Google Play Billing integration.
 * All purchases MUST go through Google Play Billing.
 */

import { supabase } from '@/integrations/supabase/client';

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
 * Check if Google Play Billing is available
 */
export async function isBillingAvailable(): Promise<boolean> {
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) return false;
  
  const hasNativeBilling = typeof (window as any).Capacitor !== 'undefined' && 
    typeof (window as any).CapacitorGooglePlayBilling !== 'undefined';
  
  return hasNativeBilling;
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
 * Initiate a purchase flow through Google Play Billing
 */
export async function purchaseSubscription(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  const billingReady = await isBillingReady();
  
  if (!billingReady) {
    return {
      success: false,
      error: 'Google Play Billing henüz hazır değil. Uygulama güncellemesini bekleyin.',
    };
  }
  
  try {
    return {
      success: false,
      error: 'Google Play Billing henüz hazır değil. Uygulama güncellemesini bekleyin.',
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
 * Verify purchase token with backend
 */
async function verifyPurchaseOnBackend(
  purchaseToken: string,
  productId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-google-purchase', {
      body: { purchaseToken, productId, userId },
    });
    
    if (error) return { success: false, error: error.message };
    return { success: data?.verified === true };
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
        productId: data.google_play_product_id || undefined,
      };
    }

    return { success: false, error: 'Aktif abonelik bulunamadı' };
  } catch (error) {
    return { success: false, error: 'Geri yükleme başarısız oldu' };
  }
}

/**
 * Cancel subscription - redirects to Google Play
 */
export async function cancelSubscription(userId: string): Promise<boolean> {
  window.open('https://play.google.com/store/account/subscriptions', '_blank');
  return true;
}
