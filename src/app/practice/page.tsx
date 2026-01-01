"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    ArrowLeft,
    Brain,
    Mic,
    Square,
    Loader2,
    Lightbulb,
    CheckCircle2,
    MicOff,
    UploadCloud,
    BrainCircuit,
    Search,
    FileText,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getRandomTopic } from "@/lib/topics";
import { MOCK_MODE } from "@/lib/mock-data";
import { AnalyzeResponse } from "@/types/analysis";


// ============================================
// 状态机类型定义
// ============================================
type PracticeState = "idle" | "thinking" | "recording" | "analyzing";

// PREP 提示框架
const PREP_HINTS = [
    { letter: "P", title: "Point", desc: "先说结论" },
    { letter: "R", title: "Reason", desc: "解释原因" },
    { letter: "E", title: "Example", desc: "举例证明" },
    { letter: "P", title: "Point", desc: "重申结论" },
];

// 分析步骤定义 (动态展示)
const ANALYSIS_STEPS = [
    { text: "正在上传音频数据...", icon: UploadCloud },
    { text: "Whisper 正在精准转录...", icon: Mic },
    { text: "AI 正在拆解逻辑结构...", icon: BrainCircuit },
    { text: "正在检测逻辑谬误...", icon: Search },
    { text: "生成最终诊断报告...", icon: FileText },
];

// ============================================
// 动态波形可视化组件（带真实反馈）
// ============================================
function WaveformVisualizer({ isRecording }: { isRecording: boolean }) {
    const [bars, setBars] = useState<number[]>(Array(40).fill(8));
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isRecording) {
            setTimeout(() => setBars(Array(40).fill(8)), 0);
            return;
        }

        const animate = () => {
            setBars(prev => prev.map(() =>
                isRecording ? Math.random() * 60 + 10 : 8
            ));
            animationRef.current = requestAnimationFrame(animate);
        };

        // 降低帧率到约 10fps 以节省资源
        const interval = setInterval(() => {
            animate();
        }, 100);

        return () => {
            clearInterval(interval);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [isRecording]);

    return (
        <div className="flex items-center justify-center gap-1 h-24">
            {bars.map((height, i) => (
                <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height }}
                    transition={{ duration: 0.1 }}
                />
            ))}
        </div>
    );
}

// ============================================
// 录音中的麦克风动画
// ============================================
function RecordingMicIcon() {
    return (
        <motion.div
            animate={{
                scale: [1, 1.15, 1],
                opacity: [1, 0.8, 1]
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className="relative"
        >
            <Mic className="w-6 h-6" />
            <motion.div
                className="absolute inset-0 bg-red-500 rounded-full -z-10"
                animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 0, 0.5]
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut"
                }}
            />
        </motion.div>
    );
}

