/**
 * Billing types for cross-platform native IAP
 */

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
  transactionId?: string;
  error?: string;
}

export interface VerifyResult {
  success: boolean;
  error?: string;
  expiresAt?: string;
  autoRenewing?: boolean;
}
