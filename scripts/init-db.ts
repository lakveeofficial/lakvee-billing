import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Manually load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Prefer SSL for remote databases (e.g., Neon/Render); disable only for localhost
function inferSSLFromUrl(url?: string) {
  try {
    if (!url) return false
    const u = new URL(url)
    const host = (u.hostname || '').toLowerCase()
    return !(host === 'localhost' || host === '127.0.0.1')
  } catch {
    return process.env.NODE_ENV === 'production'
  }
}

const needsSSL = inferSSLFromUrl(process.env.DATABASE_URL)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: needsSSL ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    const u = new URL(process.env.DATABASE_URL || '')
    console.log(`Connected to database host: ${u.hostname} (ssl=${needsSSL ? 'on' : 'off'})`)
  } catch {
    console.log('Connected to the database, starting initialization...')
  }

  try {
    await client.query('BEGIN');

    // Legacy cleanup: remove old bookings tables if they still exist
    console.log('Dropping legacy bookings tables if present...');
    await client.query(`DROP TABLE IF EXISTS booking_items CASCADE`);
    await client.query(`DROP TABLE IF EXISTS bookings CASCADE`);

    console.log('Creating slabs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS slabs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'billing_operator' CHECK (role IN ('admin', 'billing_operator')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    // Create csv_invoices table (separate structure for CSV uploaded invoices)
    console.log('Creating csv_invoices table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS csv_invoices (
        id UUID PRIMARY KEY,
        booking_date DATE,
        booking_reference TEXT,
        consignment_no TEXT,
        mode TEXT,
        service_type TEXT,
        weight NUMERIC,
        prepaid_amount NUMERIC,
        final_collected NUMERIC,
        retail_price NUMERIC,
        sender_name TEXT,
        sender_phone TEXT,
        sender_address TEXT,
        recipient_name TEXT,
        recipient_phone TEXT,
        recipient_address TEXT,
        booking_mode TEXT,
        shipment_type TEXT,
        risk_surcharge_amount NUMERIC,
        risk_surcharge_type TEXT,
        contents TEXT,
        declared_value NUMERIC,
        eway_bill TEXT,
        gst_invoice TEXT,
        customer TEXT,
        service_code TEXT,
        region TEXT,
        payment_mode TEXT,
        chargeable_weight NUMERIC,
        payment_utr TEXT,
        employee_code TEXT,
        employee_discount_percent NUMERIC,
        employee_discount_amount NUMERIC,
        promocode TEXT,
        promocode_discount NUMERIC,
        packing_material TEXT,
        no_of_stretch_films INTEGER,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // Remove existing duplicates prior to adding unique indexes
    console.log('Cleaning up duplicate booking_reference in csv_invoices...');
    await client.query(`
      WITH dups AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY booking_reference ORDER BY created_at DESC, id DESC) AS rn
        FROM csv_invoices
        WHERE booking_reference IS NOT NULL
      )
      DELETE FROM csv_invoices c
      USING dups d
      WHERE c.id = d.id AND d.rn > 1
    `);

    console.log('Cleaning up duplicate consignment_no in csv_invoices...');
    await client.query(`
      WITH dups AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY consignment_no ORDER BY created_at DESC, id DESC) AS rn
        FROM csv_invoices
        WHERE consignment_no IS NOT NULL
      )
      DELETE FROM csv_invoices c
      USING dups d
      WHERE c.id = d.id AND d.rn > 1
    `);

    // Uniqueness to prevent duplicates on upload (allow NULLs)
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_csv_invoices_booking_reference
      ON csv_invoices(booking_reference)
      WHERE booking_reference IS NOT NULL
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_csv_invoices_consignment_no
      ON csv_invoices(consignment_no)
      WHERE consignment_no IS NOT NULL
    `);

    // Add invoice_id column without FK constraint (will add FK later after invoices table exists)
    await client.query(`
      ALTER TABLE csv_invoices
      ADD COLUMN IF NOT EXISTS invoice_id INTEGER
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_csv_invoices_invoice_id ON csv_invoices(invoice_id)
    `);

    console.log('Creating parties table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS parties (
        id SERIAL PRIMARY KEY,
        party_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        gst_number VARCHAR(15),
        gst_type VARCHAR(20) DEFAULT 'unregistered',
        pan_number VARCHAR(10),
        shipping_address TEXT,
        shipping_city VARCHAR(100),
        shipping_state VARCHAR(100),
        shipping_pincode VARCHAR(10),
        shipping_phone VARCHAR(20),
        use_same_address BOOLEAN DEFAULT TRUE,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating companies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        gstin VARCHAR(15),
        phone VARCHAR(20),
        email VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(10),
        pan_number VARCHAR(10),
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating active_companies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS active_companies (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating party_quotations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS party_quotations (
        id SERIAL PRIMARY KEY,
        party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        package_type VARCHAR(50) NOT NULL,
        rates JSONB NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(party_id, package_type)
      )
    `);

    console.log('Ensuring all columns on parties table...');
    await client.query(`
      ALTER TABLE parties
      ADD COLUMN IF NOT EXISTS gst_type VARCHAR(20) DEFAULT 'unregistered',
      ADD COLUMN IF NOT EXISTS created_by INTEGER,
      ADD COLUMN IF NOT EXISTS gstin VARCHAR(15),
      ADD COLUMN IF NOT EXISTS billing_address JSONB,
      ADD COLUMN IF NOT EXISTS shipping_address JSONB,
      ADD COLUMN IF NOT EXISTS use_shipping_address BOOLEAN DEFAULT FALSE
    `);


    const checkRes = await client.query(
      `SELECT conname FROM pg_constraint WHERE conname = 'chk_parties_gst_type'`
    );
    if (checkRes.rows.length === 0) {
      await client.query(`
        ALTER TABLE parties
        ADD CONSTRAINT chk_parties_gst_type
        CHECK (gst_type IN ('unregistered','consumer','registered','composition','overseas'))
      `);
    }

    console.log('Adding client-specific fields to parties table...');
    await client.query(`
      ALTER TABLE parties 
      ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS email2 TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS fuel_charge_percent DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS fov_charge_percent DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cgst_percent DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS sgst_percent DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS igst_percent DECIMAL(5,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS send_weights_in_email BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS send_charges_in_email BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS send_carrier_in_email BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS send_remark_in_email BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS send_welcome_sms BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ignore_while_import BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS booking_with_gst BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active',
      ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    // Create index for client_type for better query performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_parties_client_type ON parties(client_type)
    `);

    // Update existing parties to have default values for new fields
    await client.query(`
      UPDATE parties SET 
        fuel_charge_percent = 0,
        fov_charge_percent = 0,
        cgst_percent = 0,
        sgst_percent = 0,
        igst_percent = 0,
        status = 'Active'
      WHERE fuel_charge_percent IS NULL
    `);

    // Add normalized unique index on parties.party_name to prevent duplicates caused by whitespace/case variants
    // We first detect duplicates; if any exist, we skip creating the index and log a warning.
    console.log('Ensuring normalized unique index on parties.party_name...');
    const dupCheck = await client.query(`
      WITH normalized AS (
        SELECT LOWER(TRIM(REGEXP_REPLACE(party_name, '\\s+', ' ', 'g'))) AS norm
        FROM parties
      ),
      agg AS (
        SELECT norm, COUNT(*) AS cnt FROM normalized GROUP BY norm
      )
      SELECT COALESCE(MAX(cnt), 0) AS max_cnt FROM agg;
    `);
    const maxCnt = Number(dupCheck.rows?.[0]?.max_cnt || 0);
    if (maxCnt <= 1) {
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS parties_party_name_normalized_uniq
        ON parties (
          LOWER(TRIM(REGEXP_REPLACE(party_name, '\\s+', ' ', 'g')))
        )
      `);
      console.log('Normalized unique index ensured on parties.party_name');
    } else {
      console.warn('Skipped creating normalized unique index on parties.party_name due to existing duplicates.');
      console.warn('Run scripts/find-duplicate-parties.sql, merge duplicates, then create the index.');
    }

    console.log('Creating invoices table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        party_id INTEGER REFERENCES parties(id) ON DELETE CASCADE,
        invoice_date DATE NOT NULL,
        subtotal DECIMAL(12,2) DEFAULT 0,
        tax_amount DECIMAL(12,2) DEFAULT 0,
        additional_charges DECIMAL(12,2) DEFAULT 0,
        received_amount DECIMAL(12,2) DEFAULT 0,
        total_amount DECIMAL(12,2) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
        payment_amount DECIMAL(12,2) DEFAULT 0,
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure new columns for invoices exist
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS apply_slab BOOLEAN DEFAULT FALSE`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS slab_amount DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS slab_breakdown JSONB`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS received_amount DECIMAL(12,2) DEFAULT 0`);
    // UI-aligned optional booking metadata at invoice level
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recipient_name TEXT`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recipient_phone TEXT`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recipient_address TEXT`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_invoice TEXT`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS prepaid_amount DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS final_collected DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS retail_price DECIMAL(12,2) DEFAULT 0`);
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS chargeable_weight NUMERIC`);

    console.log('Creating invoice_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        item_description VARCHAR(255) NOT NULL,
        quantity INTEGER DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure new columns for invoice_items exist
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS booking_date DATE`);
    // New editable per-row fields used by the UI (nullable for backward compatibility)
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS shipment_type VARCHAR(20) CHECK (shipment_type IN ('DOCUMENT','NON_DOCUMENT'))`);
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS mode_id INTEGER`);
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS service_type_id INTEGER`);
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS distance_slab_id INTEGER`);
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS weight_kg NUMERIC`);
    // Remove legacy columns no longer used
    await client.query(`ALTER TABLE invoice_items DROP COLUMN IF EXISTS item_number`);
    await client.query(`ALTER TABLE invoice_items DROP COLUMN IF EXISTS unit`);
    await client.query(`ALTER TABLE invoice_items DROP COLUMN IF EXISTS unit_type`);
    // Helpful indexes for filtering/reporting
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_shipment_type ON invoice_items(shipment_type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_mode_id ON invoice_items(mode_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_service_type_id ON invoice_items(service_type_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_distance_slab_id ON invoice_items(distance_slab_id)');
    // Persist per-item consignment numbers from UI
    await client.query(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS consignment_no TEXT`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_consignment_no ON invoice_items(consignment_no)');

    // Ensure invoice-level booking_ref exists for manual invoices
    await client.query(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS booking_ref TEXT`);
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_booking_ref ON invoices(booking_ref)');

    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_party_id ON invoices(party_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);');

    // Now add FK from csv_invoices to invoices
    const csvInvFk = await client.query(`SELECT conname FROM pg_constraint WHERE conname = 'fk_csv_invoices_invoice'`);
    if (csvInvFk.rows.length === 0) {
      await client.query(`
        ALTER TABLE csv_invoices
        ADD CONSTRAINT fk_csv_invoices_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
      `);
    }
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(party_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parties_gst_type ON parties(gst_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parties_weight_slab_id ON parties(weight_slab_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parties_distance_slab_id ON parties(distance_slab_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parties_volume_slab_id ON parties(volume_slab_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parties_cod_slab_id ON parties(cod_slab_id);');

    console.log('Creating companies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        gstin VARCHAR(15),
        email_id VARCHAR(100) NOT NULL,
        business_type VARCHAR(50) NOT NULL,
        business_category VARCHAR(50) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        business_address TEXT NOT NULL,
        logo TEXT, -- Base64 encoded image
        signature TEXT, -- Base64 encoded image
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- Service Types master ---
    console.log('Creating service_types table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS service_types (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- Modes master (align with UI: using shipment types as modes) ---
    console.log('Creating modes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS modes (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Seeding modes with DOCUMENT and NON_DOCUMENT (upsert and deactivate others)...');
    await client.query(`
      INSERT INTO modes(code, title, is_active) VALUES
        ('DOCUMENT','Document', TRUE),
        ('NON_DOCUMENT','Non Document', TRUE)
      ON CONFLICT (code) DO UPDATE SET
        title = EXCLUDED.title,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
    `);
    await client.query(`
      UPDATE modes
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE code NOT IN ('DOCUMENT','NON_DOCUMENT')
    `);

    console.log('Seeding service_types (upsert 9 and deactivate others)...');
    await client.query(`
      INSERT INTO service_types(code, title, is_active) VALUES
        ('AIR_CARGO','Air Cargo', TRUE),
        ('B2C_PRIORITY','B2C Priority', TRUE),
        ('B2C_SMART_EXPRESS','B2C SMART EXPRESS', TRUE),
        ('EXPRESS','EXPRESS', TRUE),
        ('GROUND_EXPRESS','Ground Express', TRUE),
        ('PREMIUM','PREMIUM', TRUE),
        ('STD_EXP_A','STD EXP-A', TRUE),
        ('STD_EXP_S','STD EXP-S', TRUE),
        ('SURFACE_EXPRESS','SURFACE EXPRESS', TRUE)
      ON CONFLICT (code) DO UPDATE SET
        title = EXCLUDED.title,
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
    `);
    await client.query(`
      UPDATE service_types
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE code NOT IN (
        'AIR_CARGO',
        'B2C_PRIORITY',
        'B2C_SMART_EXPRESS',
        'EXPRESS',
        'GROUND_EXPRESS',
        'PREMIUM',
        'STD_EXP_A',
        'STD_EXP_S',
        'SURFACE_EXPRESS'
      )
    `);

    // ==============================
    // FRS Setup tables and seeds
    // ==============================
    console.log('Creating FRS Setup tables (regions, centers, carriers, operators, sms, quotation defaults, receivers)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS regions (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regions_code ON regions(code);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_regions_name ON regions(name);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS region_states (
        region_id INT NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
        state_code TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        PRIMARY KEY(region_id, state_code)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS centers (
        id SERIAL PRIMARY KEY,
        state TEXT,
        city TEXT NOT NULL,
        region_id INT REFERENCES regions(id) ON DELETE SET NULL,
        booking_count INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS carriers (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS operators (
        id SERIAL PRIMARY KEY,
        user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        booking_rights JSONB,
        bill_item_preferences JSONB,
        bill_template TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS sms_formats (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        template TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    console.log('Creating weight_slabs table...');
    await client.query(`
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
    `);

    console.log('Creating quotation tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotation_defaults (
        id SERIAL PRIMARY KEY,
        region_id INT REFERENCES regions(id) ON DELETE CASCADE,
        package_type TEXT NOT NULL CHECK (package_type IN ('DOCUMENT','NON_DOCUMENT')),
        slab_id INTEGER REFERENCES weight_slabs(id) ON DELETE CASCADE,
        base_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
        extra_per_1000g NUMERIC(12,2) DEFAULT 0,
        notes TEXT,
        UNIQUE(region_id, package_type, slab_id)
      );
    `);

    // Ensure slab_id column exists in quotation_defaults
    await client.query(`ALTER TABLE quotation_defaults ADD COLUMN IF NOT EXISTS slab_id INTEGER REFERENCES weight_slabs(id) ON DELETE CASCADE`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotation_notes (
        id SERIAL PRIMARY KEY,
        title TEXT UNIQUE,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS receivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT,
        contact TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    // Create account_bookings table for cash and account bookings (updated schema)
    console.log('Creating account_bookings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_bookings (
        id SERIAL PRIMARY KEY,
        booking_date DATE NOT NULL,
        sender VARCHAR(255) NOT NULL,
        center VARCHAR(255),
        receiver VARCHAR(255) NOT NULL,
        mobile VARCHAR(20),
        carrier VARCHAR(255),
        reference_number VARCHAR(100),
        consignment_number VARCHAR(100),
        package_type VARCHAR(50),
        weight DECIMAL(10,2),
        weight_unit VARCHAR(10) DEFAULT 'kg',
        number_of_boxes INTEGER DEFAULT 1,
        gross_amount DECIMAL(10,2) DEFAULT 0,
        other_charges DECIMAL(10,2) DEFAULT 0,
        insurance_amount DECIMAL(10,2) DEFAULT 0,
        parcel_value DECIMAL(10,2) DEFAULT 0,
        net_amount DECIMAL(10,2) DEFAULT 0,
        remarks TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Migrate existing account_bookings table to new schema if needed
    console.log('Migrating account_bookings table schema if needed...');

    // Check if old schema exists and migrate
    const oldSchemaCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'account_bookings' AND column_name = 'sender_name'
    `);

    if (oldSchemaCheck.rows.length > 0) {
      console.log('Found old schema, migrating to new schema...');
      // Drop old table and recreate with new schema
      await client.query(`DROP TABLE IF EXISTS account_bookings CASCADE`);
      await client.query(`
        CREATE TABLE account_bookings (
          id SERIAL PRIMARY KEY,
          booking_date DATE NOT NULL,
          sender VARCHAR(255) NOT NULL,
          center VARCHAR(255),
          receiver VARCHAR(255) NOT NULL,
          mobile VARCHAR(20),
          carrier VARCHAR(255),
          reference_number VARCHAR(100),
          consignment_number VARCHAR(100),
          package_type VARCHAR(50),
          weight DECIMAL(10,2),
          weight_unit VARCHAR(10) DEFAULT 'kg',
          number_of_boxes INTEGER DEFAULT 1,
          gross_amount DECIMAL(10,2) DEFAULT 0,
          other_charges DECIMAL(10,2) DEFAULT 0,
          insurance_amount DECIMAL(10,2) DEFAULT 0,
          parcel_value DECIMAL(10,2) DEFAULT 0,
          net_amount DECIMAL(10,2) DEFAULT 0,
          remarks TEXT,
          status VARCHAR(50) DEFAULT 'pending',
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      // Add new columns to existing table
      console.log('Adding new columns to account_bookings if missing...');
      await client.query(`
        ALTER TABLE account_bookings 
        ADD COLUMN IF NOT EXISTS center VARCHAR(255),
        ADD COLUMN IF NOT EXISTS consignment_number VARCHAR(100),
          ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(10) DEFAULT 'kg'
            `);
    }

    // Create cash_bookings table (standard for walk-in/cash customers)
    console.log('Creating cash_bookings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_bookings(
              id SERIAL PRIMARY KEY,
              date DATE NOT NULL,
              sender VARCHAR(255) NOT NULL,
              sender_mobile VARCHAR(20),
              sender_address TEXT,
              center VARCHAR(255),
              receiver VARCHAR(255) NOT NULL,
              receiver_mobile VARCHAR(20),
              receiver_address TEXT,
              carrier VARCHAR(255),
              reference_number VARCHAR(255),
              package_type VARCHAR(100),
              weight DECIMAL(10, 2),
              number_of_boxes INTEGER,
              gross_amount DECIMAL(10, 2),
              fuel_charge_percent DECIMAL(5, 2),
              insurance_amount DECIMAL(10, 2),
              cgst_amount DECIMAL(10, 2),
              sgst_amount DECIMAL(10, 2),
              net_amount DECIMAL(10, 2),
              parcel_value DECIMAL(10, 2),
              weight_unit VARCHAR(10) DEFAULT 'kg',
              remarks TEXT,
              created_by INTEGER,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Create offline_bookings table for offline bookings with status (updated schema)
    console.log('Creating offline_bookings table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS offline_bookings(
          id SERIAL PRIMARY KEY,
          booking_date DATE NOT NULL,
          sender VARCHAR(255) NOT NULL,
          center VARCHAR(255),
          receiver VARCHAR(255) NOT NULL,
          mobile VARCHAR(20),
          carrier VARCHAR(255),
          reference_number VARCHAR(100),
          package_type VARCHAR(50),
          weight DECIMAL(10, 2),
          number_of_boxes INTEGER DEFAULT 1,
          gross_amount DECIMAL(10, 2) DEFAULT 0,
          other_charges DECIMAL(10, 2) DEFAULT 0,
          insurance_amount DECIMAL(10, 2) DEFAULT 0,
          parcel_value DECIMAL(10, 2) DEFAULT 0,
          net_amount DECIMAL(10, 2) DEFAULT 0,
          remarks TEXT,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);

    // Migrate existing offline_bookings table to new schema if needed
    console.log('Migrating offline_bookings table schema if needed...');

    // Check if old schema exists and migrate
    const offlineOldSchemaCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'offline_bookings' AND column_name = 'sender_name'
        `);

    if (offlineOldSchemaCheck.rows.length > 0) {
      console.log('Found old offline_bookings schema, migrating to new schema...');
      // Drop old table and recreate with new schema
      await client.query(`DROP TABLE IF EXISTS offline_bookings CASCADE`);
      await client.query(`
        CREATE TABLE offline_bookings(
          id SERIAL PRIMARY KEY,
          booking_date DATE NOT NULL,
          sender VARCHAR(255) NOT NULL,
          center VARCHAR(255),
          receiver VARCHAR(255) NOT NULL,
          mobile VARCHAR(20),
          carrier VARCHAR(255),
          reference_number VARCHAR(100),
          package_type VARCHAR(50),
          weight DECIMAL(10, 2),
          number_of_boxes INTEGER DEFAULT 1,
          gross_amount DECIMAL(10, 2) DEFAULT 0,
          other_charges DECIMAL(10, 2) DEFAULT 0,
          insurance_amount DECIMAL(10, 2) DEFAULT 0,
          parcel_value DECIMAL(10, 2) DEFAULT 0,
          net_amount DECIMAL(10, 2) DEFAULT 0,
          remarks TEXT,
          status VARCHAR(50) DEFAULT 'PENDING',
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        `);
    } else {
      // Add center column if it doesn't exist (for existing tables with new schema)
      await client.query(`
        ALTER TABLE offline_bookings 
        ADD COLUMN IF NOT EXISTS center VARCHAR(255)
        `);
    }

    // Create party_payments table for payment tracking
    console.log('Creating party_payments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS party_payments(
          id SERIAL PRIMARY KEY,
          party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
          payment_date DATE NOT NULL,
          amount DECIMAL(12, 2) NOT NULL,
          tds_deduct DECIMAL(12, 2) DEFAULT 0,
          discount DECIMAL(12, 2) DEFAULT 0,
          description TEXT,
          selected_bills JSONB,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    console.log('Altering party_payments table to add new columns...');
    await client.query(`ALTER TABLE party_payments ADD COLUMN IF NOT EXISTS tds_deduct DECIMAL(12, 2) DEFAULT 0`);
    await client.query(`ALTER TABLE party_payments ADD COLUMN IF NOT EXISTS discount DECIMAL(12, 2) DEFAULT 0`);
    await client.query(`ALTER TABLE party_payments ADD COLUMN IF NOT EXISTS description TEXT`);
    await client.query(`ALTER TABLE party_payments ADD COLUMN IF NOT EXISTS selected_bills JSONB`);

    // Optional: Drop old columns if they are no longer needed
    await client.query(`ALTER TABLE party_payments DROP COLUMN IF EXISTS payment_method`);
    await client.query(`ALTER TABLE party_payments DROP COLUMN IF EXISTS reference_no`);
    await client.query(`ALTER TABLE party_payments DROP COLUMN IF EXISTS notes`);
    await client.query(`ALTER TABLE party_payments DROP COLUMN IF EXISTS allocations`);

    // Create bills table for bill generation and tracking
    console.log('Creating bills table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills(
          id SERIAL PRIMARY KEY,
          party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
          bill_number VARCHAR(100) NOT NULL UNIQUE,
          bill_date DATE NOT NULL,
          base_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
          service_charges DECIMAL(12, 2) DEFAULT 0,
          fuel_charges DECIMAL(12, 2) DEFAULT 0,
          other_charges DECIMAL(12, 2) DEFAULT 0,
          cgst_amount DECIMAL(12, 2) DEFAULT 0,
          sgst_amount DECIMAL(12, 2) DEFAULT 0,
          igst_amount DECIMAL(12, 2) DEFAULT 0,
          total_amount DECIMAL(12, 2) NOT NULL,
          template VARCHAR(50) DEFAULT 'Default',
          email_sent BOOLEAN DEFAULT FALSE,
          status VARCHAR(50) DEFAULT 'generated',
          pdf_path TEXT,
          bill_type VARCHAR(50) DEFAULT 'monthly',
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Ensure bill_type column exists
    await client.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_type VARCHAR(50) DEFAULT 'monthly'`);

    // Create barcodes table for barcode management
    console.log('Creating barcodes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS barcodes(
          id SERIAL PRIMARY KEY,
          carrier VARCHAR(255) NOT NULL,
          barcode_range VARCHAR(255) NOT NULL,
          start_range VARCHAR(50),
          end_range VARCHAR(50),
          available_count INTEGER DEFAULT 2,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);


    // Create indexes for booking tables (after tables are created)
    console.log('Creating indexes for booking tables...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_centers_city ON centers(city)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_centers_region ON centers(region_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_receivers_name ON receivers(name)`);

    // Check if account_bookings table has the new schema before creating indexes
    const senderColumnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'account_bookings' AND column_name = 'sender'
        `);

    if (senderColumnCheck.rows.length > 0) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_account_bookings_sender ON account_bookings(sender)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_account_bookings_receiver ON account_bookings(receiver)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_account_bookings_reference ON account_bookings(reference_number)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_account_bookings_date ON account_bookings(booking_date)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_account_bookings_status ON account_bookings(status)`);
    }

    // Check if offline_bookings table has the new schema before creating indexes
    const offlineSenderCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'offline_bookings' AND column_name = 'sender'
        `);

    if (offlineSenderCheck.rows.length > 0) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offline_bookings_sender ON offline_bookings(sender)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offline_bookings_receiver ON offline_bookings(receiver)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offline_bookings_reference ON offline_bookings(reference_number)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_offline_bookings_status ON offline_bookings(status)`);
    }

    await client.query(`CREATE INDEX IF NOT EXISTS idx_party_payments_party ON party_payments(party_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_party_payments_date ON party_payments(payment_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_party ON bills(party_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number)`);

    // Seeds
    console.log('Seeding regions...');

    // Use a safer approach to insert regions
    try {
      await client.query(`
        INSERT INTO regions(code, name) VALUES
        ('MUM', 'Mumbai'), ('ROI', 'Rest of India'), ('METRO', 'Metro'), ('GJ', 'Gujarat'), ('MP', 'Madhya Pradesh'), ('NE', 'North East')
        ON CONFLICT DO NOTHING;
      `);
    } catch (error) {
      // If the above fails due to multiple unique constraints, insert one by one
      console.log('Bulk insert failed, inserting regions individually...');
      const regions = [
        ['MUM', 'Mumbai'],
        ['ROI', 'Rest of India'],
        ['METRO', 'Metro'],
        ['GJ', 'Gujarat'],
        ['MP', 'Madhya Pradesh'],
        ['NE', 'North East']
      ];

      for (const [code, name] of regions) {
        try {
          await client.query(`
            INSERT INTO regions(code, name) VALUES($1, $2)
            ON CONFLICT DO NOTHING
          `, [code, name]);
        } catch (err) {
          // Ignore individual insert errors (likely duplicates)
          console.log(`Skipping region ${code} - ${name} (already exists)`);
        }
      }
    }
    await client.query(`
      INSERT INTO carriers(name, is_active) VALUES
        ('Professional Courier', TRUE), ('DTDC', TRUE), ('Blue Dart', TRUE)
      ON CONFLICT(name) DO NOTHING;
      `);


    // Seed some sample barcodes
    console.log('Seeding barcodes...');
    try {
      await client.query(`
        INSERT INTO barcodes(carrier, barcode_range, start_range, end_range, available_count) VALUES
        ('PROFESSIONAL COURIER', 'VP6803033 - VP6503086', 'VP6803033', 'VP6503086', 2)
        `);
    } catch (error) {
      console.log('Barcode already exists, skipping...');
    }

    console.log('Checking for default admin user...');
    const adminExists = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);

    if (adminExists.rows.length === 0) {
      console.log('Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin@billing.com', hashedPassword, 'admin']
      );
      console.log('Default admin user created.');
    } else {
      console.log('Admin user already exists.');
    }

    // Create default billing operator user if not exists
    const operatorExists = await client.query('SELECT id FROM users WHERE username = $1', ['operator1']);
    if (operatorExists.rows.length === 0) {
      console.log('Creating default billing operator user...');
      const operatorHashedPassword = await bcrypt.hash('operator123', 10);
      await client.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        ['operator1', 'operator1@billing.com', operatorHashedPassword, 'billing_operator']
      );
      console.log('Default billing operator user created.');
    } else {
      console.log('Billing operator user already exists.');
    }

    await client.query('COMMIT');
    console.log('✅ Database initialized successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

initializeDatabase().catch(err => {
  console.error('A critical error occurred during database initialization:', err);
  process.exit(1);
});
