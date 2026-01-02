"use client";

import { useState, useEffect, useRef } from "react";
import { QUICK_SCENARIOS, type ScenarioMode, type QuickScenario } from "@/lib/constants";
import { RefreshCw } from "lucide-react";

interface ScenarioSelectorProps {
    mode: ScenarioMode;
    selectedLabel?: string | null;
    onSelect: (scenario: QuickScenario) => void;
    onScenariosLoaded?: (scenarios: QuickScenario[]) => void;
}

/**
 * 高频场景胶囊选择器（全 AI 动态生成版）
 */
export function ScenarioSelector({
    mode,
    selectedLabel = null,
    onSelect,
    onScenariosLoaded
}: ScenarioSelectorProps) {
    const [scenarios, setScenarios] = useState<QuickScenario[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // 使用 ref 存储回调，避免依赖变化导致重新加载
    const onScenariosLoadedRef = useRef(onScenariosLoaded);
    onScenariosLoadedRef.current = onScenariosLoaded;

    // 跟踪是否已加载过，防止重复加载
    const hasLoadedRef = useRef(false);

    /**
     * 从 API 加载场景
     */
    const loadScenarios = async (isManualRefresh = false) => {
        // 如果已经加载过且不是手动刷新，则跳过
        if (hasLoadedRef.current && !isManualRefresh) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`/api/scenarios?mode=${mode}`);
            const data = await response.json();

            let loadedScenarios: QuickScenario[];

            if (data.success && data.data && Array.isArray(data.data)) {
                loadedScenarios = data.data;
            } else {
                console.warn("[ScenarioSelector] API 返回失败，使用静态数据");
                loadedScenarios = QUICK_SCENARIOS[mode] || [];
            }

            setScenarios(loadedScenarios);
            hasLoadedRef.current = true;

            // 通知父组件
            if (onScenariosLoadedRef.current && loadedScenarios.length > 0) {
                onScenariosLoadedRef.current(loadedScenarios);
            }
        } catch (err) {
            console.error("[ScenarioSelector] 加载失败:", err);
            const fallbackScenarios = QUICK_SCENARIOS[mode] || [];
            setScenarios(fallbackScenarios);
            hasLoadedRef.current = true;

            if (onScenariosLoadedRef.current && fallbackScenarios.length > 0) {
                onScenariosLoadedRef.current(fallbackScenarios);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // 组件挂载时加载一次
    useEffect(() => {
        loadScenarios(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]); // 只在 mode 变化时重新加载

    const handleShuffle = () => {
        loadScenarios(true); // 手动刷新
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4 max-w-lg mx-auto">
            {isLoading ? (
                <div className="h-8" />
            ) : (
                <>
                    {scenarios.map((item, index) => {
                        const isSelected = selectedLabel === item.label;
                        return (
                            <button
                                key={`${item.label}-${index}`}
                                onClick={() => onSelect(item)}
                                className={`
                                    text-sm px-3 py-1.5 rounded-full transition-all duration-200
                                    ${isSelected
                                        ? 'bg-blue-500 text-white border-blue-500 dark:bg-blue-600'
                                        : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent'
                                    }
                                    border
                                `}
                                title={item.prompt}
                            >
                                {item.label}
                            </button>
                        );
                    })}

                    <button
                        onClick={handleShuffle}
                        disabled={isLoading}
                        className="
                            flex items-center gap-1
                            bg-blue-50 hover:bg-blue-100 active:bg-blue-200
                            dark:bg-blue-900/30 dark:hover:bg-blue-900/50
                            text-blue-600 dark:text-blue-400
                            text-sm px-3 py-1.5 rounded-full transition-all duration-200
                            border border-blue-200 dark:border-blue-800
                            disabled:opacity-50
                        "
                        title="AI 生成新场景"
                    >
                        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        换一批
                    </button>
                </>
            )}
        </div>
    );
}
