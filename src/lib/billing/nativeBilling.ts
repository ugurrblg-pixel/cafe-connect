/**
 * Native billing service using cordova-plugin-purchase (CdvPurchase)
 * Handles real Google Play Billing and Apple StoreKit purchases.
 */
import { supabase } from '@/integrations/supabase/client';
import type { BillingProduct, PurchaseResult, VerifyResult, Platform, Store } from './types';
import { ALL_SUBSCRIPTION_IDS, ALL_BOOST_IDS, PREMIUM_PRODUCTS, BOOST_PACKAGES } from './products';

// CdvPurchase types (from cordova-plugin-purchase)
declare global {
  interface Window {
    CdvPurchase?: typeof CdvPurchase;
  }
}

declare namespace CdvPurchase {
  enum Platform {
    GOOGLE_PLAY = 'google-play',
    APPLE_APPSTORE = 'apple-appstore',
  }
  enum ProductType {
    PAID_SUBSCRIPTION = 'paid subscription',
    CONSUMABLE = 'consumable',
  }
  interface Product {
    id: string;
    title: string;
    description: string;
    pricing?: { price: string; priceMicros: number; currency: string };
    offers: Offer[];
    canPurchase: boolean;
    owned: boolean;
  }
  interface Offer {
    id: string;
    pricingPhases: PricingPhase[];
  }
  interface PricingPhase {
    price: string;
    priceMicros: number;
    currency: string;
    billingPeriod?: string;
  }
  interface Transaction {
    transactionId: string;
    purchaseToken?: string;
    appStoreReceipt?: string;
    products: { id: string }[];
    state: string;
  }
  interface IError {
    code: number;
    message: string;
  }
  interface Store {
    register(products: Array<{ id: string; type: string; platform: string }>): void;
    initialize(platforms?: string[]): Promise<IError | undefined>;
    get(productId: string): Product | undefined;
    order(offer: Offer): Promise<IError | undefined>;
    restorePurchases(): Promise<void>;
    when: {
      approved(cb: (transaction: Transaction) => void): { verified(cb: (receipt: any) => void): any };
      finished(cb: (transaction: Transaction) => void): any;
      updated(cb: (product: Product) => void): any;
    };
    ready(cb: () => void): void;
    products: Product[];
    verify(transaction: Transaction): void;
    finish(transaction: Transaction): void;
  }
  const store: Store;
}

let storeInitialized = false;
let storeReady = false;
let initPromise: Promise<boolean> | null = null;

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
 * Get native CdvPurchase store instance
 */
function getNativeStore(): typeof CdvPurchase.store | null {
  return window.CdvPurchase?.store ?? null;
}

/**
 * Get native platform constant
 */
function getNativePlatform(): string | null {
  const CdvP = window.CdvPurchase;
  if (!CdvP) return null;
  const platform = detectPlatform();
  if (platform === 'android') return CdvP.Platform.GOOGLE_PLAY;
  if (platform === 'ios') return CdvP.Platform.APPLE_APPSTORE;
  return null;
}

/**
 * Initialize the native billing SDK
 */
export async function initializeBilling(): Promise<boolean> {
  if (storeReady) return true;
  if (initPromise) return initPromise;

  initPromise = _doInit();
  return initPromise;
}

async function _doInit(): Promise<boolean> {
  const store = getNativeStore();
  const nativePlatform = getNativePlatform();

  if (!store || !nativePlatform) {
    console.warn('[Billing] Native store not available');
    return false;
  }

  if (storeInitialized) return storeReady;
  storeInitialized = true;

  const CdvP = window.CdvPurchase!;

  // Register subscription products
  ALL_SUBSCRIPTION_IDS.forEach(id => {
    store.register([{
      id,
      type: CdvP.ProductType.PAID_SUBSCRIPTION,
      platform: nativePlatform,
    }]);
  });

  // Register consumable (boost) products
  ALL_BOOST_IDS.forEach(id => {
    store.register([{
      id,
      type: CdvP.ProductType.CONSUMABLE,
      platform: nativePlatform,
    }]);
  });

  // Set up event handlers
  store.when
    .approved((transaction) => {
      console.log('[Billing] Transaction approved:', transaction.transactionId);
      // Server-side verification will be called explicitly
      // Auto-finish after verification
    })
    .verified((receipt) => {
      console.log('[Billing] Receipt verified locally');
    });

  store.when.finished((transaction) => {
    console.log('[Billing] Transaction finished:', transaction.transactionId);
  });

  // Initialize store
  const error = await store.initialize([nativePlatform]);
  if (error) {
    console.error('[Billing] Store initialization failed:', error.message);
    storeReady = false;
    return false;
  }

  storeReady = true;
  console.log('[Billing] Store initialized successfully');
  return true;
}

