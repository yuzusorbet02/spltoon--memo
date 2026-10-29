/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useCallback } from 'react';
import { RuleId, MemoData, MemoStore, ViewMode, WeaponMemoData, WeaponMemoStore, WeaponInfo } from './types';
import { RULES, STAGES, STAGE_ID_MIGRATIONS } from './data/constants';
import {
  loadAllMemos,
  saveAllMemos,
  getMemoKey,
  isMemoContentFilled,
  loadAllWeaponMemos,
  saveAllWeaponMemos,
  loadUserWeapons,
  addUserWeapon,
  deleteUserWeapon,
} from './services/memoStorage';
import { Header } from './components/Header';
import { RuleSelector } from './components/RuleSelector';
import { StageSelector } from './components/StageSelector';
import { MemoEditor } from './components/MemoEditor';
import { WeaponSelector } from './components/WeaponSelector';
import { WeaponMemoEditor } from './components/WeaponMemoEditor';
import { DataModal } from './components/DataModal';
import { HelpModal } from './components/HelpModal';
import { MapPin, Crosshair } from 'lucide-react';

export default function App() {
  // Top-level View Mode: 'stage' (stage-based memos) | 'weapon' (weapon-specific)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('splamemo_view_mode');
      if (saved === 'stage' || saved === 'weapon') {
        return saved;
      }
    } catch (e) {}
    return 'stage';
  });

  const handleSelectViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('splamemo_view_mode', mode);
    } catch (e) {}
  }, []);

  // Currently selected Rule
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

    try {
      let last = localStorage.getItem('splamemo_last_stage');
      if (last && STAGE_ID_MIGRATIONS[last]) last = STAGE_ID_MIGRATIONS[last];
      if (last && STAGES.some((s) => s.id === last)) {
        return [last];
      }
    } catch (e) {}
    return ['yunohana'];
  });

  // Keep stage memos in ref
  const memosRef = useRef<MemoStore>(loadAllMemos());
  const [stagePresenceVersion, setStagePresenceVersion] = useState(0);

  // --- WEAPON MEMO STATE ---
  const weaponStoreRef = useRef<WeaponMemoStore>(loadAllWeaponMemos());
  const [weaponPresenceVersion, setWeaponPresenceVersion] = useState(0);
  const [userWeapons, setUserWeapons] = useState<WeaponInfo[]>(() => loadUserWeapons());

  const [selectedWeaponId, setSelectedWeaponId] = useState<string>(() => {
    const weapons = loadUserWeapons();
    try {
      const saved = localStorage.getItem('splamemo_last_weapon');
      if (saved === '') return '';
      if (saved && weapons.some((w) => w.id === saved)) {
        return saved;
      }
    } catch (e) {}
    return weapons.length > 0 ? weapons[0].id : '';
  });

  // Mobile Drawers
  const [mobileStageDrawerOpen, setMobileStageDrawerOpen] = useState(false);
  const [mobileWeaponDrawerOpen, setMobileWeaponDrawerOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);

  // --- STAGE SELECTION HANDLERS ---
  const handleSelectRule = useCallback((ruleId: RuleId) => {
    setSelectedRuleId(ruleId);
    try {
      localStorage.setItem('splamemo_last_rule', ruleId);
    } catch (e) {}
  }, []);

  const handleSelectStage = useCallback((stageId: string) => {
    setOpenStageIds((current) => {
      let next: string[];
      if (current.includes(stageId)) {
        next = current.filter((id) => id !== stageId);
      } else if (current.length < 2) {
        next = [...current, stageId];
      } else {
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

  // --- WEAPON HANDLERS ---
  const handleSelectWeapon = useCallback((weaponId: string) => {
    setSelectedWeaponId((current) => {
      const next = current === weaponId ? '' : weaponId;
      try {
        localStorage.setItem('splamemo_last_weapon', next);
      } catch (e) {}
      return next;
    });
  }, []);

  const handleAddWeapon = useCallback((name: string) => {
    const res = addUserWeapon(name);
    if (res.success && res.weapon) {
      const updated = loadUserWeapons();
      setUserWeapons(updated);
      setSelectedWeaponId(res.weapon.id);
      try {
        localStorage.setItem('splamemo_last_weapon', res.weapon.id);
      } catch (e) {}
    }
    return res;
  }, []);

  const handleDeleteWeapon = useCallback((weaponId: string) => {
    const updated = deleteUserWeapon(weaponId);
    setUserWeapons(updated);
    if (weaponStoreRef.current[weaponId]) {
      delete weaponStoreRef.current[weaponId];
      saveAllWeaponMemos(weaponStoreRef.current, true);
      setWeaponPresenceVersion((v) => v + 1);
    }
    if (selectedWeaponId === weaponId) {
      setSelectedWeaponId('');
      try {
        localStorage.setItem('splamemo_last_weapon', '');
      } catch (e) {}
    }
  }, [selectedWeaponId]);

  const handleNavigateWeapon = useCallback(
    (direction: 'prev' | 'next') => {
      if (userWeapons.length === 0) return;
      const currentIndex = userWeapons.findIndex((w) => w.id === selectedWeaponId);
      if (currentIndex === -1) {
        setSelectedWeaponId(userWeapons[0].id);
        try {
          localStorage.setItem('splamemo_last_weapon', userWeapons[0].id);
        } catch (e) {}
        return;
      }
      let nextIndex = currentIndex;
      if (direction === 'next') {
        nextIndex = (currentIndex + 1) % userWeapons.length;
      } else {
        nextIndex = (currentIndex - 1 + userWeapons.length) % userWeapons.length;
      }
      const nextId = userWeapons[nextIndex].id;
      setSelectedWeaponId(nextId);
      try {
        localStorage.setItem('splamemo_last_weapon', nextId);
      } catch (e) {}
    },
    [userWeapons, selectedWeaponId]
  );

  const handleSaveWeaponMemo = useCallback(
    (weaponId: string, updated: { content: string; weaponName: string }) => {
      const existing = weaponStoreRef.current[weaponId];
      const hadMemo = isMemoContentFilled(existing?.content);
      const nowHasMemo = isMemoContentFilled(updated.content);

      weaponStoreRef.current[weaponId] = {
        weaponId,
        weaponName: updated.weaponName,
        content: updated.content,
        updatedAt: Date.now(),
      };
      saveAllWeaponMemos(weaponStoreRef.current);

      if (hadMemo !== nowHasMemo) {
        setWeaponPresenceVersion((v) => v + 1);
      }
    },
    []
  );

  // --- MODALS & RESTORE ---
  const handleOpenDataModal = useCallback(() => setDataModalOpen(true), []);
  const handleCloseDataModal = useCallback(() => setDataModalOpen(false), []);
  const handleOpenHelpModal = useCallback(() => setHelpModalOpen(true), []);
  const handleCloseHelpModal = useCallback(() => setHelpModalOpen(false), []);

  const handleDataUpdated = useCallback(
    (updatedStageStore: MemoStore, updatedWeaponStore?: WeaponMemoStore) => {
      memosRef.current = updatedStageStore;
      saveAllMemos(updatedStageStore, true);
      setStagePresenceVersion((v) => v + 1);

      if (updatedWeaponStore) {
        weaponStoreRef.current = updatedWeaponStore;
        saveAllWeaponMemos(updatedWeaponStore, true);
        setWeaponPresenceVersion((v) => v + 1);
      }
      const weapons = loadUserWeapons();
      setUserWeapons(weapons);
      if (weapons.length > 0 && !weapons.some((w) => w.id === selectedWeaponId)) {
        setSelectedWeaponId(weapons[0].id);
      }
    },
    [selectedWeaponId]
  );

  // Current stage rule and helpers
  const currentRule = useMemo(() => {
    return RULES.find((r) => r.id === selectedRuleId) || RULES[0];
  }, [selectedRuleId]);

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
    [stagePresenceVersion]
  );

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
  }, [selectedRuleId, stagePresenceVersion]);

  const hasMemoWeaponSet = useMemo(() => {
    const set = new Set<string>();
    for (const [wId, memo] of Object.entries(weaponStoreRef.current)) {
      if (memo && isMemoContentFilled(memo.content)) {
        set.add(wId);
      }
    }
    return set;
  }, [weaponPresenceVersion]);

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

      if (hadMemo !== nowHasMemo) {
        setStagePresenceVersion((v) => v + 1);
      }
    },
    []
  );

  const primaryStageName = useMemo(() => {
    return openStageIds
      .map((id) => STAGES.find((s) => s.id === id)?.name || id)
      .join(' / ');
  }, [openStageIds]);

  // Current weapon memo data
  const currentWeapon = useMemo(() => {
    if (!selectedWeaponId) return null;
    return userWeapons.find((w) => w.id === selectedWeaponId) || null;
  }, [userWeapons, selectedWeaponId]);

  const currentWeaponIndex = useMemo(() => {
    if (!currentWeapon) return 0;
    const idx = userWeapons.findIndex((w) => w.id === currentWeapon.id);
    return idx >= 0 ? idx : 0;
  }, [userWeapons, currentWeapon]);

  const currentWeaponMemoData = useMemo((): WeaponMemoData => {
    if (!currentWeapon) {
      return {
        weaponId: '',
        weaponName: '',
        content: '',
        updatedAt: Date.now(),
      };
    }
    const memo = weaponStoreRef.current[currentWeapon.id];
    return (
      memo || {
        weaponId: currentWeapon.id,
        weaponName: currentWeapon.name,
        content: '',
        updatedAt: Date.now(),
      }
    );
  }, [currentWeapon, weaponPresenceVersion]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-yellow-400 selection:text-slate-950 pb-16 lg:pb-8">
      {/* Top Application Bar */}
      <Header
        onOpenDataModal={handleOpenDataModal}
        onOpenHelpModal={handleOpenHelpModal}
      />

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col space-y-4 sm:space-y-6">
        {/* Mode Switcher: Stage Memos vs Weapon Memos */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-1.5 sm:p-2 rounded-2xl">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => handleSelectViewMode('stage')}
              className={`flex-1 min-h-[42px] px-3 sm:px-4 py-2 rounded-xl font-['M_PLUS_Rounded_1c'] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                viewMode === 'stage'
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/10 font-black'
                  : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>ステージ別メモ</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectViewMode('weapon')}
              className={`flex-1 min-h-[42px] px-3 sm:px-4 py-2 rounded-xl font-['M_PLUS_Rounded_1c'] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                viewMode === 'weapon'
                  ? 'bg-yellow-400 text-slate-950 shadow-md shadow-yellow-400/10 font-black'
                  : 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Crosshair className="w-4 h-4 shrink-0" />
              <span>武器別メモ</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW MODE 1: STAGE-BASED MEMOS                           */}
        {/* ======================================================== */}
        {viewMode === 'stage' && (
          <>
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
                type="button"
                onClick={() => setMobileStageDrawerOpen(true)}
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
                type="button"
                onClick={() => setMobileStageDrawerOpen(true)}
                className="min-h-[40px] px-3 py-1.5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl shrink-0"
              >
                ステージ変更
              </button>
            </div>

            {/* Two-Column Responsive Layout: Stage Button Grid + Memo Editor(s) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
              {/* Desktop Left Sidebar: Compact Stage Buttons */}
              <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20">
                <StageSelector
                  selectedRuleId={selectedRuleId}
                  openStageIds={openStageIds}
                  onSelectStage={handleSelectStage}
                  onCloseStage={handleCloseStage}
                  hasMemoStageSet={hasMemoStageSet}
                />
              </aside>

              {/* Desktop & Mobile Main Column: 1 or 2 Memo Editors */}
              <section className="lg:col-span-7 xl:col-span-8 flex-1 w-full space-y-4">
                {openStageIds.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[420px]">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mb-4">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-['M_PLUS_Rounded_1c'] mb-2">
                      ステージが選択されていません
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
                      ステージを選択すると、ルールごとの初動や立ち回りメモを記録・編集できます。最大2つまで同時に開いて見比べることができます。
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleSelectStage(STAGES[0].id)}
                        className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl font-['M_PLUS_Rounded_1c'] transition-colors"
                      >
                        {STAGES[0].name} を開く
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobileStageDrawerOpen(true)}
                        className="lg:hidden px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl font-['M_PLUS_Rounded_1c'] transition-colors"
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
                          onOpenStageDrawer={() => setMobileStageDrawerOpen(true)}
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
          </>
        )}

        {/* ======================================================== */}
        {/* VIEW MODE 2: WEAPON-BASED MEMOS                          */}
        {/* ======================================================== */}
        {viewMode === 'weapon' && (
          <>
            {/* Mobile Weapon Selector Trigger Banner (Visible on mobile/tablet) */}
            <div className="lg:hidden flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
              <button
                type="button"
                onClick={() => setMobileWeaponDrawerOpen(true)}
                className="flex-1 flex items-center gap-2.5 text-left min-h-[44px] px-2 truncate"
              >
                <div className="w-8 h-8 rounded-lg bg-yellow-400/10 text-yellow-400 flex items-center justify-center shrink-0">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <div className="text-[11px] text-slate-400">
                    武器の選択 ({userWeapons.length})
                  </div>
                  <div className="text-sm font-bold text-white font-['M_PLUS_Rounded_1c'] truncate">
                    {currentWeapon ? currentWeapon.name : (userWeapons.length > 0 ? '武器を選択してください' : '武器を追加してください')}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMobileWeaponDrawerOpen(true)}
                className="min-h-[40px] px-3 py-1.5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl shrink-0"
              >
                武器選択
              </button>
            </div>

            {/* Two-Column Responsive Layout: Weapon Selector + Weapon Memo Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
              {/* Desktop Left Sidebar: Weapon Selector */}
              <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20">
                <WeaponSelector
                  weapons={userWeapons}
                  selectedWeaponId={selectedWeaponId}
                  onSelectWeapon={handleSelectWeapon}
                  onAddWeapon={handleAddWeapon}
                  onDeleteWeapon={handleDeleteWeapon}
                  hasMemoWeaponSet={hasMemoWeaponSet}
                />
              </aside>

              {/* Right Main Column: Weapon Memo Editor */}
              <section className="lg:col-span-7 xl:col-span-8 flex-1 w-full space-y-4">
                {currentWeapon ? (
                  <WeaponMemoEditor
                    currentWeapon={currentWeapon}
                    memoData={currentWeaponMemoData}
                    onSaveMemo={handleSaveWeaponMemo}
                    onNavigateWeapon={handleNavigateWeapon}
                    onOpenWeaponDrawer={() => setMobileWeaponDrawerOpen(true)}
                    canClose={true}
                    onClose={() => handleSelectWeapon(currentWeapon.id)}
                    weaponIndex={currentWeaponIndex}
                    totalWeapons={userWeapons.length}
                  />
                ) : userWeapons.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[420px]">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mb-4">
                      <Crosshair className="w-7 h-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-['M_PLUS_Rounded_1c'] mb-2">
                      武器がまだ登録されていません
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
                      「武器選択」の入力欄から使いたい武器名を追加すると、専用のメモを作成・自動保存できます。
                    </p>
                    <button
                      type="button"
                      onClick={() => setMobileWeaponDrawerOpen(true)}
                      className="lg:hidden px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl font-['M_PLUS_Rounded_1c'] transition-colors"
                    >
                      武器を追加する
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center min-h-[420px]">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center mb-4">
                      <Crosshair className="w-7 h-7" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-['M_PLUS_Rounded_1c'] mb-2">
                      武器が選択されていません
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
                      左側の武器一覧から武器を選択すると、メモの記録・編集ができます。
                    </p>
                    <button
                      type="button"
                      onClick={() => setMobileWeaponDrawerOpen(true)}
                      className="lg:hidden px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl font-['M_PLUS_Rounded_1c'] transition-colors"
                    >
                      武器一覧から選ぶ
                    </button>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </main>

      {/* Mobile Drawer / Bottom Sheet for 25 Stages Selection */}
      {mobileStageDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/80 p-0 sm:p-4"
          onClick={() => setMobileStageDrawerOpen(false)}
        >
          <div
            className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />
            <div className="flex-1 overflow-hidden p-2">
              <StageSelector
                selectedRuleId={selectedRuleId}
                openStageIds={openStageIds}
                onSelectStage={handleSelectStage}
                onCloseStage={handleCloseStage}
                hasMemoStageSet={hasMemoStageSet}
                onCloseMobileDrawer={() => setMobileStageDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer / Bottom Sheet for Weapon Selection */}
      {mobileWeaponDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/80 p-0 sm:p-4"
          onClick={() => setMobileWeaponDrawerOpen(false)}
        >
          <div
            className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[85vh] h-[80vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />
            <div className="flex-1 overflow-hidden p-2">
              <WeaponSelector
                weapons={userWeapons}
                selectedWeaponId={selectedWeaponId}
                onSelectWeapon={(id) => {
                  handleSelectWeapon(id);
                }}
                onAddWeapon={handleAddWeapon}
                onDeleteWeapon={handleDeleteWeapon}
                hasMemoWeaponSet={hasMemoWeaponSet}
                onCloseMobileDrawer={() => setMobileWeaponDrawerOpen(false)}
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
