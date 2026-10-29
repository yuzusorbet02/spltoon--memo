import React, { useState, useEffect, useRef } from 'react';
import { WeaponInfo, WeaponMemoData } from '../types';
import { isMemoContentFilled } from '../services/memoStorage';
import {
  Save,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
  Crosshair,
  X,
} from 'lucide-react';

interface WeaponMemoEditorProps {
  currentWeapon: WeaponInfo;
  memoData: WeaponMemoData;
  onSaveMemo: (weaponId: string, updated: { content: string; weaponName: string }) => void;
  onNavigateWeapon: (direction: 'prev' | 'next') => void;
  onOpenWeaponDrawer?: () => void;
  canClose?: boolean;
  onClose?: () => void;
  weaponIndex: number;
  totalWeapons: number;
}

export const WeaponMemoEditor: React.FC<WeaponMemoEditorProps> = React.memo(({
  currentWeapon,
  memoData,
  onSaveMemo,
  onNavigateWeapon,
  onOpenWeaponDrawer,
  canClose,
  onClose,
  weaponIndex,
  totalWeapons,
}) => {
  const [content, setContent] = useState(memoData.content || '');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeWeaponRef = useRef({
    weaponId: currentWeapon.id,
    weaponName: currentWeapon.name,
    content: memoData.content || '',
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

  const flushSaveNow = (targetWeaponId: string, targetWeaponName: string, newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    activeWeaponRef.current.isDirty = false;
    activeWeaponRef.current.content = newContent;
    onSaveMemo(targetWeaponId, {
      content: newContent,
      weaponName: targetWeaponName,
    });
    triggerIndicator();
  };

  // Synchronize when weapon changes
  useEffect(() => {
    const isNewWeapon = activeWeaponRef.current.weaponId !== currentWeapon.id;

    if (isNewWeapon) {
      if (activeWeaponRef.current.isDirty) {
        onSaveMemo(activeWeaponRef.current.weaponId, {
          content: activeWeaponRef.current.content,
          weaponName: activeWeaponRef.current.weaponName,
        });
      }
      setContent(memoData.content || '');
      activeWeaponRef.current = {
        weaponId: currentWeapon.id,
        weaponName: currentWeapon.name,
        content: memoData.content || '',
        isDirty: false,
      };
    } else if (!activeWeaponRef.current.isDirty && memoData.content !== activeWeaponRef.current.content) {
      setContent(memoData.content || '');
      activeWeaponRef.current.content = memoData.content || '';
    }
  }, [currentWeapon.id, currentWeapon.name, memoData.content, onSaveMemo]);

  // Clean-up on unmount and beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeWeaponRef.current.isDirty) {
        onSaveMemo(activeWeaponRef.current.weaponId, {
          content: activeWeaponRef.current.content,
          weaponName: activeWeaponRef.current.weaponName,
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
      if (activeWeaponRef.current.isDirty) {
        onSaveMemo(activeWeaponRef.current.weaponId, {
          content: activeWeaponRef.current.content,
          weaponName: activeWeaponRef.current.weaponName,
        });
      }
    };
  }, [onSaveMemo]);

  // Debounced auto-save (750ms)
  const triggerSave = (newContent: string) => {
    activeWeaponRef.current.content = newContent;
    activeWeaponRef.current.isDirty = true;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const targetWeaponId = currentWeapon.id;
    const targetWeaponName = currentWeapon.name;

    saveTimeoutRef.current = setTimeout(() => {
      activeWeaponRef.current.isDirty = false;
      onSaveMemo(targetWeaponId, {
        content: newContent,
        weaponName: targetWeaponName,
      });
      triggerIndicator();
    }, 750);
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    const prevFilled = isMemoContentFilled(content);
    const nextFilled = isMemoContentFilled(next);
    setContent(next);

    if (prevFilled !== nextFilled) {
      activeWeaponRef.current.content = next;
      activeWeaponRef.current.isDirty = false;
      onSaveMemo(currentWeapon.id, {
        content: next,
        weaponName: currentWeapon.name,
      });
    }

    triggerSave(next);
  };

  const handleBlur = () => {
    if (activeWeaponRef.current.isDirty) {
      flushSaveNow(currentWeapon.id, currentWeapon.name, content);
    }
  };

  // Copy weapon memo to clipboard
  const handleCopy = async () => {
    const fullText = `【武器メモ: ${currentWeapon.name}】\n\n${content}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (e) {
      console.error('Failed to copy to clipboard', e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Top Banner: Weapon Header & Navigation */}
      <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Weapon Name */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center shrink-0">
              <Crosshair className="w-4 h-4" />
            </div>
            <span className="text-base sm:text-xl font-black text-white font-['M_PLUS_Rounded_1c'] tracking-tight">
              {currentWeapon.name}
            </span>
            {totalWeapons > 1 && (
              <span className="text-xs text-slate-400">
                ({weaponIndex + 1}/{totalWeapons})
              </span>
            )}
          </div>

          {/* Stepper Navigation: Prev / Next / Mobile Drawer */}
          <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
            {onOpenWeaponDrawer && (
              <button
                type="button"
                onClick={onOpenWeaponDrawer}
                className="lg:hidden min-h-[44px] px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Crosshair className="w-3.5 h-3.5 text-yellow-400" />
                <span>武器一覧</span>
              </button>
            )}

            {totalWeapons > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateWeapon('prev')}
                  title="前の武器へ"
                  className="min-h-[44px] px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">前へ</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateWeapon('next')}
                  title="次の武器へ"
                  className="min-h-[44px] px-2.5 sm:px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl flex items-center gap-1 transition-colors"
                >
                  <span className="hidden sm:inline">次へ</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {canClose && onClose && (
              <button
                type="button"
                onClick={() => {
                  if (activeWeaponRef.current.isDirty) {
                    onSaveMemo(currentWeapon.id, {
                      content,
                      weaponName: currentWeapon.name,
                    });
                  }
                  onClose();
                }}
                title="このメモを閉じる"
                className="min-h-[44px] min-w-[44px] p-2 bg-slate-800 hover:bg-red-950/70 hover:text-red-400 text-slate-400 border border-slate-700 hover:border-red-800/80 rounded-xl flex items-center justify-center ml-0.5 cursor-pointer transition-colors"
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
            className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-colors"
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