/**
 * Check if native billing is available and ready
 */
export async function isBillingAvailable(): Promise<boolean> {
  const platform = detectPlatform();
  if (platform === 'web') return false;
  return getNativeStore() !== null;
}

export async function isBillingReady(): Promise<boolean> {
  if (storeReady) return true;
  return initializeBilling();
}

/**
 * Get available subscription products with native store pricing
 */
export async function getProducts(): Promise<BillingProduct[]> {
  const store = getNativeStore();
  if (!store || !storeReady) {
    // Return fallback products when native store isn't available
    return PREMIUM_PRODUCTS;
  }

  const products: BillingProduct[] = [];
  
  for (const fallback of PREMIUM_PRODUCTS) {
    const nativeProduct = store.get(fallback.productId);
    if (nativeProduct && nativeProduct.offers.length > 0) {
      const offer = nativeProduct.offers[0];
      const phase = offer.pricingPhases[0];
      products.push({
        ...fallback,
        title: nativeProduct.title || fallback.title,
        description: nativeProduct.description || fallback.description,
        price: phase?.price || fallback.price,
        priceAmountMicros: phase?.priceMicros || fallback.priceAmountMicros,
        priceCurrencyCode: phase?.currency || fallback.priceCurrencyCode,
      });
    } else {
      products.push(fallback);
    }
  }

  return products;
}

/**
 * Purchase a subscription via native store
 */
export async function purchaseSubscription(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  const store = getNativeStore();
  if (!store || !storeReady) {
    return { success: false, error: 'Mağaza bağlantısı kurulamadı. Uygulama güncelleniyor olabilir.' };
  }

  const product = store.get(productId);
  if (!product || product.offers.length === 0) {
    return { success: false, error: 'Ürün bulunamadı. Lütfen tekrar deneyin.' };
  }

  return new Promise<PurchaseResult>((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: 'Satın alma zaman aşımına uğradı.' });
      }
    }, 120000); // 2 min timeout

    // Listen for approved transaction
    const onApproved = async (transaction: CdvPurchase.Transaction) => {
      const txProductIds = transaction.products.map(p => p.id);
      if (!txProductIds.includes(productId)) return;

      console.log('[Billing] Purchase approved, verifying with backend...');

      // Verify with our backend
      const verifyResult = await verifyWithBackend(transaction, productId, userId);
      
      if (verifyResult.success) {
        // Acknowledge/finish the transaction
        store.finish(transaction);
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({
            success: true,
            purchaseToken: transaction.purchaseToken,
            receiptData: transaction.appStoreReceipt,
            productId,
            transactionId: transaction.transactionId,
          });
        }
      } else {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: verifyResult.error || 'Doğrulama başarısız.' });
        }
      }
    };

    store.when.approved(onApproved);

    // Trigger purchase
    const offer = product.offers[0];
    store.order(offer).then((error) => {
      if (error) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: error.message || 'Satın alma iptal edildi.' });
        }
      }
    });
  });
}

/**
 * Purchase a boost package (consumable)
 */
export async function purchaseBoost(
  productId: string,
  userId: string
): Promise<PurchaseResult> {
  const store = getNativeStore();
  if (!store || !storeReady) {
    return { success: false, error: 'Mağaza bağlantısı kurulamadı.' };
  }

  const product = store.get(productId);
  if (!product || product.offers.length === 0) {
    return { success: false, error: 'Ürün bulunamadı.' };
  }

  return new Promise<PurchaseResult>((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: 'Satın alma zaman aşımına uğradı.' });
      }
    }, 120000);

    const onApproved = async (transaction: CdvPurchase.Transaction) => {
      const txProductIds = transaction.products.map(p => p.id);
      if (!txProductIds.includes(productId)) return;

      // Verify boost purchase with backend
      const verifyResult = await verifyBoostWithBackend(transaction, productId, userId);

      if (verifyResult.success) {
        store.finish(transaction);
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ success: true, productId, transactionId: transaction.transactionId });
        }
      } else {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: verifyResult.error || 'Boost doğrulaması başarısız.' });
        }
      }
    };

    store.when.approved(onApproved);

    const offer = product.offers[0];
    store.order(offer).then((error) => {
      if (error) {
        clearTimeout(timeout);
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: error.message || 'Satın alma iptal edildi.' });
        }
      }
    });
  });
}

