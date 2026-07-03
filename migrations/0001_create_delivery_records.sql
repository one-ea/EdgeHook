CREATE TABLE IF NOT EXISTS delivery_records (
  event_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  producer_id TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INTEGER,
  latency_ms INTEGER,
  payload TEXT NOT NULL DEFAULT '{}',
  attempts_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_delivery_records_request_id ON delivery_records(request_id);
CREATE INDEX IF NOT EXISTS idx_delivery_records_status ON delivery_records(status);
CREATE INDEX IF NOT EXISTS idx_delivery_records_producer_id ON delivery_records(producer_id);
