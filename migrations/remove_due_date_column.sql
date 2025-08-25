-- Drop the due_date column from the invoices table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
        ALTER TABLE invoices DROP COLUMN due_date;
        RAISE NOTICE 'Dropped due_date column from invoices table';
    ELSE
        RAISE NOTICE 'due_date column does not exist in invoices table';
    END IF;
END $$;