/**
 * Verify subscription purchase with our backend
 */
async function verifyWithBackend(
  transaction: CdvPurchase.Transaction,
  productId: string,
  userId: string
): Promise<VerifyResult> {
  const platform = detectPlatform();

  try {
    if (platform === 'android' && transaction.purchaseToken) {
      const { data, error } = await supabase.functions.invoke('verify-google-purchase', {
        body: {
          purchaseToken: transaction.purchaseToken,
          productId,
          userId,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: data?.verified === true, expiresAt: data?.expiresAt, autoRenewing: data?.autoRenewing };
    }

    if (platform === 'ios' && transaction.appStoreReceipt) {
      const { data, error } = await supabase.functions.invoke('verify-apple-purchase', {
        body: {
          receiptData: transaction.appStoreReceipt,
          productId,
          userId,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: data?.verified === true, expiresAt: data?.expiresAt, autoRenewing: data?.autoRenewing };
    }

    return { success: false, error: 'Geçersiz platform veya eksik veri' };
  } catch (error) {
    console.error('[Billing] Verification error:', error);
    return { success: false, error: 'Sunucu doğrulaması başarısız' };
  }
}

/**
 * Verify boost purchase with our backend
 */
async function verifyBoostWithBackend(
  transaction: CdvPurchase.Transaction,
  productId: string,
  userId: string
): Promise<VerifyResult> {
  const platform = detectPlatform();

  try {
    const functionName = platform === 'ios' ? 'verify-apple-purchase' : 'verify-google-purchase';
    const body: Record<string, string> = { productId, userId, purchaseType: 'boost' };

    if (platform === 'android' && transaction.purchaseToken) {
      body.purchaseToken = transaction.purchaseToken;
    } else if (platform === 'ios' && transaction.appStoreReceipt) {
      body.receiptData = transaction.appStoreReceipt;
    } else {
      return { success: false, error: 'Eksik satın alma verisi' };
    }

    const { data, error } = await supabase.functions.invoke(functionName, { body });
    if (error) return { success: false, error: error.message };
    return { success: data?.verified === true };
  } catch (error) {
    console.error('[Billing] Boost verification error:', error);
    return { success: false, error: 'Boost doğrulaması başarısız' };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(userId: string): Promise<PurchaseResult> {
  const store = getNativeStore();
  
  if (store && storeReady) {
    try {
      await store.restorePurchases();
      
      // Check if any owned subscriptions exist after restore
      for (const id of ALL_SUBSCRIPTION_IDS) {
        const product = store.get(id);
        if (product?.owned) {
          return { success: true, productId: id };
        }
      }
    } catch (error) {
      console.error('[Billing] Restore error:', error);
    }
  }

  // Also check DB as fallback
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;

    if (data && data.expires_at && new Date(data.expires_at) > new Date()) {
      return { success: true, productId: data.product_id || data.google_play_product_id || undefined };
    }
  } catch (error) {
    console.error('[Billing] DB restore check error:', error);
  }

  return { success: false, error: 'Aktif abonelik bulunamadı' };
}

/**
 * Check subscription status on app launch
 */
export async function checkSubscriptionStatus(userId: string): Promise<void> {
  const store = getNativeStore();
  if (!store || !storeReady) return;

  // CdvPurchase automatically updates owned status on init
  // We just need to verify with backend if there's an owned subscription
  for (const id of ALL_SUBSCRIPTION_IDS) {
    const product = store.get(id);
    if (product?.owned) {
      console.log('[Billing] Found owned subscription:', id);
      // The subscription should already be verified in the DB
      return;
    }
  }
}

/**
 * Store management URLs
 */
export function getStoreManagementUrl(): string {
  const platform = detectPlatform();
  if (platform === 'ios') return 'https://apps.apple.com/account/subscriptions';
  return 'https://play.google.com/store/account/subscriptions';
}

export function getStoreName(): string {
  const platform = detectPlatform();
  if (platform === 'ios') return 'App Store';
  return 'Google Play';
}

export async function cancelSubscription(): Promise<boolean> {
  window.open(getStoreManagementUrl(), '_blank');
  return true;
}
