-- ============================================================
-- VITALSFLOW - COMPLETE DATABASE SCHEMA
-- Version 1.1 | February 2026
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. DOCTORS
-- ============================================================
CREATE TABLE IF NOT EXISTS doctors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  phone           VARCHAR(15) UNIQUE,
  name            VARCHAR(255),
  registration_no VARCHAR(100) UNIQUE,
  specialization  VARCHAR(100),
  clinic_name     VARCHAR(255),
  clinic_address  TEXT,
  clinic_logo_url TEXT,                              -- used in Rx header
  abha_id         VARCHAR(50),
  signing_pin     VARCHAR(255),                      -- bcrypt hashed 4-6 digit PIN
  pin_set         BOOLEAN DEFAULT FALSE,
  is_verified     BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  onboarded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. OTP SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  attempts    INTEGER DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  device_info TEXT,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. PATIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  phone         VARCHAR(15) UNIQUE NOT NULL,
  email         VARCHAR(255),
  date_of_birth DATE,
  gender        VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  blood_group   VARCHAR(5),
  abha_id       VARCHAR(50) UNIQUE,

  -- Health Performa (vitals stored as latest snapshot)
  height_cm     NUMERIC(5,2),
  weight_kg     NUMERIC(5,2),
  bp_systolic   INTEGER,
  bp_diastolic  INTEGER,
  pulse_bpm     INTEGER,
  spo2          INTEGER,
  temperature_f NUMERIC(4,1),

  -- Lifestyle flags
  is_smoker     BOOLEAN DEFAULT FALSE,
  is_alcoholic  BOOLEAN DEFAULT FALSE,
  is_diabetic   BOOLEAN DEFAULT FALSE,

  -- Allergies stored as a simple text array
  allergies     TEXT[],

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. QUEUE
-- ============================================================
CREATE TABLE IF NOT EXISTS queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  type        VARCHAR(20) DEFAULT 'walk-in' CHECK (type IN ('walk-in', 'appointment')),
  status      VARCHAR(25) DEFAULT 'waiting'
                CHECK (status IN ('waiting', 'in-consultation', 'done', 'cancelled')),
  token_no    INTEGER,                               -- queue number for the day
  notes       TEXT,                                  -- reason for visit
  scheduled_at TIMESTAMPTZ,                          -- for appointments
  queue_date  DATE DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. PRESCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS prescriptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctors(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  queue_id        UUID REFERENCES queue(id),

  status          VARCHAR(20) DEFAULT 'draft'
                    CHECK (status IN ('draft', 'signed', 'cancelled')),

  -- Vitals snapshot at time of prescription
  vitals_snapshot JSONB,

  -- FHIR bundle stored as JSONB
  fhir_bundle     JSONB,

  -- QR & sharing
  qr_code_url     TEXT,                             -- S3/CDN URL of QR image
  signed_url_token VARCHAR(255) UNIQUE,             -- token for public access
  signed_url_expires_at TIMESTAMPTZ,

  -- Sign-off
  signed_at       TIMESTAMPTZ,
  diagnosis       TEXT,
  notes           TEXT,                             -- doctor's notes

  -- WhatsApp delivery
  whatsapp_sent   BOOLEAN DEFAULT FALSE,
  whatsapp_sent_at TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. PRESCRIPTION DRUGS
-- (one row per drug line item in a prescription)
-- ============================================================
CREATE TABLE IF NOT EXISTS prescription_drugs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id   UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  brand_name        VARCHAR(255) NOT NULL,
  salt_composition  VARCHAR(255),                   -- mapped by ML/lookup
  dosage            VARCHAR(100),                   -- e.g. "500mg"
  frequency         VARCHAR(100),                   -- e.g. "1-0-1"
  duration          VARCHAR(100),                   -- e.g. "5 days"
  instructions      TEXT,                           -- e.g. "after meals"
  quantity          INTEGER,
  sort_order        INTEGER DEFAULT 0,              -- order on prescription
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. MEDICINE CATALOG
-- (price scraper dumps from 1mg, PharmEasy, Netmeds)
-- ============================================================
CREATE TABLE IF NOT EXISTS medicine_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name      VARCHAR(255) NOT NULL,
  salt_name       VARCHAR(255) NOT NULL,
  manufacturer    VARCHAR(255),
  source          VARCHAR(50) CHECK (source IN ('1mg', 'pharmeasy', 'netmeds', 'manual')),
  mrp             NUMERIC(10,2),
  pack_size       VARCHAR(100),                     -- e.g. "10 tablets"
  form            VARCHAR(50),                      -- tablet, syrup, injection
  is_generic      BOOLEAN DEFAULT FALSE,
  is_jan_aushadhi BOOLEAN DEFAULT FALSE,
  source_url      TEXT,
  last_scraped_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. PHARMACIES
-- ============================================================
CREATE TABLE IF NOT EXISTS pharmacies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255) NOT NULL,
  owner_name      VARCHAR(255),
  phone           VARCHAR(15) NOT NULL,
  whatsapp_number VARCHAR(15),
  email           VARCHAR(255),
  address         TEXT,
  city            VARCHAR(100),
  pincode         VARCHAR(10),
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  is_jan_aushadhi BOOLEAN DEFAULT FALSE,
  is_active       BOOLEAN DEFAULT TRUE,
  is_partner      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor's master pharmacy list (which pharmacies a doctor prefers)
