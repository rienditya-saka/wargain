export type SubscriptionStatus =
  | "PENDING_PAYMENT"
  | "WAITING_VERIFICATION"
  | "ACTIVE"
  | "EXPIRED";

export type UserRole =
  | "TENANT_ADMIN"
  | "KETUA"
  | "SEKRETARIS"
  | "BENDAHARA"
  | "HUMAS"
  | "ANGGOTA";

export type SubscriptionTierCode = "RT_STANDARD" | "RW_PRO" | "ENTERPRISE";

export interface Community {
  id: string;
  name: string;
  slug: string;
  code: string;
  type: "government" | "community";
  country: string;
  province: string;
  regency: string;
  district: string;
  urban: string;
  neighborhood: string;
  address: string;
  lat: string;
  long: string;
  logo?: string;
  planTier: SubscriptionTierCode;
  planStatus: SubscriptionStatus;
  isActive: boolean;
  planExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  communityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  communityId: string;
  tier: SubscriptionTierCode;
  amount: number;
  periodMonths: number;
  status: SubscriptionStatus;
  paymentMethod?: string;
  paymentProofUrl?: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface SessionTenant {
  userId: string;
  email: string;
  fullName: string;
  communityId: string;
  communityName: string;
  communitySlug: string;
  role: UserRole;
  isTenantActive: boolean;
  planTier: SubscriptionTierCode;
  planStatus: SubscriptionStatus;
  supabaseToken?: string;
}

