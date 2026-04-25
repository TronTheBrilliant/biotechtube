-- Chat tables for "Ask BiotechTube" V4-Flash chatbot.
-- Three tables:
--   chat_rate_limits   — anonymous IP rate limiting (5/day)
--   chat_conversations — signed-in user conversation metadata
--   chat_messages      — individual messages within conversations

-- ── Rate limiting (anonymous users) ──
CREATE TABLE IF NOT EXISTS chat_rate_limits (
  ip text NOT NULL,
  day date NOT NULL,
  count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, day)
);

CREATE INDEX IF NOT EXISTS idx_chat_rate_limits_day
  ON chat_rate_limits (day);

-- Atomic increment-and-return function. Avoids read-modify-write race.
CREATE OR REPLACE FUNCTION increment_chat_rate_limit(p_ip text)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  new_count int;
BEGIN
  INSERT INTO chat_rate_limits (ip, day, count, updated_at)
  VALUES (p_ip, current_date, 1, now())
  ON CONFLICT (ip, day) DO UPDATE
    SET count = chat_rate_limits.count + 1,
        updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- ── Conversations (signed-in users) ──
CREATE TABLE IF NOT EXISTS chat_conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  context_type text,           -- 'company' | 'drug' | 'sector' | null
  context_slug text,           -- slug of the entity, or null for free-form chat
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_created
  ON chat_conversations (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_context
  ON chat_conversations (context_type, context_slug);

-- ── Messages ──
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created
  ON chat_messages (conversation_id, created_at ASC);

-- ── RLS policies ──
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read/write only their own conversations and messages.
CREATE POLICY chat_conversations_owner ON chat_conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY chat_messages_owner ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- Service-role (used by API routes via createServerClient) bypasses RLS,
-- so server-side endpoints can do everything regardless of these policies.
-- RLS is the safety net for any direct browser-client access.
