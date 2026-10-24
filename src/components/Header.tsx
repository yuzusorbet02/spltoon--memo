import React, { useState } from 'react';
import { Database, HelpCircle, Pencil, Check, X } from 'lucide-react';

interface HeaderProps {
  onOpenDataModal: () => void;
  onOpenHelpModal: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({ onOpenDataModal, onOpenHelpModal }) => {
  const [siteTitle, setSiteTitle] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('splamemo_site_title');
      if (saved && saved.trim()) {
        return saved.trim();
      }
    } catch (e) {}
    return 'スプラメモ';
  });

  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(siteTitle);
  const [error, setError] = useState<string | null>(null);

  const handleStartEdit = () => {
    setTempTitle(siteTitle);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempTitle.trim();
    if (!trimmed) {
      setError('名前を空欄にはできません');
      return;
    }
    if (trimmed.length > 25) {
      setError('25文字以内で入力してください');
      return;
    }
    setSiteTitle(trimmed);
    try {
      localStorage.setItem('splamemo_site_title', trimmed);
    } catch (err) {}
    setIsEditing(false);
    setError(null);
  };

  const handleCancel = () => {
    setTempTitle(siteTitle);
    setIsEditing(false);
    setError(null);
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Wordmark & Editable Title */}
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            {isEditing ? (
              <form onSubmit={handleSave} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => {
                      setTempTitle(e.target.value);
                      if (error) setError(null);
                    }}
                    maxLength={25}
                    placeholder="サイト名"
                    autoFocus
                    className="px-2.5 py-1 text-xs sm:text-sm bg-slate-900 border border-yellow-400 rounded-lg text-white font-['M_PLUS_Rounded_1c'] font-bold focus:outline-none focus:ring-1 focus:ring-yellow-400 w-36 sm:w-48"
                  />
                  <button
                    type="submit"
                    disabled={!tempTitle.trim()}
                    className="min-h-[32px] px-2.5 py-1 text-xs bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-lg flex items-center gap-1 disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>保存</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="min-h-[32px] px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg border border-slate-700 flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>キャンセル</span>
                  </button>
                </div>
                {error && <span className="text-[11px] text-red-400 font-medium">{error}</span>}
              </form>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1
                  className="text-lg sm:text-xl font-black tracking-tight text-white font-['M_PLUS_Rounded_1c'] truncate max-w-[200px] sm:max-w-[380px]"
                  title={siteTitle}
                >
                  {siteTitle}
                </h1>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  title="サイト名を変更"
                  className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenDataModal}
              title="データ管理・バックアップ"
              className="min-h-[44px] px-3 sm:px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl flex items-center gap-1.5"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span className="hidden sm:inline">データ管理</span>
            </button>

            <button
              onClick={onOpenHelpModal}
              title="使い方・ヘルプ"
              className="min-h-[44px] min-w-[44px] p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl flex items-center justify-center"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});
