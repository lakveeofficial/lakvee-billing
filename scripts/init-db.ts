import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Manually load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initializeDatabase() {
  const client = await pool.connect();
  console.log('Connected to the database, starting initialization...');

  try {
    await client.query('BEGIN');

    // Legacy cleanup: remove old bookings tables if they still exist
    console.log('Dropping legacy bookings tables if present...');
    await client.query(`DROP TABLE IF EXISTS booking_items CASCADE`);
    await client.query(`DROP TABLE IF EXISTS bookings CASCADE`);

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

    // Party-specific rate slabs table
    console.log('Creating party_rate_slabs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS party_rate_slabs (
        id SERIAL PRIMARY KEY,
        party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
        shipment_type VARCHAR(20) NOT NULL CHECK (shipment_type IN ('DOCUMENT', 'NON_DOCUMENT')),
        mode_id INTEGER NOT NULL,
        service_type_id INTEGER,
        distance_slab_id INTEGER NOT NULL,
        slab_id INTEGER NOT NULL,
        rate NUMERIC NOT NULL DEFAULT 0,
        fuel_pct NUMERIC,
        packing NUMERIC,
        handling NUMERIC,
        gst_pct NUMERIC,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS idx_prs_party ON party_rate_slabs(party_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_prs_combo ON party_rate_slabs(party_id, shipment_type, mode_id, service_type_id, distance_slab_id, slab_id)');

    // Ensure legacy/new columns are handled
    await client.query(`ALTER TABLE party_rate_slabs ADD COLUMN IF NOT EXISTS packing NUMERIC`);
    // Ensure legacy columns are removed if present
    await client.query(`ALTER TABLE party_rate_slabs DROP COLUMN IF EXISTS effective_from`);
    await client.query(`ALTER TABLE party_rate_slabs DROP COLUMN IF EXISTS effective_to`);

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

    // Link CSV rows to generated invoices to prevent double billing
    await client.query(`
      ALTER TABLE csv_invoices
      ADD COLUMN IF NOT EXISTS invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL
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
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure GST type, slab assignment, and shipping address columns exist on parties
    console.log('Ensuring all columns on parties table...');
    await client.query(`
      ALTER TABLE parties
      ADD COLUMN IF NOT EXISTS gst_type VARCHAR(20) DEFAULT 'unregistered',
      ADD COLUMN IF NOT EXISTS weight_slab_id INTEGER,
      ADD COLUMN IF NOT EXISTS distance_slab_id INTEGER,
      ADD COLUMN IF NOT EXISTS distance_category VARCHAR(50),
      ADD COLUMN IF NOT EXISTS volume_slab_id INTEGER,
      ADD COLUMN IF NOT EXISTS cod_slab_id INTEGER,
      ADD COLUMN IF NOT EXISTS shipping_address TEXT,
      ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100),
      ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(10),
      ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS use_same_address BOOLEAN DEFAULT TRUE
    `);

    // Ensure CHECK constraint on gst_type allowed values
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

    // Add foreign keys referencing slabs (if not already present)
    // Use constraint names so we can check existence via pg_constraint
    const fkChecks = await client.query(`
      SELECT conname FROM pg_constraint WHERE conname = ANY($1)
    `, [[
      'fk_parties_weight_slab',
      'fk_parties_distance_slab',
      'fk_parties_volume_slab',
      'fk_parties_cod_slab'
    ]]);
    const existing = new Set(fkChecks.rows.map(r => r.conname));
    if (!existing.has('fk_parties_weight_slab')) {
      await client.query(`
        ALTER TABLE parties
        ADD CONSTRAINT fk_parties_weight_slab FOREIGN KEY (weight_slab_id) REFERENCES slabs(id) ON DELETE SET NULL
      `);
    }
    if (!existing.has('fk_parties_distance_slab')) {
      await client.query(`
        ALTER TABLE parties
        ADD CONSTRAINT fk_parties_distance_slab FOREIGN KEY (distance_slab_id) REFERENCES slabs(id) ON DELETE SET NULL
      `);
    }
    if (!existing.has('fk_parties_volume_slab')) {
      await client.query(`
        ALTER TABLE parties
        ADD CONSTRAINT fk_parties_volume_slab FOREIGN KEY (volume_slab_id) REFERENCES slabs(id) ON DELETE SET NULL
      `);
    }
    if (!existing.has('fk_parties_cod_slab')) {
      await client.query(`
        ALTER TABLE parties
        ADD CONSTRAINT fk_parties_cod_slab FOREIGN KEY (cod_slab_id) REFERENCES slabs(id) ON DELETE SET NULL
      `);
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

    console.log('Creating payments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        payment_date DATE NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        payment_method VARCHAR(50),
        reference_number VARCHAR(100),
        notes TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_party_id ON invoices(party_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);');
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

    // --- Add slabs table ---
    console.log('Creating slabs table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS slabs (
        id SERIAL PRIMARY KEY,
        slabType VARCHAR(50) NOT NULL,
        slabLabel VARCHAR(255) NOT NULL,
        fromValue NUMERIC NOT NULL,
        toValue NUMERIC NOT NULL,
        unitType VARCHAR(50) NOT NULL,
        rate NUMERIC NOT NULL,
        effectiveDate DATE NOT NULL,
        status VARCHAR(20) NOT NULL,
        distanceCategory VARCHAR(50)
      )
    `);

    console.log('Creating active_companies table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS active_companies (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

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
