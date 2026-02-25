-- MixMaster Mobile Database Schema
-- Supabase / PostgreSQL
-- Version: 1.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE ingredient_category AS ENUM (
  'Base Spirit', 
  'Liqueur', 
  'Juice', 
  'Syrup', 
  'Soda', 
  'Garnish', 
  'Other'
);

CREATE TYPE difficulty_level AS ENUM ('Easy', 'Medium', 'Hard');

CREATE TYPE preparation_method AS ENUM ('Shake', 'Stir', 'Build', 'Blend', 'Float', 'Muddle');

-- 1. Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Ingredients Table
CREATE TABLE ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  category ingredient_category NOT NULL,
  icon VARCHAR(10),
  image_url TEXT,
  abv DECIMAL(5,2),
  description TEXT,
  aliases TEXT[] DEFAULT '{}',
  barcode VARCHAR(100),
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ingredients_category ON ingredients(category);
CREATE INDEX idx_ingredients_name ON ingredients USING gin(to_tsvector('simple', name));
CREATE INDEX idx_ingredients_barcode ON ingredients(barcode) WHERE barcode IS NOT NULL;

-- 3. Cocktails Table
CREATE TABLE cocktails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  story TEXT,
  difficulty difficulty_level DEFAULT 'Easy',
  glass_type VARCHAR(50),
  preparation_method preparation_method,
  image_url TEXT,
  video_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cocktails_name ON cocktails USING gin(to_tsvector('simple', name));
CREATE INDEX idx_cocktails_tags ON cocktails USING gin(tags);
CREATE INDEX idx_cocktails_difficulty ON cocktails(difficulty);

-- 4. Cocktail_Ingredients Junction Table
CREATE TABLE cocktail_ingredients (
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  amount VARCHAR(20),
  unit VARCHAR(20),
  is_optional BOOLEAN DEFAULT FALSE,
  notes TEXT,
  PRIMARY KEY (cocktail_id, ingredient_id)
);

CREATE INDEX idx_cocktail_ingredients_ingredient ON cocktail_ingredients(ingredient_id);

-- 5. Steps Table
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  instruction TEXT NOT NULL,
  image_url TEXT,
  duration_seconds INT,
  UNIQUE(cocktail_id, step_number)
);

-- 6. Tools Table
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  description TEXT
);

-- 7. Cocktail_Tools Junction Table
CREATE TABLE cocktail_tools (
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  tool_id UUID REFERENCES tools(id) ON DELETE CASCADE,
  PRIMARY KEY (cocktail_id, tool_id)
);

-- 8. User Pantry Table
CREATE TABLE user_pantry (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity DECIMAL(10,2),
  unit VARCHAR(20),
  opened_at DATE,
  expiry_date DATE,
  notes TEXT,
  is_synced BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, ingredient_id)
);

CREATE INDEX idx_user_pantry_user ON user_pantry(user_id);

-- 9. User Favorites Table
CREATE TABLE user_favorites (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cocktail_id)
);

-- 10. User History Table
CREATE TABLE user_history (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cocktail_id UUID REFERENCES cocktails(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cocktail_id)
);

CREATE INDEX idx_user_history_user ON user_history(user_id);
CREATE INDEX idx_user_history_viewed ON user_history(viewed_at DESC);

-- 11. AI Creations Table
CREATE TABLE ai_creations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  cocktail_data JSONB NOT NULL,
  is_saved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Sync Log Table
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  table_name VARCHAR(50) NOT NULL,
  record_id UUID NOT NULL,
  operation VARCHAR(20) NOT NULL,
  payload JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending'
);

-- Row Level Security
ALTER TABLE user_pantry ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pantry" ON user_pantry
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites" ON user_favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own history" ON user_history
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ai creations" ON ai_creations
  FOR ALL USING (auth.uid() = user_id);

-- Functions

-- Get cocktails user can make with pantry ingredients
CREATE OR REPLACE FUNCTION get_available_cocktails(p_user_id UUID)
RETURNS TABLE (
  cocktail_id UUID,
  name VARCHAR,
  name_en VARCHAR,
  image_url TEXT,
  difficulty difficulty_level,
  matched_count INT,
  missing_count INT,
  can_make BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.name_en,
    c.image_url,
    c.difficulty,
    COUNT(DISTINCT ci.ingredient_id) FILTER (WHERE ci.ingredient_id IN (
      SELECT ingredient_id FROM user_pantry WHERE user_id = p_user_id
    )) AS matched_count,
    COUNT(DISTINCT ci.ingredient_id) FILTER (WHERE ci.ingredient_id NOT IN (
      SELECT ingredient_id FROM user_pantry WHERE user_id = p_user_id
    )) AS missing_count,
    COUNT(DISTINCT ci.ingredient_id) FILTER (WHERE ci.ingredient_id NOT IN (
      SELECT ingredient_id FROM user_pantry WHERE user_id = p_user_id
    )) = 0 AS can_make
  FROM cocktails c
  JOIN cocktail_ingredients ci ON c.id = ci.cocktail_id
  GROUP BY c.id
  ORDER BY matched_count DESC, missing_count ASC;
END;
$$ LANGUAGE plpgsql;

-- Upsert user pantry with conflict resolution
CREATE OR REPLACE FUNCTION upsert_pantry_item(
  p_user_id UUID,
  p_ingredient_id UUID,
  p_quantity DECIMAL,
  p_unit VARCHAR,
  p_expiry_date DATE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_pantry (user_id, ingredient_id, quantity, unit, expiry_date, updated_at)
  VALUES (p_user_id, p_ingredient_id, p_quantity, p_unit, p_expiry_date, NOW())
  ON CONFLICT (user_id, ingredient_id) 
  DO UPDATE SET 
    quantity = EXCLUDED.quantity,
    unit = EXCLUDED.unit,
    expiry_date = EXCLUDED.expiry_date,
    updated_at = NOW(),
    is_synced = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cocktails_updated_at BEFORE UPDATE ON cocktails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE ingredients IS 'Main ingredients database, supports offline search';
COMMENT ON TABLE cocktails IS 'Cocktail recipes with full details';
COMMENT ON TABLE user_pantry IS 'User personal bar inventory, synced with cloud';
COMMENT ON FUNCTION get_available_cocktails IS 'Core "reverse search" function - returns cocktails matching user pantry';
