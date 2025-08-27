-- Create party_payments table for party-level receipts
CREATE TABLE IF NOT EXISTS party_payments (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(50),
  reference_no VARCHAR(100),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_party_payments_party_id ON party_payments(party_id);
CREATE INDEX IF NOT EXISTS idx_party_payments_payment_date ON party_payments(payment_date);
