-- Join requests table — players request to join, admin approves
CREATE TABLE IF NOT EXISTS league_join_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  league_id   int  NOT NULL REFERENCES leagues(id)  ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at  timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  UNIQUE (user_id, league_id)
);

ALTER TABLE league_join_requests ENABLE ROW LEVEL SECURITY;

-- Players can insert their own request
CREATE POLICY "Users can create join requests" ON league_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Players can view their own requests
CREATE POLICY "Users can view own join requests" ON league_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all join requests" ON league_join_requests
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can update (approve/reject) requests
CREATE POLICY "Admins can update join requests" ON league_join_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Admins can insert league_members on approval
CREATE POLICY "Admins can insert league members" ON league_members
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
