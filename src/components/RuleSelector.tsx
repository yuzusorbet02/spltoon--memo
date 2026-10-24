import React from 'react';
import { RULES } from '../data/constants';
import { RuleId } from '../types';

interface RuleSelectorProps {
  selectedRuleId: RuleId;
  onSelectRule: (ruleId: RuleId) => void;
}

const getActiveRuleStyle = (ruleId: RuleId): string => {
  switch (ruleId) {
    case 'turf':
      // ナワバリバトル：緑
      return 'bg-emerald-400 text-slate-950 border-emerald-300 ring-2 ring-emerald-300/40 font-black';
    case 'zones':
      // ガチエリア：薄い黄色
      return 'bg-amber-200 text-slate-950 border-amber-300 ring-2 ring-amber-300/40 font-black';
    case 'tower':
      // ガチヤグラ：水色
      return 'bg-sky-300 text-slate-950 border-sky-200 ring-2 ring-sky-300/40 font-black';
    case 'rainmaker':
      // ガチホコバトル：薄い赤色
      return 'bg-rose-300 text-slate-950 border-rose-200 ring-2 ring-rose-300/40 font-black';
    case 'clams':
      // ガチアサリ：オレンジ
      return 'bg-orange-300 text-slate-950 border-orange-200 ring-2 ring-orange-300/40 font-black';
    default:
      return 'bg-emerald-400 text-slate-950 border-emerald-300 ring-2 ring-emerald-300/40 font-black';
  }
};

export const RuleSelector: React.FC<RuleSelectorProps> = React.memo(({
  selectedRuleId,
  onSelectRule,
}) => {
  return (
    <div className="w-full">
      {/* Label */}
      <div className="mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          ルール選択 (全5種)
        </span>
      </div>

      {/* 5 Rules Buttons Grid */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2.5">
        {RULES.map((rule) => {
          const isActive = rule.id === selectedRuleId;

          return (
            <button
              key={rule.id}
              onClick={() => onSelectRule(rule.id)}
              className={`min-h-[46px] sm:min-h-[48px] px-2 sm:px-3 py-2 rounded-xl border flex items-center justify-center text-center font-['M_PLUS_Rounded_1c'] text-xs sm:text-sm tracking-tight whitespace-nowrap ${
                isActive
                  ? getActiveRuleStyle(rule.id)
                  : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800 font-bold'
              }`}
            >
              {rule.shortName}
            </button>
          );
        })}
      </div>
    </div>
  );
});
