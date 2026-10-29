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

interface StageButtonProps {
  stage: StageInfo;
  isOpen: boolean;
  openIndex?: number;
  hasMemo: boolean;
  onSelect: (stageId: string) => void;
}

const StageButton = React.memo<StageButtonProps>(({
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
      title={isOpen ? `${stage.name}を閉じる` : `${stage.name}を開く`}
      className={`group relative text-left px-2 py-1.5 sm:py-2 rounded-lg border transition-all duration-150 select-none cursor-pointer flex items-center justify-between gap-1 min-h-[34px] sm:min-h-[36px] active:scale-[0.98] ${
        isOpen
          ? 'bg-slate-800 border-yellow-400 ring-2 ring-yellow-400/50 shadow-md shadow-yellow-400/10'
          : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Stage Name with memo dot */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
            hasMemo ? 'bg-yellow-400 shadow-sm shadow-yellow-400/80 ring-2 ring-yellow-400/30' : 'bg-slate-700'
          }`}
        />
        <span
          className={`font-['M_PLUS_Rounded_1c'] font-bold text-[11px] sm:text-xs tracking-tight truncate leading-tight block ${
            isOpen ? 'text-white font-extrabold' : 'text-slate-200 group-hover:text-white'
          }`}
        >
          {stage.name}
        </span>
      </div>

      {/* Active Selection Badge */}
      {isOpen && (
        <span className="px-1 py-0.5 rounded text-[9px] sm:text-[10px] font-black bg-yellow-400 text-slate-950 font-['M_PLUS_Rounded_1c'] shrink-0 shadow-sm leading-none">
          {openIndex ? `表示中 (${openIndex})` : '表示中'}
        </span>
      )}
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

  // Filtered by search query only
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
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg h-full max-h-full">
      {/* Header & Controls */}
      <div className="p-2 sm:p-2.5 border-b border-slate-800 space-y-1.5 bg-slate-950 shrink-0">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['M_PLUS_Rounded_1c']">
              ステージ選択
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              表示中: {openStageIds.length}/2
            </span>
          </div>

          {onCloseMobileDrawer && (
            <button
              type="button"
              onClick={onCloseMobileDrawer}
              className="lg:hidden min-h-[32px] px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors font-['M_PLUS_Rounded_1c']"
              title="閉じる"
            >
              <X className="w-3.5 h-3.5" />
              <span>閉じる</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ステージ名・かな検索..."
            className="w-full h-8 pl-8 pr-7 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
              title="検索クリア"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Button Grid: 2 columns of independent stage buttons. Scrollable on mobile with safe bottom spacing; compact non-scrolling on desktop */}
      <div className="p-1.5 sm:p-2 flex-1 min-h-0 overflow-y-auto overscroll-contain lg:overflow-visible pb-28 sm:pb-24 lg:pb-2">
        {filteredStages.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            該当するステージが見つかりません
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
            {filteredStages.map((stage) => {
              const openIdx = openStageIds.indexOf(stage.id);
              const isOpen = openIdx !== -1;
              return (
                <StageButton
                  key={stage.id}
                  stage={stage}
                  isOpen={isOpen}
                  openIndex={isOpen && openStageIds.length > 1 ? openIdx + 1 : undefined}
                  hasMemo={hasMemoStageSet.has(stage.id)}
                  onSelect={handleStageClick}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Footer for closing drawer when done selecting */}
      {onCloseMobileDrawer && (
        <div className="p-2.5 border-t border-slate-800 bg-slate-950 shrink-0 lg:hidden flex items-center justify-between gap-2 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
          <div className="text-xs text-slate-400 font-medium font-['M_PLUS_Rounded_1c']">
            表示中: <span className="font-bold text-yellow-400">{openStageIds.length}</span>/2
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="min-h-[40px] px-4 py-1.5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl transition-colors font-['M_PLUS_Rounded_1c'] shadow-sm"
          >
            完了（メモ画面へ）
          </button>
        </div>
      )}
    </div>
  );
});
