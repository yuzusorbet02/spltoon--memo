import { MemoData, MemoStore, RuleId } from '../types';
import { STAGE_ID_MIGRATIONS } from '../data/constants';

export const STORAGE_KEY = 'splamemo_memos_v1';

export function getMemoKey(ruleId: RuleId, stageId: string): string {
  return `${ruleId}_${stageId}`;
}

let pendingStore: MemoStore | null = null;
let saveScheduled = false;

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

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', commitPendingSave);
}

/**
 * Checks whether a memo's content is considered filled (記入済み).
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
 * Export all memos to a downloadable formatted JSON string
 */
export function exportMemosJson(): string {
  const store = loadAllMemos();
  const exportPayload = {
    app: 'splamemo',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    totalMemos: Object.keys(store).filter(k => isMemoContentFilled(store[k]?.content)).length,
    memos: store,
  };
  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Import memos from JSON string
 */
export function importMemosJson(jsonStr: string): { success: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const incomingMemos = parsed.memos || parsed;
    if (typeof incomingMemos !== 'object' || incomingMemos === null) {
      return { success: false, count: 0, error: '不正なデータ形式です。' };
    }

    const current = loadAllMemos();
    let importedCount = 0;

    const merged: MemoStore = { ...current };
    for (const [key, val] of Object.entries(incomingMemos)) {
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
          importedCount++;
        }
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return { success: true, count: importedCount };
  } catch (e: any) {
    return { success: false, count: 0, error: e?.message || 'JSONの解析に失敗しました。' };
  }
}

/**
 * Clear all memos
 */
export function clearAllMemos(): MemoStore {
  localStorage.removeItem(STORAGE_KEY);
  return {};
}


