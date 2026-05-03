-- Add default_locale column to vendors table
ALTER TABLE "vendors" ADD COLUMN "default_locale" TEXT NOT NULL DEFAULT 'ar';
