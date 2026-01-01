import React, { useState, useEffect, useRef } from 'react';
import { generateCorpusEntry } from './services/geminiService';
import { CorpusCard } from './types';
import InputSection from './components/InputSection';
import CorpusCardDisplay from './components/CorpusCardDisplay';
import SettingsModal from './components/SettingsModal';
import { BookOpen, AlertCircle, Download, Upload, FileJson, Settings } from 'lucide-react';

const STORAGE_KEY = 'linguist-corpus-history';
const API_KEY_STORAGE_KEY = 'linguist-gemini-api-key';

const App: React.FC = () => {
  const [cards, setCards] = useState<CorpusCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize API Key from LocalStorage or Fallback to Environment (for dev)
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || process.env.API_KEY || '';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to local storage whenever cards change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  // Save API Key to local storage
  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  };

  const handleAnalyze = async (term: string) => {
    if (!apiKey) {
      setIsSettingsOpen(true);
      setError("APIキーが設定されていません。設定画面からGoogle Gemini APIキーを入力してください。");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const entry = await generateCorpusEntry(term, apiKey);
      const newCard: CorpusCard = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: Date.now()
      };
      // Prepend new card
      setCards(prev => [newCard, ...prev]);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("API Key")) {
         setError("APIキーが無効か、設定されていません。設定を確認してください。");
         setIsSettingsOpen(true);
      } else {
         setError("分析に失敗しました。もう一度お試しください。");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("このカードを削除しますか？")) {
      setCards(prev => prev.filter(c => c.id !== id));
    }
  };

  // Export Data (JSON)
  const handleExport = () => {
    const dataStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `linguist_corpus_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import Data Trigger
  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  // Handle File Import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          // Merge strategy: Add only if ID doesn't exist, generic check
          const existingIds = new Set(cards.map(c => c.id));
          const newCards = imported.filter((c: any) => c.term && c.meaning && !existingIds.has(c.id));
          
          if (newCards.length > 0) {
            setCards(prev => [...newCards, ...prev]);
            alert(`${newCards.length}件のカードを読み込みました。`);
          } else {
            alert("新しいカードは見つかりませんでした（重複または形式エラー）。");
          }
        }
      } catch (err) {
        alert("ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 flex flex-col">
      {/* Hidden Input for Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportFile} 
        accept=".json" 
        className="hidden" 
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        apiKey={apiKey}
        onSave={handleSaveApiKey}
      />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm safe-area-top">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-700">
            <BookOpen size={24} strokeWidth={2.5} />
            <h1 className="text-lg md:text-xl font-bold tracking-tight">Linguist Corpus</h1>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">
             <button 
              onClick={triggerImport}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="データを読み込む"
            >
              <Upload size={20} />
            </button>
            <button 
              onClick={handleExport}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="データを保存"
            >
              <Download size={20} />
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className={`p-2 rounded-lg transition-colors ${
                !apiKey ? 'text-red-500 bg-red-50 hover:bg-red-100 animate-pulse' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100'
              }`}
              title="API設定"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 flex-1 w-full">
        
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-serif text-slate-800 font-medium mb-2">
            表現インベントリ
          </h2>
          <p className="text-slate-500 text-xs md:text-sm">
            日中翻訳（中→日）のための表現分析ツール。<br className="md:hidden"/>
            {!apiKey && <span className="text-red-500 font-bold block mt-1">※右上の歯車アイコンからAPIキーを設定してください</span>}
          </p>
        </div>

        {/* Input */}
        <InputSection onAnalyze={handleAnalyze} isLoading={loading} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 text-sm border border-red-100 animate-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Content List */}
        <div className="space-y-6">
          {cards.length === 0 && !loading ? (
            <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <FileJson size={48} className="mx-auto mb-4 opacity-20" />
              <p>まだカードがありません</p>
              <p className="text-xs mt-2 opacity-60">表現を入力するか、右上のボタンからデータを読み込んでください</p>
            </div>
          ) : (
            cards.map(card => (
              <CorpusCardDisplay 
                key={card.id} 
                card={card} 
                onDelete={handleDelete} 
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default App;