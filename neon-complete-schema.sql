-- Complete Database Schema for Billing Portal
-- Generated from init-db.ts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS booking_items CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'billing_operator' CHECK (role IN ('admin', 'billing_operator')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create slabs table (referenced by other tables)
CREATE TABLE IF NOT EXISTS slabs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  min_value NUMERIC,
  max_value NUMERIC,
  slab_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create parties table
CREATE TABLE IF NOT EXISTS parties (
  id SERIAL PRIMARY KEY,
  party_name VARCHAR(255) NOT NULL,
  gstin VARCHAR(15),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  gst_type VARCHAR(20) DEFAULT 'unregistered' CHECK (gst_type IN ('unregistered','consumer','registered','composition','overseas')),
  weight_slab_id INTEGER REFERENCES slabs(id) ON DELETE SET NULL,
  distance_slab_id INTEGER REFERENCES slabs(id) ON DELETE SET NULL,
  volume_slab_id INTEGER REFERENCES slabs(id) ON DELETE SET NULL,
  cod_slab_id INTEGER REFERENCES slabs(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  tax_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  apply_slab BOOLEAN DEFAULT FALSE,
  slab_amount DECIMAL(12,2) DEFAULT 0,
  slab_breakdown JSONB,
  received_amount DECIMAL(12,2) DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  gst_invoice TEXT,
  prepaid_amount DECIMAL(12,2) DEFAULT 0,
  final_collected DECIMAL(12,2) DEFAULT 0,
  retail_price DECIMAL(12,2) DEFAULT 0,
  chargeable_weight NUMERIC,
  booking_ref TEXT
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  item_description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  booking_date DATE,
  shipment_type VARCHAR(20) CHECK (shipment_type IN ('DOCUMENT','NON_DOCUMENT')),
  mode_id INTEGER,
  service_type_id INTEGER,
  distance_slab_id INTEGER,
  weight_kg NUMERIC,
  consignment_no TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create csv_invoices table
CREATE TABLE IF NOT EXISTS csv_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_date DATE,
  consignment_no TEXT,
  booking_reference TEXT,
  origin TEXT,
  destination TEXT,
  consignee_name TEXT,
  consignee_address TEXT,
  consignee_phone TEXT,
  weight NUMERIC(10,2),
  cod_amount NUMERIC(12,2),
  freight_charge NUMERIC(12,2),
  fov_charge NUMERIC(12,2),
  odacharge NUMERIC(12,2),
  fuel_surcharge NUMERIC(12,2),
  statx_charge NUMERIC(12,2),
  mps_charge NUMERIC(12,2),
  to_pay_charge NUMERIC(12,2),
  total_charge NUMERIC(12,2),
  status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
);

-- Create party_rate_slabs table
CREATE TABLE IF NOT EXISTS party_rate_slabs (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  shipment_type VARCHAR(20) NOT NULL CHECK (shipment_type IN ('DOCUMENT', 'NON_DOCUMENT')),
  mode_id INTEGER NOT NULL,
  service_type_id INTEGER,
  distance_slab_id INTEGER NOT NULL,
  slab_id INTEGER NOT NULL,
  rate NUMERIC NOT NULL DEFAULT 0,
  packing NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure expected columns exist on pre-existing tables
ALTER TABLE csv_invoices
  ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_prs_combo ON party_rate_slabs(party_id, shipment_type, mode_id, service_type_id, distance_slab_id, slab_id);
CREATE INDEX IF NOT EXISTS idx_csv_invoices_invoice_id ON csv_invoices(invoice_id);
CREATE INDEX IF NOT EXISTS idx_csv_invoices_booking_reference ON csv_invoices(booking_reference) WHERE booking_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_csv_invoices_consignment_no ON csv_invoices(consignment_no) WHERE consignment_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_items_shipment_type ON invoice_items(shipment_type);
CREATE INDEX IF NOT EXISTS idx_invoice_items_mode_id ON invoice_items(mode_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_service_type_id ON invoice_items(service_type_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_distance_slab_id ON invoice_items(distance_slab_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_consignment_no ON invoice_items(consignment_no);

-- Create unique constraints
ALTER TABLE csv_invoices 
  ADD CONSTRAINT uq_csv_invoices_booking_reference 
  UNIQUE (booking_reference) 
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE csv_invoices 
  ADD CONSTRAINT uq_csv_invoices_consignment_no 
  UNIQUE (consignment_no) 
  DEFERRABLE INITIALLY DEFERRED;


-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure slabs table has columns expected by app/api/slabs/route.ts
ALTER TABLE public.slabs
  ADD COLUMN IF NOT EXISTS slabtype TEXT,
  ADD COLUMN IF NOT EXISTS slablabel TEXT,
  ADD COLUMN IF NOT EXISTS fromvalue NUMERIC,
  ADD COLUMN IF NOT EXISTS tovalue NUMERIC,
  ADD COLUMN IF NOT EXISTS unittype TEXT,
  ADD COLUMN IF NOT EXISTS rate NUMERIC,
  ADD COLUMN IF NOT EXISTS effectivedate TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS distancecategory TEXT;

-- Create triggers for updating timestamps
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('CREATE OR REPLACE TRIGGER set_timestamp
                   BEFORE UPDATE ON %I
                   FOR EACH ROW EXECUTE FUNCTION update_modified_column()', 
                  t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- Additional tables required by API endpoints (masters + company)
-- These align with app/api/slabs/* and companies endpoints
-- =============================================================

-- Shipment type enum used by party_rate_slabs
DO $$ BEGIN
  CREATE TYPE shipment_type AS ENUM ('DOCUMENT','NON_DOCUMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Companies master and active company mapping
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  business_name TEXT NOT NULL,
  phone_number TEXT,
  gstin TEXT,
  email_id TEXT,
  business_type TEXT,
  business_category TEXT,
  state TEXT,
  pincode TEXT,
  business_address TEXT,
  logo TEXT,
  signature TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS active_companies (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Masters used by /api/slabs/* endpoints
CREATE TABLE IF NOT EXISTS weight_slabs (
  id SERIAL PRIMARY KEY,
  slab_name TEXT NOT NULL,
  min_weight_grams INT NOT NULL,
  max_weight_grams INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_weight_range UNIQUE (min_weight_grams, max_weight_grams)
);

CREATE TABLE IF NOT EXISTS distance_slabs (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_types (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS modes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional masters referenced by setup
CREATE TABLE IF NOT EXISTS metro_cities (
  id SERIAL PRIMARY KEY,
  city TEXT NOT NULL UNIQUE,
  state TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS state_neighbors (
  state_code TEXT NOT NULL,
  neighbor_state_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(state_code, neighbor_state_code)
);

-- Audits endpoint storage
CREATE TABLE IF NOT EXISTS rate_audits (
  id SERIAL PRIMARY KEY,
  party_rate_slab_id INT NOT NULL REFERENCES party_rate_slabs(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  changed_by TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Re-apply timestamp triggers for any tables created after the first loop
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('CREATE OR REPLACE TRIGGER set_timestamp
                   BEFORE UPDATE ON %I
                   FOR EACH ROW EXECUTE FUNCTION update_modified_column()', 
                  t);
  END LOOP;
END;
$$ LANGUAGE plpgsql;
