import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const sql: string[] = []

    sql.push(`DO $$ BEGIN
      CREATE TYPE shipment_type AS ENUM ('DOCUMENT','NON_DOCUMENT');
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    sql.push(`CREATE TABLE IF NOT EXISTS weight_slabs (
      id SERIAL PRIMARY KEY,
      slab_name TEXT NOT NULL,
      min_weight_grams INT NOT NULL,
      max_weight_grams INT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_weight_range UNIQUE (min_weight_grams, max_weight_grams)
    );`)

    sql.push(`CREATE TABLE IF NOT EXISTS distance_slabs (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`)

    sql.push(`CREATE TABLE IF NOT EXISTS service_types (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`)

    sql.push(`CREATE TABLE IF NOT EXISTS modes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`)

    // Distance Master: Metro Cities and Neighboring States
    sql.push(`CREATE TABLE IF NOT EXISTS metro_cities (
      id SERIAL PRIMARY KEY,
      city TEXT NOT NULL UNIQUE,
      state TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`)

    sql.push(`CREATE TABLE IF NOT EXISTS state_neighbors (
      state_code TEXT NOT NULL,
      neighbor_state_code TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(state_code, neighbor_state_code)
    );`)

    sql.push(`CREATE TABLE IF NOT EXISTS party_rate_slabs (
      id SERIAL PRIMARY KEY,
      party_id INT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
      shipment_type shipment_type NOT NULL,
      mode_id INT NOT NULL REFERENCES modes(id),
      service_type_id INT NOT NULL REFERENCES service_types(id),
      distance_slab_id INT NOT NULL REFERENCES distance_slabs(id),
      slab_id INT NOT NULL REFERENCES weight_slabs(id),
      rate NUMERIC(12,2) NOT NULL,
      fuel_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
      handling NUMERIC(12,2) NOT NULL DEFAULT 0,
      gst_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT uq_party_rate UNIQUE (party_id, shipment_type, mode_id, service_type_id, distance_slab_id, slab_id)
    );`)

    sql.push(`CREATE TABLE IF NOT EXISTS rate_audits (
      id SERIAL PRIMARY KEY,
      party_rate_slab_id INT NOT NULL REFERENCES party_rate_slabs(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      before_data JSONB,
      after_data JSONB,
      changed_by TEXT,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`)

    // Triggers for updated_at
    sql.push(`CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`)

    sql.push(`DO $$ BEGIN
      CREATE TRIGGER trg_weight_slabs_updated
      BEFORE UPDATE ON weight_slabs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    sql.push(`DO $$ BEGIN
      CREATE TRIGGER trg_distance_slabs_updated
      BEFORE UPDATE ON distance_slabs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    sql.push(`DO $$ BEGIN
      CREATE TRIGGER trg_service_types_updated
      BEFORE UPDATE ON service_types
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    sql.push(`DO $$ BEGIN
      CREATE TRIGGER trg_modes_updated
      BEFORE UPDATE ON modes
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    sql.push(`DO $$ BEGIN
      CREATE TRIGGER trg_metro_cities_updated
      BEFORE UPDATE ON metro_cities
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    sql.push(`DO $$ BEGIN
      CREATE TRIGGER trg_party_rate_slabs_updated
      BEFORE UPDATE ON party_rate_slabs
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN null; END $$;`)

    // Seed masters
    sql.push(`INSERT INTO modes(code, title) VALUES
      ('AIR','Air'),('SURFACE','Surface')
      ON CONFLICT (code) DO NOTHING;`)

    sql.push(`INSERT INTO service_types(code, title) VALUES
      ('EXPRESS','Express'),('STANDARD','Standard'),('PREMIUM','Premium')
      ON CONFLICT (code) DO NOTHING;`)

    sql.push(`INSERT INTO distance_slabs(code, title) VALUES
      ('METRO_CITIES','Metro Cities'),('WITHIN_STATE','Within State'),('OUT_OF_STATE','Out of State'),('OTHER_STATE','Other State')
      ON CONFLICT (code) DO NOTHING;`)

    // Seed metro cities (8 metros)
    sql.push(`INSERT INTO metro_cities(city, state) VALUES
      ('Mumbai','MH'),
      ('Delhi','DL'),
      ('Pune','MH'),
      ('Bengaluru','KA'),
      ('Chennai','TN'),
      ('Kolkata','WB'),
      ('Hyderabad','TS'),
      ('Ahmedabad','GJ')
      ON CONFLICT (city) DO NOTHING;`)

    // Optional: starter neighbors (minimal; editable via UI later)
    // Example pairs (bidirectional should be inserted explicitly by admin later as needed)
    // This keeps seed light-weight.

    sql.push(`INSERT INTO weight_slabs(slab_name, min_weight_grams, max_weight_grams) VALUES
      ('0-100g',0,100),
      ('100-250g',100,250),
      ('250-500g',250,500),
      ('500g-1kg',500,1000),
      ('1kg-1.5kg',1000,1500),
      ('1.5kg-2kg',1500,2000),
      ('2kg-2.5kg',2000,2500),
      ('2.5kg-3kg',2500,3000)
      ON CONFLICT (min_weight_grams, max_weight_grams) DO NOTHING;`)

    for (const q of sql) {
      // eslint-disable-next-line no-await-in-loop
      await db.query(q)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Setup error', e)
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 })
  }
}
