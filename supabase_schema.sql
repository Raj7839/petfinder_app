-- Petfinder App Supabase Schema

-- 1. Profiles Table (For custom authentication)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  "fullName" TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'public',
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "mustChangePassword" BOOLEAN DEFAULT false
);

-- 2. Missing Animal Reports
CREATE TABLE missing_reports (
  id TEXT PRIMARY KEY,
  photos JSONB DEFAULT '[]'::jsonb,
  identity JSONB NOT NULL,
  "lastSeen" JSONB NOT NULL,
  contact JSONB NOT NULL,
  "imageFeatures" JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "reportedBy" TEXT NOT NULL,
  "matchedWith" TEXT
);

-- 3. Found Animal Reports
CREATE TABLE found_reports (
  id TEXT PRIMARY KEY,
  photos JSONB DEFAULT '[]'::jsonb,
  location JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  details JSONB NOT NULL,
  "imageFeatures" JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "reportedBy" TEXT NOT NULL,
  "matchedWith" TEXT
);

-- 4. Matches
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  "foundReportId" TEXT NOT NULL,
  "missingReportId" TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  "matchReasons" JSONB DEFAULT '[]'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending'
);

-- 5. Notifications
CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read BOOLEAN DEFAULT false,
  "linkedMatchId" TEXT,
  "linkedReportId" TEXT
);

-- Optional: Enable Row Level Security (RLS) but allow public access for this project since we're using anon key globally
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable public read access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Enable public insert access" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public update access" ON profiles FOR UPDATE USING (true);

ALTER TABLE missing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable public read access" ON missing_reports FOR SELECT USING (true);
CREATE POLICY "Enable public insert access" ON missing_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public update access" ON missing_reports FOR UPDATE USING (true);

ALTER TABLE found_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable public read access" ON found_reports FOR SELECT USING (true);
CREATE POLICY "Enable public insert access" ON found_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public update access" ON found_reports FOR UPDATE USING (true);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable public read access" ON matches FOR SELECT USING (true);
CREATE POLICY "Enable public insert access" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public update access" ON matches FOR UPDATE USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable public read access" ON notifications FOR SELECT USING (true);
CREATE POLICY "Enable public insert access" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public update access" ON notifications FOR UPDATE USING (true);
