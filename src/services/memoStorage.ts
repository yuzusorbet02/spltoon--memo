import { MemoData, MemoStore, RuleId, WeaponMemoData, WeaponMemoStore, WeaponInfo } from '../types';
import { STAGE_ID_MIGRATIONS } from '../data/constants';

export const STORAGE_KEY = 'splamemo_memos_v1';
export const WEAPON_STORAGE_KEY = 'splamemo_weapon_memos_v1';
export const CUSTOM_WEAPONS_KEY = 'splamemo_custom_weapons_v1';
export const USER_WEAPONS_KEY = 'splamemo_user_weapons_v1';

export function getMemoKey(ruleId: RuleId, stageId: string): string {
  return `${ruleId}_${stageId}`;
}

let pendingStore: MemoStore | null = null;
let saveScheduled = false;

let pendingWeaponStore: WeaponMemoStore | null = null;
let saveWeaponScheduled = false;

function commitPendingSave(): void {
  if (pendingStore) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingStore));
      pendingStore = null;
    } catch (e) {
      console.error('Failed to save store to localStorage:', e);
    }
  }
}

function commitPendingWeaponSave(): void {
  if (pendingWeaponStore) {
    try {
      localStorage.setItem(WEAPON_STORAGE_KEY, JSON.stringify(pendingWeaponStore));
      pendingWeaponStore = null;
    } catch (e) {
      console.error('Failed to save weapon store to localStorage:', e);
    }
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    commitPendingSave();
    commitPendingWeaponSave();
  });
}

/**
 * Checks whether a memo's content is considered filled.
 * Returns false if content is empty or contains ONLY whitespace (half-width space, full-width space, newlines, tabs, etc.).
 * Returns true only if at least 1 non-whitespace character exists.
 */
export function isMemoContentFilled(content?: string | null): boolean {
  if (!content) return false;
  return content.replace(/[\s\u3000\uFEFF\u200B\u00A0]/g, '').length > 0;
}

/**
 * Migrates existing memo store keys and stage IDs to match the current stage definitions.
 * E.g., 'sumetana' -> 'sumeshi', 'battera' -> 'dekaline'.
 */
export function migrateMemoStore(store: MemoStore): { store: MemoStore; migrated: boolean } {
  let migrated = false;
  const nextStore: MemoStore = {};

  for (const [key, memo] of Object.entries(store)) {
    if (!memo) continue;
    const parts = key.split('_');
    const ruleId = (memo.ruleId || parts[0]) as RuleId;
    const rawStageId = memo.stageId || parts.slice(1).join('_');
    const targetStageId = STAGE_ID_MIGRATIONS[rawStageId] || rawStageId;
    const targetKey = getMemoKey(ruleId, targetStageId);

    if (rawStageId !== targetStageId || key !== targetKey) {
      migrated = true;
      // If targetKey is not yet in nextStore, or current nextStore is empty but memo has content
      if (!nextStore[targetKey] || (!isMemoContentFilled(nextStore[targetKey].content) && isMemoContentFilled(memo.content))) {
        nextStore[targetKey] = {
          ...memo,
          ruleId,
          stageId: targetStageId,
        };
      }
    } else {
      if (!nextStore[targetKey]) {
        nextStore[targetKey] = memo;
      }
    }
  }

  return { store: nextStore, migrated };
}

/**
 * Save the memo store to local storage.
 * Performs non-blocking persistence using requestIdleCallback to avoid blocking the render pipeline.
 * Use immediate = true for operations like data import or before page transitions.
 */
export function saveAllMemos(store: MemoStore, immediate = false): void {
  pendingStore = store;
  if (immediate) {
    commitPendingSave();
    return;
  }

  if (!saveScheduled) {
    saveScheduled = true;
    const scheduleFn = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : setTimeout;
    scheduleFn(() => {
      saveScheduled = false;
      commitPendingSave();
    });
  }
}

/**
 * Load all memos from local storage.
 * On first visit, initializes with an empty store so all stage/rule memos are completely blank.
 * Automatically performs migration if legacy stage IDs are detected, and cleans up legacy sample memos if present.
 */
