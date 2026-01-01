export interface ParaphraseCategory {
  category: string;
  words: string[];
}

export interface CorpusEntry {
  term: string;
  meaning: string;
  paraphrases: ParaphraseCategory[];
  localization_memo: string[];
  examples: string[];
  tags: string[];
}

// Helper to keep track of local history with IDs
export interface CorpusCard extends CorpusEntry {
  id: string;
  createdAt: number;
}
