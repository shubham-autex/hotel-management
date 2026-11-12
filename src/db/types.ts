import type { Department, IdProofType } from "@/lib/constants/employee";
import type { PriceType } from "@/lib/constants/service";

export type UserRole = "admin" | "manager";

export type AuditActor = {
  id: string;
  email: string;
  role?: string;
};

export type AuditChange = {
  key: string;
  oldValue: unknown;
  newValue: unknown;
};

export type BankDetail = {
  name?: string;
  ifscCode?: string;
  accountNumber?: string;
  passbookPhoto?: string;
};

export type PricingElement = {
  type: PriceType;
  price?: number;
};

export type ServiceVariant = {
  name: string;
  pricingElements: PricingElement[];
};

export type ProviderMember = {
  name: string;
  phoneNumber?: string;
  isHead?: boolean;
};

export type BookingItemPriceType = "per_unit" | "fixed" | "custom" | "per_hour";

export type BookingItem = {
  serviceId: string;
  serviceName: string;
  allowOverlap: boolean;
  variantName?: string;
  priceType: BookingItemPriceType;
  unitPrice?: number;
  units?: number;
  customPrice?: number;
  discountAmount?: number;
  total: number;
};

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type PaymentType = "one_time" | "recurring";
export type PaymentFrequency = "monthly" | "quarterly" | "half_yearly" | "yearly";
export type PaymentDirection = "received" | "sent";
export type PaymentLogType = "received" | "sent";
export type PaymentMode = "cash" | "card" | "bank_transfer" | "upi" | "cheque" | "other";
export type BookingPaymentType = "received" | "refund";
export type BookingPaymentMode = "cash" | "online";

export type Gender = "Male" | "Female" | "Other";

export type EmployeeInput = {
  name: string;
  employeeCode: string;
  department: Department;
  age?: number | null;
  gender?: Gender | null;
  isActive?: boolean;
  phoneNumber?: string | null;
  address?: string | null;
  pincode?: string | null;
  idProofType?: IdProofType | null;
  idProofNumber?: string | null;
  idProofPhotos?: string[];
  dateOfJoining?: Date | null;
  bankDetail?: BankDetail | null;
  photo?: string | null;
};
