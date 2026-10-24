import React, { useState, useMemo, useCallback } from 'react';
import { STAGES } from '../data/constants';
import { RuleId, StageInfo } from '../types';
import { Search, X } from 'lucide-react';

interface StageSelectorProps {
  selectedRuleId: RuleId;
  openStageIds: string[];
  onSelectStage: (stageId: string) => void;
  onCloseStage?: (stageId: string) => void;
  hasMemoStageSet: Set<string>;
  onCloseMobileDrawer?: () => void;
}

interface StageItemProps {
  stage: StageInfo;
  isOpen: boolean;
  openIndex?: number;
  hasMemo: boolean;
  onSelect: (stageId: string) => void;
}

const StageItem = React.memo<StageItemProps>(({
  stage,
  isOpen,
  openIndex,
  hasMemo,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(stage.id)}
      title={isOpen ? `${stage.name}のメモを閉じる` : `${stage.name}のメモを開く`}
      className={`w-full text-left min-h-[42px] px-3 py-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors select-none ${
        isOpen
          ? 'bg-slate-800 text-white border-yellow-400 ring-1 ring-yellow-400/40 shadow-sm'
          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            hasMemo ? 'bg-yellow-400' : 'bg-slate-700'
          }`}
        />
        <span className="font-['M_PLUS_Rounded_1c'] font-bold text-xs sm:text-sm tracking-tight truncate">
          {stage.name}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isOpen && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-400/20 text-yellow-300">
            {openIndex ? `表示中 (${openIndex})` : '表示中'}
          </span>
        )}
      </div>
    </button>
  );
});

export const StageSelector: React.FC<StageSelectorProps> = React.memo(({
  openStageIds,
  onSelectStage,
  hasMemoStageSet,
  onCloseMobileDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered only when search query changes
  const filteredStages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return STAGES;
    return STAGES.filter((stage) => {
      return (
        stage.name.toLowerCase().includes(q) ||
        stage.shortName.toLowerCase().includes(q) ||
        stage.englishName.toLowerCase().includes(q) ||
        stage.kana.includes(q)
      );
    });
  }, [searchQuery]);

  const handleStageClick = useCallback(
    (stageId: string) => {
      onSelectStage(stageId);
    },
    [onSelectStage]
  );

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Header & Search */}
      <div className="p-3 sm:p-4 border-b border-slate-800 space-y-2.5 bg-slate-950">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['M_PLUS_Rounded_1c']">
              ステージ選択 ({STAGES.length})
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              開いているメモ: {openStageIds.length}/2
            </span>
          </div>

          {onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="lg:hidden min-h-[40px] px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center gap-1.5 transition-colors font-['M_PLUS_Rounded_1c']"
              title="閉じる"
            >
              <X className="w-4 h-4" />
              <span>閉じる</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ステージ名・かな検索..."
            className="w-full min-h-[40px] pl-9 pr-8 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              title="検索クリア"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Stage Items List */}
      <div className="flex-1 overflow-y-auto overscroll-y-contain p-2 sm:p-2.5 space-y-1.5 focus:outline-none max-h-[calc(100vh-280px)] lg:max-h-[620px]">
        {filteredStages.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            該当するステージが見つかりません
          </div>
        ) : (
          filteredStages.map((stage) => {
            const openIdx = openStageIds.indexOf(stage.id);
            const isOpen = openIdx !== -1;
            return (
              <StageItem
                key={stage.id}
                stage={stage}
                isOpen={isOpen}
                openIndex={isOpen && openStageIds.length > 1 ? openIdx + 1 : undefined}
                hasMemo={hasMemoStageSet.has(stage.id)}
                onSelect={handleStageClick}
              />
            );
          })
        )}
      </div>

      {/* Mobile Footer for closing drawer when done selecting */}
      {onCloseMobileDrawer && (
        <div className="p-3 border-t border-slate-800 bg-slate-950 shrink-0 lg:hidden flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400 font-medium font-['M_PLUS_Rounded_1c']">
            表示中: <span className="font-bold text-yellow-400">{openStageIds.length}</span>/2
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="min-h-[44px] px-5 py-2 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl transition-colors font-['M_PLUS_Rounded_1c'] shadow-sm"
          >
            完了（メモ画面へ）
          </button>
        </div>
      )}
    </div>
  );
});
