"use client";

import { QUICK_SCENARIOS, type ScenarioMode, type QuickScenario } from "@/lib/constants";

interface ScenarioSelectorProps {
    mode: ScenarioMode;
    onSelect: (scenario: QuickScenario) => void;
}

/**
 * 高频场景胶囊选择器
 * 帮助冲突回避型用户快速代入场景
 */
export function ScenarioSelector({ mode, onSelect }: ScenarioSelectorProps) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 max-w-lg mx-auto">
            {QUICK_SCENARIOS[mode]?.map((item) => (
                <button
                    key={item.label}
                    onClick={() => onSelect(item)}
                    className="
                        bg-gray-100 hover:bg-gray-200 active:bg-blue-100 
                        dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-blue-900/40
                        text-gray-600 dark:text-gray-300 active:text-blue-600 dark:active:text-blue-400
                        text-sm px-3 py-1.5 rounded-full transition-all duration-200
                        border border-transparent active:border-blue-200
                    "
                >
                    {item.label}
                </button>
            ))}
        </div>
    );
}
