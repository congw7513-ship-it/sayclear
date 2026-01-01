"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";
import { ArrowLeft, RotateCcw, Heart, MessageCircle, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AnalysisResult, Segment } from "@/types/analysis";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock-data";



export default function ReportPage() {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

    useEffect(() => {
        // 使用 setTimeout 避免在 effect 中同步 setState (Linter 警告)
        const timer = setTimeout(() => {
            // 尝试从 localStorage 读取分析结果
            const stored = localStorage.getItem("analysisResult");
            if (stored) {
                try {
                    setResult(JSON.parse(stored));
                } catch {
                    // 解析失败，使用 Mock 数据
                    setResult(MOCK_ANALYSIS_RESULT);
                }
            } else {
                // 没有存储的结果，使用 Mock 数据（方便开发测试）
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
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <CardTitle>没有找到分析结果</CardTitle>
                        <CardDescription>请先完成一次练习录音</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link href="/practice">
                            <Button>开始练习</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { scores, advice, segments, original_transcript } = result;
    const avgScore = Math.round((scores.empathy + scores.nvc_score + scores.safety) / 3);



    // 高亮渲染逻辑
    const renderHighlightedText = () => {
        const text = original_transcript || "（未获取到原始文本，但我们仍为您分析了表达片段）";

        // 如果没有需要高亮的片段，直接返回文本
        if (!segments || segments.length === 0) return <p className="text-xl leading-relaxed">{text}</p>;

        const safeSegments = segments.filter(s => s.text && s.text.trim().length > 0);
        if (safeSegments.length === 0) return <p className="text-xl leading-relaxed">{text}</p>;

        // 构建正则：转义特殊字符
        const patternString = safeSegments
            .map(s => s.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join("|");

        const pattern = new RegExp(`(${patternString})`, "g");
        const parts = text.split(pattern);

        return (
            <p className="text-xl leading-relaxed font-medium">
                {parts.map((part, i) => {
                    const segment = safeSegments.find(s => s.text === part);
                    if (segment && segment.type === "highlight_bad") {
                        return (
                            <span
                                key={i}
                                className="text-red-600 dark:text-red-400 border-b-2 border-red-400 dark:border-red-600 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors px-0.5 rounded-sm"
                                onClick={() => setSelectedSegment(segment)}
                            >
                                {part}
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </p>
        );
    };

    return (
        <main className="min-h-screen bg-background p-4 md:p-8 flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-2xl space-y-8"
            >
                {/* 顶部导航 */}
                <div className="flex items-center justify-between">
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            返回首页
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground mr-2">综合得分</span>
                        <Badge variant={avgScore >= 80 ? "default" : "secondary"} className="text-lg px-3 py-1">
                            {avgScore}
                        </Badge>
                    </div>
                </div>

                {/* 核心功能：原文批改 (Visual Feedback) */}
                <Card className="border-2 border-primary/10 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-primary" />
                            原文批改
                        </CardTitle>
                        <CardDescription>点击 <span className="text-red-500 font-medium border-b border-red-400">红色文字</span> 查看具体问题</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* 原文展示区 */}
                        <div className="bg-muted/30 p-6 rounded-xl min-h-[120px]">
                            {renderHighlightedText()}
                        </div>

                        {/* 诊断气泡/提示区 (交互反馈) */}
                        <AnimatePresence mode="wait">
                            {selectedSegment ? (
                                <motion.div
                                    key={selectedSegment.text}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 p-4 rounded-r-lg"
                                >
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-bold text-red-800 dark:text-red-200 mb-1">
                                                问题诊断：&quot;{selectedSegment.text}&quot;
                                            </p>
                                            <p className="text-red-700 dark:text-red-300 text-sm">
                                                {selectedSegment.comment}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="h-4" /> // 占位，防止跳动，或者留空
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>

                {/* 核心功能：参考答案 (Benchmark) */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                            <Heart className="w-5 h-5" />
                            高情商参考
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-lg leading-relaxed text-green-800 dark:text-green-200">
                            {advice[0].replace(/^(✨ )?高情商重写版本：/, "")}
                        </p>
                    </CardContent>
                </Card>

                {/* 更多建议折叠 */}
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground font-medium ml-1">更多沟通技巧：</p>
                    <ul className="space-y-3">
                        {advice.slice(1).map((tip, i) => (
                            <li key={i} className="flex items-start gap-3 p-3 bg-muted rounded-lg text-sm">
                                <Badge variant="outline" className="mt-0.5 shrink-0">{i + 1}</Badge>
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 闭环行动：再练一次 */}
                <div className="pt-8 pb-12">
                    <Link href="/practice">
                        <Button size="lg" className="w-full text-lg h-14 shadow-xl hover:scale-[1.02] transition-transform">
                            <RotateCcw className="mr-2 w-5 h-5" />
                            带着建议，再试一次
                        </Button>
                    </Link>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                        持续练习是提升情商的唯一捷径
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
