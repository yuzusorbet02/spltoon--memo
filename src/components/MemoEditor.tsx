import React, { useState, useEffect, useRef } from 'react';
import { RuleId, MemoData, RuleInfo, StageInfo } from '../types';
import { STAGES } from '../data/constants';
import { isMemoContentFilled } from '../services/memoStorage';
import {
  Save,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  X,
} from 'lucide-react';

interface MemoEditorProps {
  currentRule: RuleInfo;
  currentStage: StageInfo;
  memoData: MemoData;
  onSaveMemo: (ruleId: RuleId, stageId: string, updated: { content?: string; weapon?: string }) => void;
  onNavigateStage: (direction: 'prev' | 'next') => void;
  onOpenStageDrawer?: () => void;
  canClose?: boolean;
  onClose?: () => void;
  paneIndex?: number;
}

export const MemoEditor: React.FC<MemoEditorProps> = React.memo(({
  currentRule,
  currentStage,
  memoData,
  onSaveMemo,
  onNavigateStage,
  onOpenStageDrawer,
  canClose,
  onClose,
  paneIndex,
}) => {
  const [content, setContent] = useState(memoData.content || '');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const slotKey = `${memoData.ruleId}_${memoData.stageId}`;
  const lastSlotKeyRef = useRef(slotKey);

  // Active key reference to prevent cross-contamination when switching rules or stages
  const activeKeyRef = useRef({
    ruleId: memoData.ruleId,
    stageId: memoData.stageId,
    content: memoData.content || '',
    weapon: memoData.weapon || '',
    isDirty: false,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerIndicator = () => {
    setSaveIndicator(true);
    if (indicatorTimeoutRef.current) {
      clearTimeout(indicatorTimeoutRef.current);
    }
    indicatorTimeoutRef.current = setTimeout(() => {
      setSaveIndicator(false);
    }, 1200);
  };

  // Immediate flush helper
  const flushSaveNow = (targetRuleId: RuleId, targetStageId: string, newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    activeKeyRef.current.isDirty = false;
    activeKeyRef.current.content = newContent;
    onSaveMemo(targetRuleId, targetStageId, {
      content: newContent,
      weapon: activeKeyRef.current.weapon,
    });
    triggerIndicator();
  };

  // Sync internal state ONLY when rule/stage combination switches or data is restored
  useEffect(() => {
    const isNewSlot = lastSlotKeyRef.current !== slotKey;

    if (isNewSlot) {
      // If previous slot had unsaved changes, flush them immediately
      if (activeKeyRef.current.isDirty) {
        onSaveMemo(activeKeyRef.current.ruleId, activeKeyRef.current.stageId, {
          content: activeKeyRef.current.content,
          weapon: activeKeyRef.current.weapon,
        });
      }
      lastSlotKeyRef.current = slotKey;
      setContent(memoData.content || '');
      activeKeyRef.current = {
        ruleId: memoData.ruleId,
        stageId: memoData.stageId,
        content: memoData.content || '',
        weapon: memoData.weapon || '',
        isDirty: false,
      };
    } else if (!activeKeyRef.current.isDirty && memoData.content !== activeKeyRef.current.content) {
      // External update (e.g. JSON restore/backup import)
      setContent(memoData.content || '');
      activeKeyRef.current.content = memoData.content || '';
      activeKeyRef.current.weapon = memoData.weapon || '';
    }
  }, [slotKey, memoData.content, memoData.weapon, memoData.ruleId, memoData.stageId, onSaveMemo]);

  // Clean-up on unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeKeyRef.current.isDirty) {
        onSaveMemo(activeKeyRef.current.ruleId, activeKeyRef.current.stageId, {
          content: activeKeyRef.current.content,
          weapon: activeKeyRef.current.weapon,
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current);
      }
      if (activeKeyRef.current.isDirty) {
        onSaveMemo(activeKeyRef.current.ruleId, activeKeyRef.current.stageId, {
          content: activeKeyRef.current.content,
          weapon: activeKeyRef.current.weapon,
        });
      }
    };
  }, [onSaveMemo]);

  // Debounced auto-save handler while typing (idle after 750ms)
  const triggerSave = (newContent: string) => {
    activeKeyRef.current.content = newContent;
    activeKeyRef.current.isDirty = true;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const targetRule = currentRule.id;
    const targetStage = currentStage.id;

    saveTimeoutRef.current = setTimeout(() => {
      activeKeyRef.current.isDirty = false;
      onSaveMemo(targetRule, targetStage, {
        content: newContent,
        weapon: activeKeyRef.current.weapon,
      });
      triggerIndicator();
    }, 750);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const prevFilled = isMemoContentFilled(content);
    const nextFilled = isMemoContentFilled(next);
    setContent(next);

    // If presence state flipped (whitespace/empty <-> 1+ non-whitespace characters),
    // update the parent immediately so the stage list indicator reflects the change in real-time
    if (prevFilled !== nextFilled) {
      activeKeyRef.current.content = next;
      activeKeyRef.current.isDirty = false;
      onSaveMemo(currentRule.id, currentStage.id, {
        content: next,
        weapon: activeKeyRef.current.weapon,
      });
    }

    triggerSave(next);
  };

  const handleBlur = () => {
    if (activeKeyRef.current.isDirty) {
      flushSaveNow(currentRule.id, currentStage.id, content);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    const fullText = `【${currentRule.fullName} × ${currentStage.name}】\n\n${content}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };



  // Current stage index in 25 stages
  const stageIndex = STAGES.findIndex((s) => s.id === currentStage.id);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Top Banner: Combination Header & Navigation */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Rule and Stage Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {paneIndex && (
              <span className="px-2 py-0.5 rounded text-[11px] font-black bg-slate-800 text-yellow-400 border border-slate-700">
                メモ {paneIndex}
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-black font-['M_PLUS_Rounded_1c'] uppercase tracking-wider ${currentRule.colors.badgeBg} ${currentRule.colors.badgeText}`}
            >
              {currentRule.fullName}
            </span>
            <span className="text-slate-400 font-bold">×</span>
            <span className="text-base sm:text-xl font-black text-white font-['M_PLUS_Rounded_1c'] tracking-tight">
              {currentStage.name}
            </span>
            <span className="text-xs text-slate-400">
              ({stageIndex + 1}/25)
            </span>
          </div>

          {/* Stepper Navigation & Close: Previous / Next Stage / Close */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            {onOpenStageDrawer && (
              <button
                onClick={onOpenStageDrawer}
                className="lg:hidden min-h-[44px] px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5 text-yellow-400" />
                <span>ステージ一覧</span>
              </button>
            )}

            <button
              onClick={() => onNavigateStage('prev')}
              title="前のステージへ"
              className="min-h-[44px] px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">前へ</span>
            </button>

            <button
              onClick={() => onNavigateStage('next')}
              title="次のステージへ"
              className="min-h-[44px] px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1"
            >
              <span className="hidden sm:inline">次へ</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {canClose && onClose && (
              <button
                onClick={() => {
                  if (activeKeyRef.current.isDirty) {
                    onSaveMemo(currentRule.id, currentStage.id, {
                      content,
                      weapon: activeKeyRef.current.weapon,
                    });
                  }
                  onClose();
                }}
                title="このメモを閉じる"
                className="min-h-[44px] min-w-[44px] p-2 bg-slate-800 hover:bg-red-950/70 hover:text-red-400 text-slate-400 border border-slate-700 hover:border-red-800/80 rounded-xl flex items-center justify-center ml-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Text Content Area */}
      <div className="flex-1 p-3 sm:p-5 flex flex-col min-h-[420px] bg-slate-900">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          className="w-full flex-1 p-4 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm sm:text-base leading-relaxed font-sans focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 resize-none"
        />
      </div>

      {/* Bottom Status & Quick Action Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            {saveIndicator ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>自動保存完了</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <Save className="w-3.5 h-3.5" />
                <span>変更は自動保存されます</span>
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5"
          >
            {copyFeedback ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">コピー完了!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-400" />
                <span>メモをコピー</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
