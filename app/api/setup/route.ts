import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// One-click initializer for Setup & Configuration masters per FRS
export async function POST() {
  try {
    const q: string[] = []

    // Regions & Centers
    q.push(`CREATE TABLE IF NOT EXISTS regions (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`)

    q.push(`CREATE TABLE IF NOT EXISTS region_states (
      region_id INT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
      state_code TEXT NOT NULL,
      PRIMARY KEY(region_id, state_code)
    );`)

    q.push(`CREATE TABLE IF NOT EXISTS centers (
      id SERIAL PRIMARY KEY,
      state TEXT,
      city TEXT NOT NULL,
      region_id INT REFERENCES regions(id) ON DELETE SET NULL,
      booking_count INT NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`)

    // Carriers
    q.push(`CREATE TABLE IF NOT EXISTS carriers (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`)

    // Operators (link to users)
    q.push(`CREATE TABLE IF NOT EXISTS operators (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      booking_rights JSONB,
      bill_item_preferences JSONB,
      bill_template TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`)

    // SMS Formats
    q.push(`CREATE TABLE IF NOT EXISTS sms_formats (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      template TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`)

    // Default quotations by region and weight slab
    q.push(`CREATE TABLE IF NOT EXISTS quotation_defaults (
      id SERIAL PRIMARY KEY,
      region_id INT REFERENCES regions(id) ON DELETE CASCADE,
      package_type TEXT NOT NULL CHECK (package_type IN ('DOCUMENT','NON_DOCUMENT')),
      slab_id INT REFERENCES weight_slabs(id) ON DELETE CASCADE,
      base_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
      extra_per_1000g NUMERIC(12,2) DEFAULT 0,
      notes TEXT,
      UNIQUE(region_id, package_type, slab_id)
    );`)

    // Quotation email notes/templates
    q.push(`CREATE TABLE IF NOT EXISTS quotation_notes (
      id SERIAL PRIMARY KEY,
      title TEXT UNIQUE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );`)

    // Helpful update trigger
    q.push(`CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;$$ LANGUAGE plpgsql;`)

    q.push(`DO $$ BEGIN
      CREATE TRIGGER trg_centers_updated BEFORE UPDATE ON centers
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`)

    // Seed a few regions and carrier rows if empty
    q.push(`INSERT INTO regions(code, name) VALUES
      ('MUM','Mumbai'), ('ROI','Rest of India'), ('METRO','Metro'), ('GJ','Gujarat'), ('MP','Madhya Pradesh'), ('NE','North East')
      ON CONFLICT (code) DO NOTHING;`)

    q.push(`INSERT INTO carriers(name) VALUES
      ('Professional Courier'), ('DTDC'), ('Blue Dart')
      ON CONFLICT (name) DO NOTHING;`)

    for (const s of q) {
      // eslint-disable-next-line no-await-in-loop
      await db.query(s)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Setup init failed', e)
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
