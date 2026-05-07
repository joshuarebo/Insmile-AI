-- Shadow mode comparison table for evaluating HuggingFace custom model vs OpenRouter
CREATE TABLE IF NOT EXISTS model_comparisons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  hf_model TEXT,
  or_model TEXT,
  hf_findings JSONB DEFAULT '[]'::jsonb,
  or_findings JSONB DEFAULT '[]'::jsonb,
  hf_finding_count INTEGER DEFAULT 0,
  or_finding_count INTEGER DEFAULT 0,
  agreement_score NUMERIC(4, 3) DEFAULT 0,
  hf_latency_ms INTEGER,
  hf_confidence NUMERIC(3, 2),
  or_confidence NUMERIC(3, 2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by scan and time
CREATE INDEX idx_model_comparisons_scan_id ON model_comparisons(scan_id);
CREATE INDEX idx_model_comparisons_created_at ON model_comparisons(created_at DESC);

-- RLS: only service role can insert (backend), company admins can read via scan join
ALTER TABLE model_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on model_comparisons"
  ON model_comparisons
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Users can view comparisons for their company scans"
  ON model_comparisons
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scans s
      WHERE s.id = model_comparisons.scan_id
      AND s.company_id IN (
        SELECT company_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
