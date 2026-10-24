/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { RuleId, MemoData, MemoStore } from './types';
import { RULES, STAGES, STAGE_ID_MIGRATIONS } from './data/constants';
import {
  loadAllMemos,
  saveAllMemos,
  getMemoKey,
  isMemoContentFilled,
} from './services/memoStorage';
import { Header } from './components/Header';
import { RuleSelector } from './components/RuleSelector';
import { StageSelector } from './components/StageSelector';
import { MemoEditor } from './components/MemoEditor';
import { DataModal } from './components/DataModal';
import { HelpModal } from './components/HelpModal';
import { MapPin } from 'lucide-react';

export default function App() {
  const [selectedRuleId, setSelectedRuleId] = useState<RuleId>(() => {
    try {
      const saved = localStorage.getItem('splamemo_last_rule');
      if (saved && RULES.some((r) => r.id === saved)) {
        return saved as RuleId;
      }
    } catch (e) {}
    return 'zones';
  });

  // Up to 2 open stages simultaneously
  const [openStageIds, setOpenStageIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('splamemo_open_stages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed
            .map((id: string) => STAGE_ID_MIGRATIONS[id] || id)
            .filter((id: string) => STAGES.some((s) => s.id === id));
          return valid.slice(0, 2);
        }
      }
    } catch (e) {}

    // Fallback to splamemo_last_stage or 'yunohana'
    try {
      let last = localStorage.getItem('splamemo_last_stage');
      if (last && STAGE_ID_MIGRATIONS[last]) last = STAGE_ID_MIGRATIONS[last];
      if (last && STAGES.some((s) => s.id === last)) {
        return [last];
      }
    } catch (e) {}
    return ['yunohana'];
  });

  // Keep full 125 memos in ref to avoid full app tree reconciliation during typing and saves
  const memosRef = useRef<MemoStore>(loadAllMemos());
  // Lightweight version tracker that only bumps when a slot's presence (empty <-> filled) changes
  const [presenceVersion, setPresenceVersion] = useState(0);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // Selection handlers that also remember the user's last visited view
  const handleSelectRule = useCallback((ruleId: RuleId) => {
    setSelectedRuleId(ruleId);
    try {
      localStorage.setItem('splamemo_last_rule', ruleId);
    } catch (e) {}
  }, []);

  // Stage selection with toggle-to-close and FIFO roll-over (max 2 memos)
  const handleSelectStage = useCallback((stageId: string) => {
    setOpenStageIds((current) => {
      let next: string[];
      if (current.includes(stageId)) {
        // Toggle close: clicking an open stage closes it
        next = current.filter((id) => id !== stageId);
      } else if (current.length < 2) {
        // 0 or 1 memo open -> append as next memo
        next = [...current, stageId];
      } else {
        // 2 memos already open -> FIFO shift: evict oldest (pos 0), shift pos 1 to pos 0, new to pos 1
        next = [current[1], stageId];
      }

      try {
        localStorage.setItem('splamemo_open_stages', JSON.stringify(next));
        if (next.length > 0) {
          localStorage.setItem('splamemo_last_stage', next[next.length - 1]);
        }
      } catch (e) {}
      return next;
    });
  }, []);

  const handleCloseStage = useCallback((stageIdToClose: string) => {
    setOpenStageIds((current) => {
      const next = current.filter((id) => id !== stageIdToClose);
      try {
        localStorage.setItem('splamemo_open_stages', JSON.stringify(next));
        if (next.length > 0) {
          localStorage.setItem('splamemo_last_stage', next[0]);
        }
      } catch (e) {}
      return next;
    });
  }, []);

  // Stage stepper navigation per pane (Prev / Next stage, skipping the other open stage)
  const handleNavigatePaneStage = useCallback(
    (currentPaneStageId: string, direction: 'prev' | 'next') => {
      const currentIndex = STAGES.findIndex((s) => s.id === currentPaneStageId);
      if (currentIndex === -1) return;

      const otherOpenStageId = openStageIds.find((id) => id !== currentPaneStageId);
      let nextIndex = currentIndex;
      for (let step = 1; step < STAGES.length; step++) {
        if (direction === 'next') {
          nextIndex = (currentIndex + step) % STAGES.length;
        } else {
          nextIndex = (currentIndex - step + STAGES.length) % STAGES.length;
        }
        const candidateId = STAGES[nextIndex].id;
        if (candidateId !== otherOpenStageId) {
          setOpenStageIds((current) => {
            const updated = current.map((id) => (id === currentPaneStageId ? candidateId : id));
            try {
              localStorage.setItem('splamemo_open_stages', JSON.stringify(updated));
              localStorage.setItem('splamemo_last_stage', candidateId);
            } catch (e) {}
            return updated;
          });
          break;
        }
      }
    },
    [openStageIds]
  );

  // Stable modal and drawer toggles
  const handleOpenDataModal = useCallback(() => setDataModalOpen(true), []);
  const handleCloseDataModal = useCallback(() => setDataModalOpen(false), []);
  const handleOpenHelpModal = useCallback(() => setHelpModalOpen(true), []);
  const handleCloseHelpModal = useCallback(() => setHelpModalOpen(false), []);
  const handleOpenMobileDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const handleCloseMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  const handleDataUpdated = useCallback((updatedStore: MemoStore) => {
    memosRef.current = updatedStore;
    saveAllMemos(updatedStore, true);
    setPresenceVersion((v) => v + 1);
  }, []);

  // Current rule object
  const currentRule = useMemo(() => {
    return RULES.find((r) => r.id === selectedRuleId) || RULES[0];
  }, [selectedRuleId]);

  // Retrieve memo data for a specific rule & stage slot
  const getMemoDataForSlot = useCallback(
    (ruleId: RuleId, stageId: string): MemoData => {
      const key = getMemoKey(ruleId, stageId);
      return (
        memosRef.current[key] || {
          ruleId,
          stageId,
          content: '',
          weapon: '',
          updatedAt: Date.now(),
        }
      );
    },
    [presenceVersion]
  );

  // Memo presence set for the currently selected rule (only recomputes when rule changes or presence changes)
  const hasMemoStageSet = useMemo(() => {
    const set = new Set<string>();
    for (const stage of STAGES) {
      const key = getMemoKey(selectedRuleId, stage.id);
      const memo = memosRef.current[key];
      if (memo && isMemoContentFilled(memo.content)) {
        set.add(stage.id);
      }
    }
    return set;
  }, [selectedRuleId, presenceVersion]);

  // Save memo handler targeting explicit ruleId and stageId
  const handleSaveMemo = useCallback(
    (ruleId: RuleId, stageId: string, updated: { content?: string; weapon?: string }) => {
      const key = getMemoKey(ruleId, stageId);
      const existing = memosRef.current[key];
      const hadMemo = isMemoContentFilled(existing?.content);

      const nextContent = updated.content !== undefined ? updated.content : (existing?.content ?? '');
      const nextWeapon = updated.weapon !== undefined ? updated.weapon : (existing?.weapon ?? '');
      const nowHasMemo = isMemoContentFilled(nextContent);

      const nextMemo: MemoData = {
        ruleId,
        stageId,
        content: nextContent,
        weapon: nextWeapon,
        updatedAt: Date.now(),
      };

      memosRef.current[key] = nextMemo;
      saveAllMemos(memosRef.current);

      // ONLY trigger React re-render if the presence status changed (empty/whitespace <-> filled)
      if (hadMemo !== nowHasMemo) {
        setPresenceVersion((v) => v + 1);
      }
    },
    []
  );

  const primaryStageName = useMemo(() => {
    return openStageIds
      .map((id) => STAGES.find((s) => s.id === id)?.name || id)
      .join(' / ');
  }, [openStageIds]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-yellow-400 selection:text-slate-950 pb-16 lg:pb-8">
      {/* Top Application Bar */}
      <Header
        onOpenDataModal={handleOpenDataModal}
        onOpenHelpModal={handleOpenHelpModal}
      />

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col space-y-4 sm:space-y-6">
        {/* Rule Selector (Primary 5 Game Rules) */}
        <section className="bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-2xl">
          <RuleSelector
            selectedRuleId={selectedRuleId}
            onSelectRule={handleSelectRule}
          />
        </section>

        {/* Mobile Stage Selector Trigger Banner (Visible on mobile/tablet) */}
        <div className="lg:hidden flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
          <button
            onClick={handleOpenMobileDrawer}
            className="flex-1 flex items-center gap-2.5 text-left min-h-[44px] px-2 truncate"
          >
            <div className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-[11px] text-slate-400">
                表示中のメモ ({openStageIds.length}/2)
              </div>
              <div className="text-sm font-bold text-white font-['M_PLUS_Rounded_1c'] truncate">
                {primaryStageName || 'ステージを選択'}
              </div>
            </div>
          </button>

          <button
            onClick={handleOpenMobileDrawer}
            className="min-h-[40px] px-3 py-1.5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl shrink-0"
          >
            ステージ変更
          </button>
        </div>

        {/* Two-Column Responsive Layout: Stage List + Memo Editor(s) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
          {/* Desktop Left Sidebar: 25 Stages List */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20">
            <StageSelector
              selectedRuleId={selectedRuleId}
              openStageIds={openStageIds}
              onSelectStage={handleSelectStage}
              onCloseStage={handleCloseStage}
              hasMemoStageSet={hasMemoStageSet}
            />
          </aside>

          {/* Right Main Column: Memo Editor Workspace */}
          <section className="lg:col-span-8 flex-1 w-full space-y-4">
            {openStageIds.length === 0 ? (
              <div className="p-8 sm:p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
                  <MapPin className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-slate-200 font-bold mb-1.5 font-['M_PLUS_Rounded_1c']">開いているメモがありません</p>
                <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                  ステージ一覧からステージを選択すると、メモが表示されます。最大2つまで同時に開いて並べて確認・編集できます。
                </p>
                <div className="mt-5 lg:hidden flex justify-center">
                  <button
                    onClick={handleOpenMobileDrawer}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl font-['M_PLUS_Rounded_1c'] transition-colors"
                  >
                    ステージ一覧から選ぶ
                  </button>
                </div>
              </div>
            ) : (
              <div className={`grid grid-cols-1 ${openStageIds.length === 2 ? 'xl:grid-cols-2' : ''} gap-5`}>
                {openStageIds.map((stageId, idx) => {
                  const stageObj = STAGES.find((s) => s.id === stageId) || STAGES[0];
                  const memoData = getMemoDataForSlot(selectedRuleId, stageId);
                  return (
                    <MemoEditor
                      key={`${selectedRuleId}_${stageId}`}
                      currentRule={currentRule}
                      currentStage={stageObj}
                      memoData={memoData}
                      onSaveMemo={handleSaveMemo}
                      onNavigateStage={(dir) => handleNavigatePaneStage(stageId, dir)}
                      onOpenStageDrawer={handleOpenMobileDrawer}
                      canClose={true}
                      onClose={() => handleCloseStage(stageId)}
                      paneIndex={openStageIds.length > 1 ? idx + 1 : undefined}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Mobile Drawer / Bottom Sheet for 25 Stages Selection */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/80 p-0 sm:p-4"
          onClick={handleCloseMobileDrawer}
        >
          <div
            className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab handle indicator */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />
            <div className="flex-1 overflow-hidden p-2">
              <StageSelector
                selectedRuleId={selectedRuleId}
                openStageIds={openStageIds}
                onSelectStage={handleSelectStage}
                onCloseStage={handleCloseStage}
                hasMemoStageSet={hasMemoStageSet}
                onCloseMobileDrawer={handleCloseMobileDrawer}
              />
            </div>
          </div>
        </div>
      )}

      {/* Data Management / Backup Modal */}
      <DataModal
        isOpen={dataModalOpen}
        onClose={handleCloseDataModal}
        onDataUpdated={handleDataUpdated}
      />

      {/* Quick Help Modal */}
      <HelpModal
        isOpen={helpModalOpen}
        onClose={handleCloseHelpModal}
      />
    </div>
  );
}
