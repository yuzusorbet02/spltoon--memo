import React, { useState } from 'react';
import {
  X,
  Download,
  Upload,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  FileJson,
  Sparkles,
} from 'lucide-react';
import {
  exportMemosJson,
  importMemosJson,
  clearAllMemos,
  loadAllMemos,
} from '../services/memoStorage';
import { MemoStore } from '../types';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataUpdated: (newStore: MemoStore) => void;
}

export const DataModal: React.FC<DataModalProps> = ({
  isOpen,
  onClose,
  onDataUpdated,
}) => {
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!isOpen) return null;

  const handleDownload = () => {
    const jsonStr = exportMemosJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `splamemo-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setFeedback({ type: 'success', message: 'バックアップファイルをダウンロードしました。' });
  };

  const handleCopyJson = async () => {
    const jsonStr = exportMemosJson();
    try {
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setFeedback({ type: 'success', message: 'バックアップJSONをクリップボードにコピーしました。' });
    } catch (e) {
      setFeedback({ type: 'error', message: 'コピーに失敗しました。' });
    }
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setFeedback({ type: 'error', message: '貼り付けるJSONデータを入力してください。' });
      return;
    }

    const res = importMemosJson(importText);
    if (res.success) {
      const updated = loadAllMemos();
      onDataUpdated(updated);
      setImportText('');
      setFeedback({
        type: 'success',
        message: `${res.count} 件のメモデータを正常に復元しました！`,
      });
    } else {
      setFeedback({ type: 'error', message: res.error || '復元に失敗しました。' });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importMemosJson(content);
      if (res.success) {
        const updated = loadAllMemos();
        onDataUpdated(updated);
        setFeedback({
          type: 'success',
          message: `ファイルから ${res.count} 件のメモを復元しました！`,
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'ファイルの読み込みに失敗しました。' });
      }
    };
    reader.readAsText(file);
  };

  const handleResetAll = () => {
    const confirm = window.confirm(
      '【警告】すべてのルール・ステージのメモが完全に消去されます。\n本当によろしいですか？\n（事前にバックアップを取ることを推奨します）'
    );
    if (confirm) {
      const empty = clearAllMemos();
      onDataUpdated(empty);
      setFeedback({ type: 'success', message: 'すべてのメモを消去しました。' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['M_PLUS_Rounded_1c']">
                データ管理・バックアップ
              </h2>
              <p className="text-xs text-slate-400">
                ブラウザのローカルストレージに保存されているメモの書き出しと読み込み
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                  : 'bg-red-950/60 border border-red-800/80 text-red-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Section 1: Backup / Export */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-['M_PLUS_Rounded_1c']">
              <Download className="w-3.5 h-3.5 text-yellow-400" />
              <span>データの書き出し (バックアップ)</span>
            </h3>
            <p className="text-xs text-slate-400">
              全125通りのメモデータをJSON形式で保存します。PCやスマホの機種変更時にも安心です。
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleDownload}
                className="min-h-[44px] px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>JSONファイルをダウンロード</span>
              </button>

              <button
                type="button"
                onClick={handleCopyJson}
                className="min-h-[44px] px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copied ? 'コピー完了' : 'JSON文字列をコピー'}</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section 2: Restore / Import */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-['M_PLUS_Rounded_1c']">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>データの読み込み (復元)</span>
            </h3>
            <p className="text-xs text-slate-400">
              バックアップしたJSONファイルを選択するか、テキストを貼り付けて復元します。
            </p>

            <div className="space-y-2">
              <label className="block">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
                />
              </label>

              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="またはここにJSON文字列を貼り付け..."
                rows={3}
                className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-400 resize-none font-mono"
              />

              <button
                type="button"
                onClick={handleImport}
                disabled={!importText.trim()}
                className="min-h-[40px] px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Upload className="w-4 h-4" />
                <span>テキストから復元を実行</span>
              </button>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Section 3: Danger Zone */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>データ消去</span>
            </h3>
            <p className="text-xs text-slate-400">
              ブラウザに保存されたすべてのメモを一括消去します。
            </p>
            <button
              type="button"
              onClick={handleResetAll}
              className="min-h-[40px] px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/80 font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>全メモを初期化・消去</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