export function loadAllMemos(): MemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First visit: initialize with an empty store so all stage/rule memos are completely blank
      const initialStore: MemoStore = {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialStore));
      return initialStore;
    }
    const parsed = JSON.parse(raw) as MemoStore;
    const { store: migratedStore, migrated } = migrateMemoStore(parsed);

    // Clean up any remaining legacy sample memos so existing sessions also have them removed
    let samplesRemoved = false;
    const legacySampleKeys = ['zones_yunohana', 'tower_chozame'];
    for (const key of legacySampleKeys) {
      const memo = migratedStore[key];
      if (memo) {
        const isLegacySample =
          (key === 'zones_yunohana' &&
            memo.content?.includes('スプラシューターコラボ (ウルショでの打開・抑え)')) ||
          (key === 'tower_chozame' &&
            memo.content?.includes('左通路から橋下へ。ヤグラ周りの敵に直撃を狙う。'));
        if (isLegacySample) {
          delete migratedStore[key];
          samplesRemoved = true;
        }
      }
    }

    if (migrated || samplesRemoved) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedStore));
      } catch (e) {
        console.error('Failed to save migrated store to localStorage:', e);
      }
    }
    return migratedStore;
  } catch (e) {
    console.error('Failed to load memos from localStorage:', e);
    return {};
  }
}

/**
 * Save an individual memo to local storage
 */
export function saveMemo(memo: MemoData): MemoStore {
  const current = loadAllMemos();
  const key = getMemoKey(memo.ruleId, memo.stageId);
  const updated: MemoStore = {
    ...current,
    [key]: {
      ...memo,
      updatedAt: Date.now(),
    },
  };
  saveAllMemos(updated);
  return updated;
}

/**
 * Delete a specific memo
 */
export function deleteMemo(ruleId: RuleId, stageId: string): MemoStore {
  const current = loadAllMemos();
  const key = getMemoKey(ruleId, stageId);
  const next = { ...current };
  delete next[key];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to delete memo:', e);
  }
  return next;
}

/**
 * Export all memos (both stage-based and weapon-based) to a downloadable formatted JSON string
 */
