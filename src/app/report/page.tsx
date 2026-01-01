"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RotateCcw, TrendingUp, Layers, Zap, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AnalysisResult } from "@/types/analysis";
import { MOCK_ANALYSIS_RESULT } from "@/lib/mock-data";

// 根据分数获取颜色
function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
}

// 根据分数获取进度条颜色
function getProgressColor(score: number): string {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
}

export default function ReportPage() {
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);

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

    const { scores, diagnosis, prep_analysis, advice, segments } = result;
    const avgScore = Math.round((scores.logic + scores.structure + scores.efficiency) / 3);

    return (
        <main className="min-h-screen bg-background p-4 md:p-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-4xl mx-auto"
            >
                {/* 顶部导航 */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            返回首页
                        </Button>
                    </Link>
                    <Link href="/practice">
                        <Button variant="outline" size="sm">
                            <RotateCcw className="mr-2 w-4 h-4" />
                            再练一次
                        </Button>
                    </Link>
                </div>

                {/* 标题和诊断 */}
                <div className="text-center mb-8">
                    <Badge variant="secondary" className="mb-4">分析完成</Badge>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">你的表达报告</h1>

                    {/* 综合评分 */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                        className="inline-flex items-center gap-3 bg-muted px-6 py-3 rounded-full mb-4"
                    >
                        <span className="text-muted-foreground">综合评分</span>
                        <span className={`text-4xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}</span>
                    </motion.div>

                    {/* 一句话诊断 */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="max-w-xl mx-auto"
                    >
                        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                            <CardContent className="py-4">
                                <p className="text-amber-800 dark:text-amber-200 font-medium">
                                    💡 {diagnosis}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* 分数卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                        { key: "logic", label: "逻辑性", icon: TrendingUp, color: "blue", score: scores.logic },
                        { key: "structure", label: "结构性", icon: Layers, color: "green", score: scores.structure },
                        { key: "efficiency", label: "表达效率", icon: Zap, color: "orange", score: scores.efficiency },
                    ].map((item, i) => (
                        <motion.div
                            key={item.key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * i }}
                        >
                            <Card>
                                <CardHeader className="pb-2">
                                    <div className="flex items-center gap-2">
                                        <item.icon className={`w-5 h-5 text-${item.color}-500`} />
                                        <CardTitle className="text-lg">{item.label}</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className={`text-3xl font-bold mb-2 ${getScoreColor(item.score)}`}>
                                        {item.score}
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${item.score}%` }}
                                            transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                                            className={`h-full ${getProgressColor(item.score)}`}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* PREP 结构检测 */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>PREP 结构检测</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-4">
                            <Badge variant={prep_analysis.point_detected ? "default" : "destructive"}>
                                {prep_analysis.point_detected ? "✓ 检测到观点" : "✗ 未检测到明确观点"}
                            </Badge>
                            <span className="text-muted-foreground">
                                结论位置：
                                <span className="font-medium text-foreground ml-1">
                                    {prep_analysis.conclusion_position === "start" && "开头（很好！）"}
                                    {prep_analysis.conclusion_position === "middle" && "中间"}
                                    {prep_analysis.conclusion_position === "end" && "结尾（建议移到开头）"}
                                    {prep_analysis.conclusion_position === "missing" && "未找到"}
                                </span>
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* 详细分析标签页 */}
                <Tabs defaultValue="segments" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="segments">文本高亮</TabsTrigger>
                        <TabsTrigger value="advice">改进建议</TabsTrigger>
                        <TabsTrigger value="raw">原始数据</TabsTrigger>
                    </TabsList>

                    <TabsContent value="segments" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>表达亮点与问题</CardTitle>
                                <CardDescription>
                                    <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> 表达良好</span>
                                    <span className="inline-flex items-center gap-1 ml-4"><span className="w-3 h-3 bg-red-500 rounded-full"></span> 需要改进</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {segments.map((segment, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className={`p-4 rounded-lg border-l-4 ${segment.type === "highlight_good"
                                                ? "bg-green-50 dark:bg-green-950/20 border-green-500"
                                                : "bg-red-50 dark:bg-red-950/20 border-red-500"
                                                }`}
                                        >
                                            <p className="font-medium mb-2">&quot;{segment.text}&quot;</p>
                                            <p className={`text-sm ${segment.type === "highlight_good"
                                                ? "text-green-700 dark:text-green-300"
                                                : "text-red-700 dark:text-red-300"
                                                }`}>
                                                {segment.comment}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="advice" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>改进建议</CardTitle>
                                <CardDescription>根据你的表达，AI 提供的具体改进方向</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {advice.map((item, i) => (
                                        <motion.li
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex items-start gap-3 p-4 bg-muted rounded-lg"
                                        >
                                            <Badge className="mt-0.5">{i + 1}</Badge>
                                            <span>{item}</span>
                                        </motion.li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="raw" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>原始分析数据</CardTitle>
                                <CardDescription>GPT-4o 返回的完整 JSON</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                    {JSON.stringify(result, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </main>
    );
}