CREATE TABLE IF NOT EXISTS doctor_pharmacies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  pharmacy_id  UUID NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  priority     INTEGER DEFAULT 1,                   -- 1 = highest preference
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, pharmacy_id)
);

-- ============================================================
-- 10. LEADS
-- (when patient sends Rx to a pharmacy via Smart Saver)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id UUID NOT NULL REFERENCES prescriptions(id),
  patient_id      UUID NOT NULL REFERENCES patients(id),
  pharmacy_id     UUID NOT NULL REFERENCES pharmacies(id),
  doctor_id       UUID NOT NULL REFERENCES doctors(id),

  status          VARCHAR(30) DEFAULT 'sent'
                    CHECK (status IN ('sent', 'accepted', 'dispensed', 'rejected')),

  -- WhatsApp notification to pharmacist
  whatsapp_notified     BOOLEAN DEFAULT FALSE,
  whatsapp_notified_at  TIMESTAMPTZ,

  -- Order value for commission calculation
  order_value     NUMERIC(10,2),
  commission_pct  NUMERIC(4,2),                     -- 2-5% pharmacy lead fee
  commission_amt  NUMERIC(10,2),

  accepted_at     TIMESTAMPTZ,
  dispensed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ABDM / ABHA VERIFICATIONS
-- (stub table for pilot — will expand post-pilot)
-- ============================================================
CREATE TABLE IF NOT EXISTS abdm_verifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID REFERENCES patients(id),
  abha_id      VARCHAR(50) NOT NULL,
  status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending', 'verified', 'failed')),
  response_raw JSONB,                               -- raw ABDM API response
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Health records fetched via ABDM M3
CREATE TABLE IF NOT EXISTS abdm_health_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID REFERENCES patients(id),
  abha_id       VARCHAR(50) NOT NULL,
  raw_records   JSONB,                              -- full FHIR bundle from ABDM
  ai_summary    TEXT,                               -- 3-line AI generated briefing
  fetched_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. ANALYTICS SNAPSHOTS
-- (pre-aggregated daily stats per doctor — avoid heavy joins)
-- ============================================================
CREATE TABLE IF NOT EXISTS doctor_analytics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id             UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  rx_count              INTEGER DEFAULT 0,
  leads_sent            INTEGER DEFAULT 0,
  leads_dispensed       INTEGER DEFAULT 0,
  smart_saver_views     INTEGER DEFAULT 0,
  smart_saver_conversions INTEGER DEFAULT 0,
  dhis_incentive_amt    NUMERIC(10,2) DEFAULT 0,    -- ₹20/Rx from DHIS
  dsc_incentive_amt     NUMERIC(10,2) DEFAULT 0,    -- ₹5/Rx DSC share
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, date)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_otp_email            ON otp_sessions(email);
CREATE INDEX IF NOT EXISTS idx_refresh_doctor       ON refresh_tokens(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_doctor_date    ON queue(doctor_id, queue_date);
CREATE INDEX IF NOT EXISTS idx_queue_status         ON queue(status);
CREATE INDEX IF NOT EXISTS idx_rx_doctor            ON prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_rx_patient           ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_rx_token             ON prescriptions(signed_url_token);
CREATE INDEX IF NOT EXISTS idx_drugs_rx             ON prescription_drugs(prescription_id);
CREATE INDEX IF NOT EXISTS idx_catalog_salt         ON medicine_catalog(salt_name);
CREATE INDEX IF NOT EXISTS idx_catalog_brand        ON medicine_catalog(brand_name);
CREATE INDEX IF NOT EXISTS idx_leads_doctor         ON leads(doctor_id);
CREATE INDEX IF NOT EXISTS idx_leads_pharmacy       ON leads(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_leads_status         ON leads(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_location    ON pharmacies(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_analytics_doctor_date ON doctor_analytics(doctor_id, date);
