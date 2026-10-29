import React from 'react';
import { X, CheckCircle2, ShieldCheck, Smartphone, Monitor, BookOpen } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-['M_PLUS_Rounded_1c']">
                スプラメモの使い方
              </h2>
              <p className="text-xs text-slate-400">
                ルール×ステージの戦略メモを効率よく管理
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 font-['M_PLUS_Rounded_1c']">
              <CheckCircle2 className="w-4 h-4 text-yellow-400" />
              <span>各ステージ・ルールの独立メモ</span>
            </h3>
            <p className="text-slate-400">
              5つのルール（ナワバリ・エリア・ヤグラ・ホコ・アサリ）と25のステージの組み合わせごとに、それぞれ完全に独立したメモが用意されています。ルールやステージを切り替えても、入力内容は即座に保持されます。
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 font-['M_PLUS_Rounded_1c']">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>自動保存とバックアップ</span>
            </h3>
            <p className="text-slate-400">
              入力した内容はブラウザのLocalStorageにリアルタイムで自動保存されます。右上の「データ管理」からJSONファイルとしてバックアップや復元ができるため、データの消失を防げます。
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 font-['M_PLUS_Rounded_1c']">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>PCとスマホ両対応</span>
            </h3>
            <p className="text-slate-400">
              スマートフォンでは片手でも押しやすい大型タップターゲットと下部ステージ切り替え drawer を提供。PCでは広い画面でステージ一覧とメモエディタを横並びで快適に編集できます。
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-sm flex items-center gap-1.5 font-['M_PLUS_Rounded_1c']">
              <span className="text-yellow-400">★</span>
              <span>シンプルな操作性</span>
            </h3>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li>
                <strong className="text-slate-200">ステージ別とブキ別の切替:</strong> 画面上部のタブから「ステージ別」と「武器別」を自由に切り替えてメモを管理できます。
              </li>
              <li>
                <strong className="text-slate-200">2画面メモ比較:</strong> ステージを2つ選ぶことでメモを同時に開いて見比べ・編集できます（✕ボタンで閉じることが可能）。
              </li>
              <li>
                <strong className="text-slate-200">サイト名の変更:</strong> 左上の鉛筆アイコンからサイト名を自由に変更できます。
              </li>
              <li>
                <strong className="text-slate-200">ステージ送り・ブキ送り:</strong> 「前へ」「次へ」ボタンで素早く切り替え。
              </li>
              <li>
                <strong className="text-slate-200">メモをコピー:</strong> 入力したメモをワンクリックでクリップボードにコピー。
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 text-xs font-semibold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl font-bold"
          >
            理解しました
          </button>
        </div>
      </div>
    </div>
  );
};
