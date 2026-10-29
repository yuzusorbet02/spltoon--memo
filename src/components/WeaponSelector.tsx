import React, { useState, useMemo } from 'react';
import { WeaponInfo } from '../types';
import { Search, X, Plus, Trash2 } from 'lucide-react';

interface WeaponSelectorProps {
  weapons: WeaponInfo[];
  selectedWeaponId: string;
  onSelectWeapon: (weaponId: string) => void;
  onAddWeapon: (name: string) => { success: boolean; weapon?: WeaponInfo; error?: string };
  onDeleteWeapon?: (weaponId: string) => void;
  hasMemoWeaponSet: Set<string>;
  onCloseMobileDrawer?: () => void;
}

export const WeaponSelector: React.FC<WeaponSelectorProps> = React.memo(({
  weapons,
  selectedWeaponId,
  onSelectWeapon,
  onAddWeapon,
  onDeleteWeapon,
  hasMemoWeaponSet,
  onCloseMobileDrawer,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newWeaponName, setNewWeaponName] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [weaponToDelete, setWeaponToDelete] = useState<WeaponInfo | null>(null);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newWeaponName.trim();
    if (!trimmed) {
      setErrorNotice('武器名を入力してください');
      return;
    }

    const res = onAddWeapon(trimmed);
    if (res.success && res.weapon) {
      setNewWeaponName('');
      setErrorNotice(null);
      setIsAdding(false);
      onSelectWeapon(res.weapon.id);
    } else {
      setErrorNotice(res.error || '登録に失敗しました');
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewWeaponName('');
    setErrorNotice(null);
  };

  const filteredWeapons = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return weapons;
    return weapons.filter((w) => {
      return (
        w.name.toLowerCase().includes(q) ||
        (w.kana && w.kana.includes(q))
      );
    });
  }, [weapons, searchQuery]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg relative h-full max-h-full">
      {/* Header & Compact Weapon Addition Bar */}
      <div className="p-3 sm:p-3.5 border-b border-slate-800 space-y-2 bg-slate-950 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-['M_PLUS_Rounded_1c']">
              武器選択 ({weapons.length})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isAdding && (
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setErrorNotice(null);
                }}
                className="min-h-[30px] px-2.5 py-1 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-lg flex items-center gap-1 transition-colors font-['M_PLUS_Rounded_1c'] cursor-pointer shadow-xs"
                title="武器を追加"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>追加</span>
              </button>
            )}

            {onCloseMobileDrawer && (
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                className="lg:hidden min-h-[30px] px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors font-['M_PLUS_Rounded_1c']"
                title="閉じる"
              >
                <X className="w-3.5 h-3.5" />
                <span>閉じる</span>
              </button>
            )}
          </div>
        </div>

        {/* Compact Form for adding weapons (Visible only when isAdding is true) */}
        {isAdding && (
          <form onSubmit={handleAddSubmit} className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newWeaponName}
                onChange={(e) => {
                  setNewWeaponName(e.target.value);
                  if (errorNotice) setErrorNotice(null);
                }}
                placeholder="武器名を入力 (例: スプラシューター)..."
                autoFocus
                className="flex-1 min-h-[36px] px-3 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
              />
              <button
                type="submit"
                disabled={!newWeaponName.trim()}
                className="min-h-[36px] px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 font-['M_PLUS_Rounded_1c'] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>追加</span>
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                className="min-h-[36px] px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl text-xs transition-colors shrink-0 font-['M_PLUS_Rounded_1c'] cursor-pointer"
              >
                キャンセル
              </button>
            </div>

            {errorNotice && (
              <div className="text-[11px] text-amber-300 bg-amber-950/60 border border-amber-800/60 rounded-lg px-2.5 py-1 font-medium">
                {errorNotice}
              </div>
            )}
          </form>
        )}

        {/* Search Bar (shown when 4 or more weapons exist) */}
        {weapons.length >= 4 && (
          <div className="relative pt-0.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="登録済みの武器を検索..."
              className="w-full h-8 pl-8 pr-7 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="クリア"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Weapon Buttons List with safe bottom padding for mobile scroll */}
      <div className="p-2 sm:p-2.5 min-h-[160px] flex-1 min-h-0 overflow-y-auto overscroll-contain pb-28 sm:pb-24 lg:pb-2.5">
        {weapons.length === 0 ? (
          <div className="py-10 px-4 text-center text-slate-400 text-xs space-y-3">
            <p className="font-semibold text-slate-300 font-['M_PLUS_Rounded_1c']">
              武器が登録されていません
            </p>
            <p className="text-[11px]">
              「追加」ボタンを押して武器名を入力・登録してください。
            </p>
            {!isAdding && (
              <button
                type="button"
                onClick={() => {
                  setIsAdding(true);
                  setErrorNotice(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-xl font-['M_PLUS_Rounded_1c'] transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>武器を追加する</span>
              </button>
            )}
          </div>
        ) : filteredWeapons.length === 0 ? (
          <div className="py-8 px-4 text-center text-slate-400 text-xs">
            該当する武器が見つかりません
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredWeapons.map((weapon) => {
              const isSelected = weapon.id === selectedWeaponId;
              const hasMemo = hasMemoWeaponSet.has(weapon.id);

              return (
                <div
                  key={weapon.id}
                  className={`group relative rounded-xl border transition-all duration-150 flex items-center justify-between min-h-[40px] px-2.5 py-1.5 select-none ${
                    isSelected
                      ? 'bg-slate-800 border-yellow-400 ring-2 ring-yellow-400/50 shadow-md shadow-yellow-400/10'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectWeapon(weapon.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                    title={weapon.name}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                        hasMemo ? 'bg-yellow-400 shadow-sm shadow-yellow-400/80 ring-2 ring-yellow-400/30' : 'bg-slate-700'
                      }`}
                    />
                    <span
                      className={`font-['M_PLUS_Rounded_1c'] font-bold text-xs tracking-tight truncate leading-tight block ${
                        isSelected ? 'text-white font-black' : 'text-slate-200 group-hover:text-white'
                      }`}
                    >
                      {weapon.name}
                    </span>
                  </button>

                  {/* Delete button (triggers confirmation dialog) */}
                  {onDeleteWeapon && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setWeaponToDelete(weapon);
                      }}
                      title="この武器を削除"
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-md transition-colors ml-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Footer */}
      {onCloseMobileDrawer && weapons.length > 0 && (
        <div className="p-2.5 border-t border-slate-800 bg-slate-950 shrink-0 lg:hidden flex justify-end pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.5rem))]">
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="min-h-[40px] px-5 py-1.5 text-xs font-bold bg-yellow-400 hover:bg-yellow-300 text-slate-950 rounded-xl transition-colors font-['M_PLUS_Rounded_1c'] shadow-sm"
          >
            完了（メモ画面へ）
          </button>
        </div>
      )}

      {/* Weapon Deletion Confirmation Dialog Modal */}
      {weaponToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          onClick={() => setWeaponToDelete(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-white font-['M_PLUS_Rounded_1c']">
                  武器の削除
                </h3>
                <p className="text-xs text-red-300 font-semibold truncate">
                  「{weaponToDelete.name}」
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
              <p className="font-bold text-white font-['M_PLUS_Rounded_1c']">
                「{weaponToDelete.name}」を削除しますか？
              </p>
              <p className="text-[11px] text-slate-400 leading-normal">
                武器一覧から削除されるだけでなく、この武器に保存されているメモのデータもすべて削除されます。
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWeaponToDelete(null)}
                className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors font-['M_PLUS_Rounded_1c'] cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteWeapon && weaponToDelete) {
                    onDeleteWeapon(weaponToDelete.id);
                  }
                  setWeaponToDelete(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors font-['M_PLUS_Rounded_1c'] cursor-pointer shadow-md shadow-red-950"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
