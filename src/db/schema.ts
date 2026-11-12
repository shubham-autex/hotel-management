import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  AuditActor,
  AuditChange,
  BankDetail,
  BookingItem,
  ProviderMember,
  ServiceVariant,
} from "@/db/types";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  ...timestamps,
});

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  employeeCode: text("employee_code").notNull().unique(),
  department: text("department").notNull(),
  age: integer("age"),
  gender: text("gender"),
  isActive: boolean("is_active").notNull().default(true),
  phoneNumber: text("phone_number"),
  address: text("address"),
  pincode: text("pincode"),
  idProofType: text("id_proof_type"),
  idProofNumber: text("id_proof_number"),
  idProofPhotos: jsonb("id_proof_photos").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  dateOfJoining: timestamp("date_of_joining", { withTimezone: true }),
  bankDetail: jsonb("bank_detail").$type<BankDetail | null>(),
  photo: text("photo"),
  ...timestamps,
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  variants: jsonb("variants").$type<ServiceVariant[]>().notNull().default(sql`'[]'::jsonb`),
  isActive: boolean("is_active").notNull().default(true),
  allowOverlap: boolean("allow_overlap").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
});

export const providers = pgTable(
  "providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    members: jsonb("members").$type<ProviderMember[]>().notNull().default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("providers_service_id_idx").on(table.serviceId)]
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerName: text("customer_name").notNull(),
    customerPhone: text("customer_phone"),
    eventName: text("event_name").notNull(),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("pending"),
    items: jsonb("items").$type<BookingItem[]>().notNull().default(sql`'[]'::jsonb`),
    subtotal: doublePrecision("subtotal").notNull(),
    discountAmount: doublePrecision("discount_amount").notNull().default(0),
    total: doublePrecision("total").notNull(),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("bookings_range_idx").on(table.startAt, table.endAt)]
);

export const bookingAudits = pgTable(
  "booking_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    changes: jsonb("changes").$type<AuditChange[]>().notNull().default(sql`'[]'::jsonb`),
    actor: jsonb("actor").$type<AuditActor | null>(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("booking_audits_booking_id_idx").on(table.bookingId)]
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    amount: doublePrecision("amount").notNull(),
    type: text("type").notNull(),
    frequency: text("frequency"),
    direction: text("direction").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("payments_start_date_idx").on(table.startDate),
    index("payments_direction_idx").on(table.direction),
    index("payments_type_idx").on(table.type),
  ]
);

export const bookingPayments = pgTable(
  "booking_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    type: text("type").notNull(),
    amount: doublePrecision("amount").notNull(),
    mode: text("mode").notNull(),
    images: jsonb("images").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [index("booking_payments_booking_id_idx").on(table.bookingId)]
);

export const paymentLogs = pgTable(
  "payment_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    amount: doublePrecision("amount").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    type: text("type").notNull(),
    mode: text("mode").notNull(),
    notes: text("notes"),
    actor: jsonb("actor").$type<AuditActor | null>(),
    ...timestamps,
  },
  (table) => [
    index("payment_logs_payment_date_idx").on(table.paymentId, table.date),
    index("payment_logs_date_idx").on(table.date),
  ]
);

export const stocks = pgTable(
  "stocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    quantity: doublePrecision("quantity").notNull().default(0),
    unit: text("unit").notNull().default("pieces"),
    description: text("description"),
    minThreshold: doublePrecision("min_threshold"),
    ...timestamps,
  },
  (table) => [index("stocks_name_idx").on(table.name)]
);

export const stockAudits = pgTable(
  "stock_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stockId: uuid("stock_id").notNull(),
    action: text("action").notNull(),
    changes: jsonb("changes").$type<AuditChange[]>().notNull().default(sql`'[]'::jsonb`),
    actor: jsonb("actor").$type<AuditActor | null>(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("stock_audits_stock_created_idx").on(table.stockId, table.createdAt)]
);

export const companyProfiles = pgTable(
  "company_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    address: text("address").notNull(),
    contactPersonName: text("contact_person_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    logo: text("logo"),
    gstin: text("gstin"),
    ...timestamps,
  },
  (table) => [index("company_profiles_name_idx").on(table.name)]
);
