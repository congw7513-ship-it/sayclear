"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Sparkles, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AnalysisResult } from "@/types/analysis";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock-data";

// 从文本中提取场景信息
function extractScenarioFromText(text: string): { scenario: string | null; cleanText: string } {
    // 匹配【当前场景：xxx】或【当前场景：xxx - xxx】格式
    const scenarioMatch = text.match(/【当前场景[：:]\s*([^】]+?)(?:\s*[-–]\s*[^】]+)?】/);
    // 匹配 用户发言：xxx 格式
    const userSpeechMatch = text.match(/用户发言[：:]\s*([\s\S]*)/);

    if (scenarioMatch && userSpeechMatch) {
        return {
            scenario: scenarioMatch[1].trim(),
            cleanText: userSpeechMatch[1].trim()
        };
    }

    // 如果没有匹配到完整格式，尝试简单清理
    const cleanText = text
        .replace(/【当前场景[：:][\s\S]*?】\s*/g, '')
        .replace(/用户发言[：:]\s*/g, '')
        .trim();

    return {
        scenario: scenarioMatch ? scenarioMatch[1].trim() : null,
        cleanText: cleanText || text
    };
}

// 从高情商话术中提取公式步骤
function extractFormulaSteps(text: string): { fullText: string; steps: Array<{ label: string; content: string }> } {
    const steps: Array<{ label: string; content: string }> = [];

    // 匹配括号中的内容作为步骤标签
    const bracketPattern = /[（(]([^）)]+)[）)]/g;
    let match;
    let stepIndex = 1;

    while ((match = bracketPattern.exec(text)) !== null) {
        // 获取括号前的一段文字作为内容
        const beforeBracket = text.substring(0, match.index);
        const lastSentenceMatch = beforeBracket.match(/[，。？！,!?][^，。？！,!?]*$/);
        const content = lastSentenceMatch
            ? lastSentenceMatch[0].replace(/^[，。？！,!?]/, '').trim()
            : beforeBracket.slice(-20).trim();

        if (content && match[1]) {
            steps.push({
                label: `Step ${stepIndex}: ${match[1]}`,
                content: content
            });
            stepIndex++;
        }
    }

    // 清理括号内容，保留纯净话术
    const fullText = text.replace(/[（(][^）)]+[）)]/g, '').trim();

    return { fullText, steps };
}

export default function ReportPage() {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSegment, setExpandedSegment] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            const stored = localStorage.getItem("analysisResult");
            if (stored) {
                try {
                    setResult(JSON.parse(stored));
                } catch {
                    setResult(MOCK_ANALYSIS_RESULT);
                }
            } else {
                setResult(MOCK_ANALYSIS_RESULT);
            }
            setLoading(false);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">加载中...</div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <Card className="max-w-md text-center p-8">
                    <p className="text-muted-foreground mb-4">没有找到分析结果</p>
                    <Link href="/practice">
                        <Button>开始练习</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const { advice, segments, original_transcript } = result;
    const { scenario, cleanText } = extractScenarioFromText(original_transcript || "");
    const { fullText: eqResponse, steps: formulaSteps } = extractFormulaSteps(advice[0] || "");

    // 高亮渲染逻辑 - 使用手风琴展开
    const renderHighlightedText = () => {
        const text = cleanText || "（未获取到原始文本）";

        if (!segments || segments.length === 0) {
            return <p className="text-lg leading-relaxed text-gray-700">{text}</p>;
        }

        const safeSegments = segments.filter(s => s.text && s.text.trim().length > 0);
        if (safeSegments.length === 0) {
            return <p className="text-lg leading-relaxed text-gray-700">{text}</p>;
        }

        const patternString = safeSegments
            .map(s => s.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join("|");

        const pattern = new RegExp(`(${patternString})`, "g");
        const parts = text.split(pattern);

        return (
            <div className="space-y-2">
                <p className="text-lg leading-relaxed text-gray-700">
                    {parts.map((part, i) => {
                        const segment = safeSegments.find(s => s.text === part);

                        if (segment) {
                            const isGood = segment.type === "highlight_good";
                            const isExpanded = expandedSegment === part;

                            return (
                                <span key={i} className="inline">
                                    <span
                                        className={`
                                            border-b-2 cursor-pointer transition-all px-0.5 rounded-sm
                                            ${isGood
                                                ? "text-emerald-600 border-emerald-400 hover:bg-emerald-50"
                                                : "text-red-600 border-red-400 hover:bg-red-50"}
                                            ${isExpanded ? (isGood ? "bg-emerald-50" : "bg-red-50") : ""}
                                        `}
                                        onClick={() => setExpandedSegment(isExpanded ? null : part)}
                                    >
                                        {part}
                                        {isExpanded ? (
                                            <ChevronUp className="inline w-3 h-3 ml-0.5" />
                                        ) : (
                                            <ChevronDown className="inline w-3 h-3 ml-0.5" />
                                        )}
                                    </span>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.span
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className={`
                                                    block text-sm mt-2 mb-3 p-3 rounded-lg
                                                    ${isGood
                                                        ? "bg-emerald-50 text-emerald-700 border-l-2 border-emerald-400"
                                                        : "bg-red-50 text-red-700 border-l-2 border-red-400"}
                                                `}
                                            >
                                                {isGood ? "亮点：" : "建议："}{segment.comment}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </span>
                            );
                        }
                        return <span key={i}>{part}</span>;
                    })}
                </p>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-gray-50 pb-28">
            {/* 顶部导航 */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b z-10">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center">
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            返回
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* 1. 场景回溯 Banner */}
                {scenario && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-100 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="text-xs">练习场景</Badge>
                        </div>
                        <p className="text-gray-600 text-sm">{scenario}</p>
                    </motion.div>
                )}

                {/* 2. 红笔批改卡片 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="shadow-sm border-0 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="w-5 h-5 text-gray-500" />
                                <h2 className="font-semibold text-gray-800">你的表达</h2>
                            </div>
                            <div className="text-sm text-gray-400 mb-3">
                                点击彩色文字查看详细建议
                            </div>
                            {renderHighlightedText()}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 3. 高情商公式拆解 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-emerald-600" />
                                <h2 className="font-semibold text-emerald-800">高情商参考</h2>
                                <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">AI 嘴替</Badge>
                            </div>

                            {/* 完整话术 */}
                            <p className="text-lg font-medium text-emerald-800 leading-relaxed mb-6">
                                &ldquo;{eqResponse || advice[0]}&rdquo;
                            </p>

                            {/* 公式拆解 */}
                            {formulaSteps.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-emerald-200">
                                    <p className="text-xs text-emerald-600 font-medium">公式拆解</p>
                                    {formulaSteps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <Badge className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
                                                {step.label}
                                            </Badge>
                                            <span className="text-sm text-emerald-700">&ldquo;{step.content}&rdquo;</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 4. 更多沟通技巧 */}
                {advice.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-3"
                    >
                        <h3 className="text-sm font-medium text-gray-500 px-1">更多技巧</h3>
                        <div className="space-y-2">
                            {advice.slice(1).map((tip, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg text-sm">
                                    <span className="text-gray-400 shrink-0">{i + 1}.</span>
                                    <span className="text-gray-600">{tip}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* 底部固定按钮 */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
                <div className="max-w-2xl mx-auto">
                    <Link href="/practice">
                        <Button size="lg" className="w-full text-base h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-md">
                            <RotateCcw className="mr-2 w-5 h-5" />
                            带着建议，再练一次
                        </Button>
                    </Link>
                </div>
            </div>
        </main>
    );
}
