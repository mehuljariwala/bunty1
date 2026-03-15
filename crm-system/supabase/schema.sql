-- =============================================================================
-- Supabase PostgreSQL Schema
-- Migrated from Firebase Firestore
-- =============================================================================

-- =====================
-- 1. PARTIES
-- =====================
CREATE TABLE parties (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text,
    address     text,
    address_gu  text,
    address_hi  text,
    route       text,
    user_id     text,
    password    text,
    status      text        DEFAULT 'Enable' CHECK (status IN ('Enable', 'Disable')),
    rates       jsonb       DEFAULT '{}',
    created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE parties IS 'Customer/party master list with multi-language addresses, route assignments, and per-party rate overrides.';

CREATE INDEX idx_parties_name ON parties (name);

-- =====================
-- 2. ORDERS
-- =====================
CREATE TABLE orders (
    id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    csv_id                  integer     NOT NULL,
    party_name              text,
    party_address           text,
    party_address_gu        text,
    route                   text,
    order_date              text,
    type                    text        DEFAULT 'Running' CHECK (type IN ('Running', 'Complete')),
    items                   jsonb       DEFAULT '[]',
    grand_total_ordered     integer     DEFAULT 0,
    grand_total_delivered   integer     DEFAULT 0,
    created_at              timestamptz DEFAULT now()
);

COMMENT ON TABLE orders IS 'Sales orders with line items stored as JSONB. csv_id provides a human-readable sequential order number.';

CREATE INDEX idx_orders_csv_id ON orders (csv_id DESC);

-- =====================
-- 3. COLORS
-- =====================
CREATE TABLE colors (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text,
    code            text,
    hex             text        DEFAULT '#000000',
    category        text,
    sub_category    text,
    min_stock       integer     DEFAULT 0,
    max_stock       integer     DEFAULT 0,
    current_stock   integer     DEFAULT 0,
    running_color   boolean     DEFAULT false,
    sort_order      integer     DEFAULT 0,
    created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE colors IS 'Color/product catalogue with stock levels and display ordering.';

CREATE INDEX idx_colors_sort_order ON colors (sort_order);

-- =====================
-- 4. ROUTES
-- =====================
CREATE TABLE routes (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text,
    code        text,
    area        text,
    description text,
    active      boolean     DEFAULT true,
    parties     integer     DEFAULT 0,
    created_at  timestamptz DEFAULT now()
);

COMMENT ON TABLE routes IS 'Delivery routes with area grouping and party count cache.';

CREATE INDEX idx_routes_name ON routes (name);

-- =====================
-- 5. SUB_ADMINS
-- =====================
CREATE TABLE sub_admins (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    csv_id          integer,
    name            text,
    password        text,
    email           text        UNIQUE,
    allowed_pages   text[]      DEFAULT '{}',
    created_at      timestamptz DEFAULT now()
);

COMMENT ON TABLE sub_admins IS 'Sub-admin users with page-level access control.';

CREATE INDEX idx_sub_admins_csv_id ON sub_admins (csv_id DESC);
CREATE INDEX idx_sub_admins_email  ON sub_admins (email);

-- =====================
-- 6. PHOTOS
-- =====================
CREATE TABLE photos (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id         text,
    order_csv_id     integer,
    party_name       text,
    route            text,
    order_date       text,
    sequence_number  integer,
    order_snapshot   jsonb,
    captured_at      timestamptz DEFAULT now(),
    status           text        DEFAULT 'pending' CHECK (status IN ('pending', 'complete'))
);

COMMENT ON TABLE photos IS 'Delivery photo records linked to orders, with a frozen order snapshot at capture time.';

CREATE INDEX idx_photos_captured_at ON photos (captured_at DESC);

-- =====================
-- 7. ACTIVITY_LOGS
-- =====================
CREATE TABLE activity_logs (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     text,
    user_name   text,
    user_email  text,
    type        text,
    page        text,
    page_name   text,
    duration_ms integer,
    details     jsonb,
    timestamp   timestamptz DEFAULT now(),
    date        text
);

COMMENT ON TABLE activity_logs IS 'Audit trail capturing user actions, page visits, and timing across the CRM.';

CREATE INDEX idx_activity_logs_date_user ON activity_logs (date, user_id);

-- =====================
-- 8. COUNTERS
-- =====================
CREATE TABLE counters (
    id      text    PRIMARY KEY,
    date    text,
    counter integer DEFAULT 0
);

COMMENT ON TABLE counters IS 'Atomic daily counters used to generate sequential IDs (e.g. order csv_id).';

-- =============================================================================
-- FUNCTION: get_next_seq_number
-- Atomically increments a daily counter and returns the new value.
-- Usage:  SELECT get_next_seq_number('orders', '2026-03-14');
-- =============================================================================
CREATE OR REPLACE FUNCTION get_next_seq_number(counter_id text, counter_date text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    next_val integer;
BEGIN
    INSERT INTO counters (id, date, counter)
    VALUES (counter_id, counter_date, 1)
    ON CONFLICT (id) DO UPDATE
        SET counter = CASE
                        WHEN counters.date = EXCLUDED.date THEN counters.counter + 1
                        ELSE 1
                      END,
            date = EXCLUDED.date
    RETURNING counter INTO next_val;

    RETURN next_val;
END;
$$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- Enable RLS on every table with permissive allow-all policies for now.
-- =============================================================================

-- parties
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to parties" ON parties FOR ALL USING (true) WITH CHECK (true);

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to orders" ON orders FOR ALL USING (true) WITH CHECK (true);

-- colors
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to colors" ON colors FOR ALL USING (true) WITH CHECK (true);

-- routes
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to routes" ON routes FOR ALL USING (true) WITH CHECK (true);

-- sub_admins
ALTER TABLE sub_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sub_admins" ON sub_admins FOR ALL USING (true) WITH CHECK (true);

-- photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to photos" ON photos FOR ALL USING (true) WITH CHECK (true);

-- activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- counters
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to counters" ON counters FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- REALTIME
-- Publish all tables so Supabase Realtime can broadcast changes.
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE parties, orders, colors, routes, sub_admins, photos, counters;
