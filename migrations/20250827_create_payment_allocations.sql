-- Create payment_allocations table linking party payments to invoices
CREATE TABLE IF NOT EXISTS payment_allocations (
  id SERIAL PRIMARY KEY,
  party_payment_id INTEGER NOT NULL REFERENCES party_payments(id) ON DELETE CASCADE,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_party_payment_id ON payment_allocations(party_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON payment_allocations(invoice_id);
