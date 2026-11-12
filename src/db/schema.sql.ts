export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  employee_code text NOT NULL UNIQUE,
  department text NOT NULL,
  age integer,
  gender text,
  is_active boolean NOT NULL DEFAULT true,
  phone_number text,
  address text,
  pincode text,
  id_proof_type text,
  id_proof_number text,
  id_proof_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  date_of_joining timestamptz,
  bank_detail jsonb,
  photo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  allow_overlap boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  service_id uuid NOT NULL REFERENCES services(id),
  members jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS providers_service_id_idx ON providers(service_id);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  event_name text NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal double precision NOT NULL,
  discount_amount double precision NOT NULL DEFAULT 0,
  total double precision NOT NULL,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_range_idx ON bookings(start_at, end_at);

CREATE TABLE IF NOT EXISTS booking_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_audits_booking_id_idx ON booking_audits(booking_id);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  amount double precision NOT NULL,
  type text NOT NULL,
  frequency text,
  direction text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_start_date_idx ON payments(start_date);
CREATE INDEX IF NOT EXISTS payments_direction_idx ON payments(direction);
CREATE INDEX IF NOT EXISTS payments_type_idx ON payments(type);

CREATE TABLE IF NOT EXISTS booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id text,
  type text NOT NULL,
  amount double precision NOT NULL,
  mode text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_payments_booking_id_idx ON booking_payments(booking_id);

CREATE TABLE IF NOT EXISTS payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount double precision NOT NULL,
  date timestamptz NOT NULL,
  type text NOT NULL,
  mode text NOT NULL,
  notes text,
  actor jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_logs_payment_date_idx ON payment_logs(payment_id, date);
CREATE INDEX IF NOT EXISTS payment_logs_date_idx ON payment_logs(date);

CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity double precision NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'pieces',
  description text,
  min_threshold double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stocks_name_idx ON stocks(name);

CREATE TABLE IF NOT EXISTS stock_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id uuid NOT NULL,
  action text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_audits_stock_created_idx ON stock_audits(stock_id, created_at);

CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  contact_person_name text NOT NULL,
  contact_phone text NOT NULL,
  logo text,
  gstin text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_profiles_name_idx ON company_profiles(name);
`;
