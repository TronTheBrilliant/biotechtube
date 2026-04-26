-- Web-search tool support for the Ask BiotechTube chatbot.
-- Two tables:
--   chat_web_search_limits — per-IP per-day search count (separate from chat_rate_limits)
--   chat_tool_calls        — audit log of every tool invocation, for cost tracking

CREATE TABLE IF NOT EXISTS chat_web_search_limits (
  ip text NOT NULL,
  day date NOT NULL,
  count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, day)
);
CREATE INDEX IF NOT EXISTS idx_chat_web_search_limits_day ON chat_web_search_limits (day);

CREATE OR REPLACE FUNCTION increment_chat_web_search_limit(p_ip text)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE new_count int;
BEGIN
  INSERT INTO chat_web_search_limits (ip, day, count, updated_at)
  VALUES (p_ip, current_date, 1, now())
  ON CONFLICT (ip, day) DO UPDATE
    SET count = chat_web_search_limits.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

CREATE TABLE IF NOT EXISTS chat_tool_calls (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid REFERENCES chat_conversations(id) ON DELETE SET NULL,
  ip text,
  tool_name text NOT NULL,
  args jsonb NOT NULL,
  result_size int,
  cost_estimate_usd numeric(10,5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_tool_calls_created ON chat_tool_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_tool_calls_tool ON chat_tool_calls (tool_name, created_at DESC);

ALTER TABLE chat_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_web_search_limits ENABLE ROW LEVEL SECURITY;
