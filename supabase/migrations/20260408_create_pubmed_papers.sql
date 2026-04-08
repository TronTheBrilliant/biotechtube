-- Create pubmed_papers table for storing PubMed research papers
-- Used by science_essay and innovation_spotlight article types

CREATE TABLE IF NOT EXISTS pubmed_papers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pmid text UNIQUE NOT NULL,
  title text NOT NULL,
  abstract text,
  authors text[] DEFAULT '{}',
  journal text,
  published_date text,
  doi text,
  mesh_terms text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pubmed_papers_pmid ON pubmed_papers (pmid);
CREATE INDEX IF NOT EXISTS idx_pubmed_papers_mesh_terms ON pubmed_papers USING GIN (mesh_terms);
CREATE INDEX IF NOT EXISTS idx_pubmed_papers_created_at ON pubmed_papers (created_at DESC);