export function exportMemosJson(): string {
  const stageStore = loadAllMemos();
  const weaponStore = loadAllWeaponMemos();
  const userWeapons = loadUserWeapons();

  const exportPayload = {
    app: 'splamemo',
    version: '1.2',
    exportedAt: new Date().toISOString(),
    totalStageMemos: Object.keys(stageStore).filter(k => isMemoContentFilled(stageStore[k]?.content)).length,
    totalWeaponMemos: Object.keys(weaponStore).filter(k => isMemoContentFilled(weaponStore[k]?.content)).length,
    memos: stageStore,
    weaponMemos: weaponStore,
    userWeapons: userWeapons,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import memos from JSON string, supporting both legacy format and dual stage/weapon format
 */
export function importMemosJson(jsonStr: string): { success: boolean; count: number; weaponCount: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const incomingStageMemos = parsed.memos || (parsed.weaponMemos ? undefined : parsed);
    const incomingWeaponMemos = parsed.weaponMemos;
    const incomingCustomWeapons = parsed.customWeapons;

    let importedStageCount = 0;
    let importedWeaponCount = 0;

    // 1. Process stage memos if present
    if (incomingStageMemos && typeof incomingStageMemos === 'object') {
      const current = loadAllMemos();
      const merged: MemoStore = { ...current };

      for (const [key, val] of Object.entries(incomingStageMemos)) {
        if (val && typeof val === 'object') {
          const memo = val as MemoData;
          const parts = key.split('_');
          const ruleId = (memo.ruleId || parts[0]) as RuleId;
          const rawStageId = memo.stageId || parts.slice(1).join('_');
          const targetStageId = STAGE_ID_MIGRATIONS[rawStageId] || rawStageId;
          const targetKey = getMemoKey(ruleId, targetStageId);

          if (ruleId && targetStageId) {
            merged[targetKey] = {
              ruleId,
              stageId: targetStageId,
              weapon: memo.weapon || '',
              content: memo.content || '',
              updatedAt: memo.updatedAt || Date.now(),
            };
            importedStageCount++;
          }
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    // 2. Process weapon memos if present
    if (incomingWeaponMemos && typeof incomingWeaponMemos === 'object') {
      const currentWeapons = loadAllWeaponMemos();
      const mergedWeapons: WeaponMemoStore = { ...currentWeapons };

      for (const [weaponId, val] of Object.entries(incomingWeaponMemos)) {
        if (val && typeof val === 'object') {
          const wMemo = val as WeaponMemoData;
          mergedWeapons[weaponId] = {
            weaponId: wMemo.weaponId || weaponId,
            weaponName: wMemo.weaponName || weaponId,
            content: wMemo.content || '',
            updatedAt: wMemo.updatedAt || Date.now(),
          };
          importedWeaponCount++;
        }
      }
      localStorage.setItem(WEAPON_STORAGE_KEY, JSON.stringify(mergedWeapons));
    }

    // 3. Process user weapons or custom weapons if present
    const incomingUserWeapons = parsed.userWeapons || parsed.customWeapons;
    if (Array.isArray(incomingUserWeapons)) {
      const existing = loadUserWeapons();
      const existingNames = new Set(existing.map(w => w.name.trim().toLowerCase()));
      const combined = [...existing];
      for (const cw of incomingUserWeapons) {
        if (cw && cw.name && !existingNames.has(cw.name.trim().toLowerCase())) {
          combined.push({
            id: cw.id || `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: cw.name.trim(),
            category: cw.category || 'マイ武器',
            kana: cw.kana || cw.name.trim(),
            isCustom: true,
          });
          existingNames.add(cw.name.trim().toLowerCase());
        }
      }
      saveUserWeapons(combined);
    }

    // Also ensure all weapons with filled memos exist in user weapons
    if (incomingWeaponMemos && typeof incomingWeaponMemos === 'object') {
      const existing = loadUserWeapons();
      const existingNames = new Set(existing.map(w => w.name.trim().toLowerCase()));
      let updated = false;
      const combined = [...existing];
      for (const [wId, val] of Object.entries(incomingWeaponMemos)) {
        if (val && typeof val === 'object') {
          const wMemo = val as WeaponMemoData;
          const wName = (wMemo.weaponName || wId).trim();
          if (wName && !existingNames.has(wName.toLowerCase())) {
            combined.push({
              id: wId,
              name: wName,
              category: 'マイ武器',
              kana: wName,
              isCustom: true,
            });
            existingNames.add(wName.toLowerCase());
            updated = true;
          }
        }
      }
      if (updated) {
        saveUserWeapons(combined);
      }
    }

    return {
      success: true,
      count: importedStageCount,
      weaponCount: importedWeaponCount,
    };
  } catch (e: any) {
    return { success: false, count: 0, weaponCount: 0, error: e?.message || 'JSONの解析に失敗しました。' };
  }
}

/**
 * Load all weapon memos from local storage.
 * Completely separate from stage memos.
 */
export function loadAllWeaponMemos(): WeaponMemoStore {
  try {
    const raw = localStorage.getItem(WEAPON_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as WeaponMemoStore;
  } catch (e) {
    console.error('Failed to load weapon memos:', e);
    return {};
  }
}

/**
 * Save weapon memos to local storage (non-blocking with requestIdleCallback)
 */
export function saveAllWeaponMemos(store: WeaponMemoStore, immediate = false): void {
  pendingWeaponStore = store;
  if (immediate) {
    commitPendingWeaponSave();
    return;
  }

  if (!saveWeaponScheduled) {
    saveWeaponScheduled = true;
    const scheduleFn = typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : setTimeout;
    scheduleFn(() => {
      saveWeaponScheduled = false;
      commitPendingWeaponSave();
    });
  }
}

/**
 * Save an individual weapon memo
 */
export function saveWeaponMemo(memo: WeaponMemoData): WeaponMemoStore {
  const current = loadAllWeaponMemos();
  const updated: WeaponMemoStore = {
    ...current,
    [memo.weaponId]: {
      ...memo,
      updatedAt: Date.now(),
    },
  };
  saveAllWeaponMemos(updated);
  return updated;
}

/**
 * Delete a specific weapon memo
 */
export function deleteWeaponMemo(weaponId: string): WeaponMemoStore {
  const current = loadAllWeaponMemos();
  const next = { ...current };
  delete next[weaponId];
  try {
    localStorage.setItem(WEAPON_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('Failed to delete weapon memo:', e);
  }
  return next;
}

/**
 * Load user weapons.
 * If user hasn't added any yet, migrates any weapons that already have memos in weaponStore or were in CUSTOM_WEAPONS_KEY.
 */
export function loadUserWeapons(): WeaponInfo[] {
  try {
    const raw = localStorage.getItem(USER_WEAPONS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load user weapons:', e);
  }

  // Fallback: check custom weapons and weaponStore to preserve existing weapon memos
  const list: WeaponInfo[] = [];
  const existingCustom = loadCustomWeapons();
  for (const w of existingCustom) {
    if (!list.some(item => item.name.toLowerCase() === w.name.toLowerCase())) {
      list.push(w);
    }
  }

  const existingMemos = loadAllWeaponMemos();
  for (const [wId, memo] of Object.entries(existingMemos)) {
    if (memo && isMemoContentFilled(memo.content)) {
      const name = memo.weaponName || wId;
      if (!list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        list.push({
          id: wId,
          name: name,
          category: 'マイ武器',
          kana: name,
          isCustom: true,
        });
      }
    }
  }

  if (list.length > 0) {
    saveUserWeapons(list);
  }

  return list;
}

/**
 * Save user weapons list
 */
export function saveUserWeapons(weapons: WeaponInfo[]): void {
  try {
    localStorage.setItem(USER_WEAPONS_KEY, JSON.stringify(weapons));
  } catch (e) {
    console.error('Failed to save user weapons:', e);
  }
}

/**
 * Add a new user weapon with validation (empty check & duplicate check)
 */
export function addUserWeapon(name: string): { success: boolean; weapon?: WeaponInfo; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { success: false, error: '武器名を入力してください。' };
  }

  const current = loadUserWeapons();
  const lower = trimmed.toLowerCase();
  const isDuplicate = current.some(w => w.name.trim().toLowerCase() === lower);
  if (isDuplicate) {
    return { success: false, error: `「${trimmed}」はすでに登録されています。` };
  }

  const newWeapon: WeaponInfo = {
    id: `w_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: trimmed,
    category: 'マイ武器',
    kana: trimmed,
    isCustom: true,
  };

  const updated = [...current, newWeapon];
  saveUserWeapons(updated);
  return { success: true, weapon: newWeapon };
}

/**
 * Delete a user weapon and completely purge its saved memo data and legacy custom entries
 */
export function deleteUserWeapon(weaponId: string): WeaponInfo[] {
  const current = loadUserWeapons();
  const updated = current.filter(w => w.id !== weaponId);
  saveUserWeapons(updated);
  deleteWeaponMemo(weaponId);
  deleteCustomWeapon(weaponId);
  return updated;
}

/**
 * Load custom user-added weapons (legacy compatibility)
 */
export function loadCustomWeapons(): WeaponInfo[] {
  try {
    const raw = localStorage.getItem(CUSTOM_WEAPONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WeaponInfo[];
  } catch (e) {
    console.error('Failed to load custom weapons:', e);
    return [];
  }
}

/**
 * Save a custom weapon (legacy compatibility)
 */
export function saveCustomWeapon(weapon: WeaponInfo): WeaponInfo[] {
  const current = loadCustomWeapons();
  const filtered = current.filter(w => w.id !== weapon.id);
  const updated = [...filtered, { ...weapon, isCustom: true }];
  try {
    localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save custom weapon:', e);
  }
  return updated;
}

/**
 * Delete a custom weapon (legacy compatibility)
 */
export function deleteCustomWeapon(weaponId: string): WeaponInfo[] {
  const current = loadCustomWeapons();
  const updated = current.filter(w => w.id !== weaponId);
  try {
    localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to delete custom weapon:', e);
  }
  return updated;
}

/**
 * Clear all memos (both stage and weapon stores)
 */
export function clearAllMemos(): { stageStore: MemoStore; weaponStore: WeaponMemoStore } {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(WEAPON_STORAGE_KEY);
  return { stageStore: {}, weaponStore: {} };
}


