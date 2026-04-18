CREATE TYPE membership_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('pooling', 'ordered', 'shipped', 'delivered');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT DEFAULT '',
  location_area TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  location_area TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  whatsapp_link TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  status membership_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, community_id)
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_info TEXT DEFAULT '',
  rating NUMERIC(2,1) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  wholesale_price NUMERIC(10,2) NOT NULL,
  retail_price NUMERIC(10,2) NOT NULL,
  image_url TEXT DEFAULT '',
  weight TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  total_kg_required NUMERIC(10,2) NOT NULL DEFAULT 50,
  total_kg_committed NUMERIC(10,2) NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'pooling',
  delivery_otp TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kg_committed NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);

CREATE POLICY "Anyone can read communities" ON communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON communities FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Admin can update community" ON communities FOR UPDATE USING (auth.uid() = admin_id);
CREATE POLICY "Admin can delete community" ON communities FOR DELETE USING (auth.uid() = admin_id);

CREATE POLICY "Anyone can read memberships" ON memberships FOR SELECT USING (true);
CREATE POLICY "Users can request membership" ON memberships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin or self can update membership" ON memberships FOR UPDATE USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT admin_id FROM communities WHERE id = community_id)
);

CREATE POLICY "Anyone can read vendors" ON vendors FOR SELECT USING (true);
CREATE POLICY "Anyone can read products" ON products FOR SELECT USING (true);

CREATE POLICY "Anyone can read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Admin can manage orders" ON orders FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT admin_id FROM communities WHERE id = community_id)
);
CREATE POLICY "Admin can update orders" ON orders FOR UPDATE USING (
  auth.uid() IN (SELECT admin_id FROM communities WHERE id = community_id)
);

CREATE POLICY "Anyone can read contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Users can contribute" ON contributions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read polls" ON polls FOR SELECT USING (true);
CREATE POLICY "Admin can create polls" ON polls FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT admin_id FROM communities WHERE id = community_id)
);
CREATE POLICY "Admin can update polls" ON polls FOR UPDATE USING (
  auth.uid() IN (SELECT admin_id FROM communities WHERE id = community_id)
);

CREATE POLICY "Anyone can read poll votes" ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

INSERT INTO vendors (id, name, contact_info, rating) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Optimum Nutrition India', 'on-india@support.com | +91-9876543210', 4.8),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'MuscleBlaze', 'support@muscleblaze.com | +91-9876543211', 4.5),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'MyProtein', 'india@myprotein.com | +91-9876543212', 4.7),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Dymatize', 'support@dymatize.in | +91-9876543213', 4.6),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'MuscleTech', 'india@muscletech.com | +91-9876543214', 4.4);

INSERT INTO products (vendor_id, name, description, wholesale_price, retail_price, weight) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ON Gold Standard Whey 5lb', 'The world''s best-selling whey protein powder. 24g protein per serving with 5.5g BCAAs.', 4200.00, 5499.00, '5 lbs'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'MuscleBlaze Biozyme Isolate 4.4lb', 'Enhanced absorption formula with clinically researched enzymes. 25g protein per serving.', 3800.00, 4999.00, '4.4 lbs'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'MyProtein Impact Whey 5.5lb', 'High-quality whey concentrate with 21g protein. Over 40 incredible flavors.', 3200.00, 4299.00, '5.5 lbs'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'Dymatize ISO100 5lb', 'Hydrolyzed 100% whey protein isolate. 25g protein, 5.5g BCAAs per serving.', 5500.00, 7199.00, '5 lbs'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'MuscleTech NitroTech 4lb', 'Performance series with 30g protein and 3g creatine per serving.', 3600.00, 4799.00, '4 lbs'),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ON Serious Mass 12lb', 'High-calorie mass gainer with 50g protein and 250g carbs per serving.', 3800.00, 4999.00, '12 lbs'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'MyProtein Clear Whey Isolate 1.1lb', 'Light, refreshing, juicy protein drink. 20g protein per serving.', 1800.00, 2499.00, '1.1 lbs'),
  ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'MuscleBlaze Raw Whey 4.4lb', 'Unflavoured whey concentrate. 24g protein, 5.2g BCAAs per serving.', 2800.00, 3699.00, '4.4 lbs');