// ============================================
// 倒计时数字组件
// ============================================
function CountdownDisplay({ seconds, label }: { seconds: number; label: string }) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    return (
        <div className="text-center">
            <motion.div
                key={seconds}
                initial={{ scale: 1.1, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-mono font-bold tracking-tight"
            >
                {timeString}
            </motion.div>
            <p className="text-muted-foreground mt-2">{label}</p>
        </div>
    );
}

// ============================================
// 主组件内容
// ============================================
function PracticeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const topicType = (searchParams.get("topic") as "workplace" | "interview") || "workplace";

    // 状态管理
    const [state, setState] = useState<PracticeState>("idle");
    const [topic, setTopic] = useState(() => getRandomTopic(topicType));
    const [countdown, setCountdown] = useState(30);
    const [permissionDenied, setPermissionDenied] = useState(false);

    // 实时语音转文字状态
    const [realtimeText, setRealtimeText] = useState("");

    // 分析步骤轮播状态
    const [analysisStep, setAnalysisStep] = useState(0);

    // 录音相关 Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null); // Web Speech API 实例
    const fullTranscriptRef = useRef(""); // 累积的完整识别文本

    // 清理录音资源
    const cleanupRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        // 这里不清空 realtimeText，以便用户在等待分析时能看到最后一句话
    }, []);

    // 开始录音
    const startRecording = useCallback(async () => {
        try {
            console.log("[录音] 请求麦克风权限...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            streamRef.current = stream;
            audioChunksRef.current = [];
            fullTranscriptRef.current = ""; // 重置累积文本

            // 使用 webm 格式（兼容性好）
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onerror = (event) => {
                console.error("[录音] 错误:", event);
                toast.error("录音出错", { description: "请刷新页面重试" });
            };

            // ------------------------------------------------------------
            // Web Speech API: 实时语音转文字 (UI展示用 + 容灾备份)
            // ------------------------------------------------------------
            if ('webkitSpeechRecognition' in window) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const recognition = new (window as any).webkitSpeechRecognition();
                recognition.continuous = true; // 连续识别
                recognition.interimResults = true; // 返回中间结果
                recognition.lang = 'zh-CN'; // 中文

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onresult = (event: any) => {
                    let interimTranscript = '';
                    let finalTranscriptChunk = '';

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        const transcript = event.results[i][0].transcript;
                        if (event.results[i].isFinal) {
                            finalTranscriptChunk += transcript;
                            fullTranscriptRef.current += transcript; // 累积到全文
                        } else {
                            interimTranscript += transcript;
                        }
                    }

                    // 更新 UI 显示 (优先显示正在说的，如果没有则显示最后一句 confirmed 的)
                    setRealtimeText(interimTranscript || finalTranscriptChunk || realtimeText);
                };

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognition.onerror = (event: any) => {
                    console.warn("Web Speech API error:", event.error);
                };

                recognitionRef.current = recognition;
                recognition.start();
            } else {
                console.warn("浏览器不支持 Web Speech API，跳过实时字幕");
            }

            console.log("[录音] ✅ 开始录音");
            setPermissionDenied(false);

        } catch (error) {
            console.error("[录音] 获取麦克风权限失败:", error);
            setPermissionDenied(true);

            if (error instanceof DOMException) {
                if (error.name === "NotAllowedError") {
                    toast.error("麦克风权限被拒绝", {
                        description: "请在浏览器设置中允许访问麦克风",
                        duration: 5000,
                    });
                } else if (error.name === "NotFoundError") {
                    toast.error("未找到麦克风", {
                        description: "请确保您的设备有可用的麦克风",
                        duration: 5000,
                    });
                } else {
                    toast.error("无法访问麦克风", {
                        description: error.message,
                        duration: 5000,
                    });
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 停止录音并获取音频 Blob
    const stopRecording = useCallback((): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const mediaRecorder = mediaRecorderRef.current;

            if (!mediaRecorder || mediaRecorder.state === "inactive") {
                console.log("[录音] MediaRecorder 未激活");
                resolve(null);
                return;
            }

            mediaRecorder.onstop = () => {
                const mimeType = mediaRecorder.mimeType || "audio/webm";
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                console.log(`[录音] ✅ 录音完成，MIME: ${mimeType}, 大小: ${audioBlob.size} bytes`);

                // 清理 stream
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                    streamRef.current = null;
                }

                // 停止实时语音识别
                if (recognitionRef.current) {
                    recognitionRef.current.stop();
                }

                resolve(audioBlob);
            };

            // 稍微延迟停止，确保所有数据块都被收集
            setTimeout(() => {
                mediaRecorder.stop();
            }, 200);
        });
    }, []);

    // 倒计时逻辑
    useEffect(() => {
        if (state !== "thinking" && state !== "recording") return;

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (state === "thinking") {
                        setState("recording");
                        setCountdown(120);
                    } else if (state === "recording") {
                        handleSubmit();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state]);

    // 分析步骤轮播定时器
    useEffect(() => {
        if (state !== "analyzing") {
            setAnalysisStep(0);
            return;
        }

        const stepTimer = setInterval(() => {
            setAnalysisStep(prev =>
                prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev
            );
        }, 1200);

        return () => clearInterval(stepTimer);
    }, [state]);

    // 进入录音状态时自动开始录音
    useEffect(() => {
        if (state === "recording") {
            startRecording();
        } else {
            cleanupRecording();
        }

        return () => {
            if (state === "recording") {
                cleanupRecording();
            }
        };
    }, [state, startRecording, cleanupRecording]);

    // 开始思考
    const handleStartThinking = () => {
        setState("thinking");
        setCountdown(30);
    };

    // 跳过思考，直接录音
    const handleSkipToRecording = () => {
        setState("recording");
        setCountdown(120);
    };

    // 提交分析
    const handleSubmit = useCallback(async () => {
        setState("analyzing");

        try {
            let formData: FormData | null = null;
            let jsonBody: string | null = null;

            // 尝试获取录音
            const audioBlob = await stopRecording();

            if (audioBlob && audioBlob.size > 0) {
                // 有录音：使用 FormData 上传 (优先，Whisper 准确率高)
                console.log(`[提交] 使用音频上传模式 (大小: ${audioBlob.size} bytes)`);
                formData = new FormData();
                formData.append("file", audioBlob, "recording.webm");
            } else if (fullTranscriptRef.current && fullTranscriptRef.current.length > 5) {
                // 无录音，但有实时识别的文本：作为容灾备份
                console.warn("[提交] 录音无效，切换到 Web Speech API 文本备份");
                console.log("[提交] 备份文本:", fullTranscriptRef.current);
                jsonBody = JSON.stringify({ text: fullTranscriptRef.current });

                toast.warning("麦克风音频获取失败，已切换至文字分析", {
                    description: "本次分析基于实时识别的文字，准确度可能略受影响。",
                    duration: 4000
                });
            } else {
                // 万策尽
                console.warn("[提交] 录音数据原本和备份文本均为空");
                toast.error("未检测到有效输入", {
                    description: "请检查麦克风权限或大声说话。",
                });
                setState("recording");
                return;
            }

            const response = await fetch("/api/analyze", {
                method: "POST",
                ...(formData
                    ? { body: formData }
                    : {
                        headers: { "Content-Type": "application/json" },
                        body: jsonBody
                    }
                ),
            });

            const data: AnalyzeResponse = await response.json();

            if (!data.success || !data.data) {
                throw new Error(data.error || "分析失败");
            }

            // 存储结果到 localStorage
            localStorage.setItem("analysisResult", JSON.stringify(data.data));

            toast.success("分析完成！", {
                description: "正在跳转到结果页面...",
            });

            setTimeout(() => {
                router.push("/report");
            }, 800);

        } catch (error) {
            console.error("[提交] 错误:", error);
            toast.error("分析失败", {
                description: error instanceof Error ? error.message : "请稍后重试",
            });
            setState("recording");
        }
    }, [router, stopRecording]);

    // 换一道题
    const handleNewTopic = () => {
        setTopic(getRandomTopic(topicType));
    };

    // 计算进度百分比
    const getProgress = () => {
        if (state === "thinking") {
            return ((30 - countdown) / 30) * 100;
        }
        if (state === "recording") {
            return ((120 - countdown) / 120) * 100;
        }
        return 0;
    };

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl">
                {/* 顶部导航 */}
                <div className="flex items-center justify-between mb-6">
                    <Link href="/">
                        <Button variant="ghost" size="sm" disabled={state === "analyzing"}>
                            <ArrowLeft className="mr-2 w-4 h-4" />
                            返回
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        {MOCK_MODE && (
                            <Badge variant="outline" className="text-xs text-orange-500 border-orange-500">
                                MOCK
                            </Badge>
                        )}
                        <Badge variant="outline">
                            {topicType === "workplace" ? "工作汇报" : "面试回答"}
                        </Badge>
                    </div>
                </div>

                {/* 主卡片 */}
                <Card className="overflow-hidden">
                    {/* ============================================ */}
                    {/* 常驻区域：题目显示 */}
                    {/* ============================================ */}
                    <CardHeader className="text-center pb-2 border-b bg-muted/20">
                        <Badge variant="secondary" className="w-fit mx-auto mb-4">
                            题目 #{topic.id}
                        </Badge>
                        <CardTitle className="text-2xl md:text-3xl mb-2">{topic.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-6">
                        {/* 题目描述 */}
                        <div className="bg-muted p-4 md:p-6 rounded-lg">
                            <p className="text-lg text-center leading-relaxed">
                                {topic.prompt}
                            </p>
                        </div>

                        <AnimatePresence mode="wait">
                            {/* ============================================ */}
                            {/* IDLE 状态：操作按钮 */}
                            {/* ============================================ */}
                            {state === "idle" && (
                                <motion.div
                                    key="idle"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex flex-col gap-3 pt-4"
                                >
                                    <Button
                                        size="lg"
                                        className="w-full text-lg h-14"
                                        onClick={handleStartThinking}
                                    >
                                        <Brain className="mr-2 w-5 h-5" />
                                        开始思考（30秒）
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="w-full"
                                        onClick={handleNewTopic}
                                    >
                                        换一道题
                                    </Button>
                                </motion.div>
                            )}

                            {/* ============================================ */}
                            {/* THINKING 状态：30秒思考倒计时 + PREP 提示 */}
                            {/* ============================================ */}
                            {state === "thinking" && (
                                <motion.div
                                    key="thinking"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center pb-2">
                                        <div className="flex items-center justify-center gap-2 text-primary mb-4">
                                            <Brain className="w-6 h-6 animate-pulse" />
                                            <span className="font-medium">思考时间</span>
                                        </div>
                                        <CountdownDisplay seconds={countdown} label="用 PREP 框架组织你的思路" />
                                    </div>
                                    <div className="space-y-6">
                                        <Progress value={getProgress()} className="h-2" />

                                        {/* PREP 提示卡片 */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {PREP_HINTS.map((hint, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.1 }}
                                                    className="bg-muted p-3 rounded-lg text-center"
                                                >
                                                    <div className="text-2xl font-bold text-primary">{hint.letter}</div>
                                                    <div className="text-xs text-muted-foreground">{hint.desc}</div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <Lightbulb className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                                    <strong>提示：</strong>先想好你的核心结论是什么，然后准备1-2个具体数据或例子来支撑。
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            size="lg"
                                            className="w-full"
                                            onClick={handleSkipToRecording}
                                        >
                                            准备好了，开始录音
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================================ */}
                            {/* RECORDING 状态：录音中 + 波形动画 */}
                            {/* ============================================ */}
                            {state === "recording" && (
                                <motion.div
                                    key="recording"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center pb-2">
                                        <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
                                            {permissionDenied ? (
                                                <>
                                                    <MicOff className="w-6 h-6" />
                                                    <span className="font-medium">麦克风不可用</span>
                                                </>
                                            ) : (
                                                <>
                                                    <RecordingMicIcon />
                                                    <span className="font-medium">正在录音</span>
                                                </>
                                            )}
                                        </div>
                                        <CountdownDisplay seconds={countdown} label="尽量覆盖 PREP 的每个环节" />
                                    </div>
                                    <div className="space-y-6">
                                        <Progress value={getProgress()} className="h-2" />

                                        {/* 实时字幕区域 */}
                                        <div className="h-12 flex items-center justify-center mb-4">
                                            <AnimatePresence mode="wait">
                                                {realtimeText && (
                                                    <motion.div
                                                        key={realtimeText}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-xl md:text-2xl font-medium text-gray-400 text-center max-w-2xl px-4"
                                                    >
                                                        “{realtimeText}”
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* 波形动画 */}
                                        <div className="bg-muted rounded-lg p-4">
                                            {permissionDenied ? (
                                                <div className="h-24 flex flex-col items-center justify-center text-muted-foreground">
                                                    <MicOff className="w-8 h-8 mb-2" />
                                                    <p className="text-sm">麦克风权限被拒绝</p>
                                                    <p className="text-xs">将使用默认文本进行演示</p>
                                                </div>
                                            ) : (
                                                <WaveformVisualizer isRecording={true} />
                                            )}
                                        </div>

                                        {/* PREP 提醒 */}
                                        <div className="grid grid-cols-4 gap-1 text-center text-xs text-muted-foreground">
                                            {PREP_HINTS.map((hint, i) => (
                                                <div key={i} className="p-2">
                                                    <span className="font-bold text-primary">{hint.letter}</span> {hint.desc}
                                                </div>
                                            ))}
                                        </div>

                                        <Button
                                            variant="destructive"
                                            size="lg"
                                            className="w-full"
                                            onClick={handleSubmit}
                                        >
                                            <Square className="mr-2 w-4 h-4" />
                                            完成录音
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================================ */}
                            {/* ANALYZING 状态：AI 分析中 (HUD 风格) */}
                            {/* ============================================ */}
                            {state === "analyzing" && (
                                <motion.div
                                    key="analyzing"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="py-8"
                                >
                                    {/* 主要内容区 */}
                                    <div className="text-center space-y-8">
                                        {/* 动态图标展示 */}
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={analysisStep}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ duration: 0.3 }}
                                                className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"
                                            >
                                                {(() => {
                                                    const CurrentIcon = ANALYSIS_STEPS[analysisStep].icon;
                                                    return <CurrentIcon className="w-10 h-10 text-primary animate-pulse" />;
                                                })()}
                                            </motion.div>
                                        </AnimatePresence>

                                        {/* 当前步骤文字 */}
                                        <AnimatePresence mode="wait">
                                            <motion.p
                                                key={analysisStep}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="text-xl font-medium text-foreground"
                                            >
                                                {ANALYSIS_STEPS[analysisStep].text}
                                            </motion.p>
                                        </AnimatePresence>

                                        {/* 进度条 */}
                                        <div className="max-w-xs mx-auto">
                                            <Progress
                                                value={((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}
                                                className="h-2"
                                            />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                步骤 {analysisStep + 1} / {ANALYSIS_STEPS.length}
                                            </p>
                                        </div>

                                        {/* 步骤指示器 (小圆点) */}
                                        <div className="flex justify-center gap-2">
                                            {ANALYSIS_STEPS.map((step, i) => (
                                                <motion.div
                                                    key={i}
                                                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${i <= analysisStep
                                                            ? "bg-primary"
                                                            : "bg-muted-foreground/30"
                                                        }`}
                                                    animate={{
                                                        scale: i === analysisStep ? 1.3 : 1
                                                    }}
                                                />
                                            ))}
                                        </div>

                                        {/* 底部提示 */}
                                        <p className="text-sm text-muted-foreground animate-pulse">
                                            <Sparkles className="inline w-4 h-4 mr-1" />
                                            AI 正在深度分析您的表达逻辑...
                                        </p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

// ============================================
// 导出页面组件（带 Suspense）
// ============================================
export default function PracticePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        }>
            <PracticeContent />
        </Suspense>
    );
}
