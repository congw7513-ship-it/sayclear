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
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { MOCK_MODE } from "@/lib/mock-data";
import { AnalyzeResponse } from "@/types/analysis";


// ============================================
// 状态机类型定义
// ============================================
type PracticeState = "idle" | "thinking" | "recording" | "analyzing";



// 场景配置 - 情绪翻译官定位
type ScenarioMode = "work" | "relationship";


// 场景数据结构
interface Scenario {
    title: string;
    subtitle: string;
    placeholder: string;
    buttonText: string;
}

// 场景池配置
const SCENARIO_POOLS: Record<ScenarioMode, Scenario[]> = {
    work: [
        {
            title: "职场嘴替：把不满变成专业",
            subtitle: "现在的场景：\n临下班 5 分钟，甲方突然发来第 10 版修改意见，\n推翻了核心逻辑，还轻飘飘地说“很简单，今晚改完再走”。\n（无需客气，在这里把想怼的话都说出来）",
            placeholder: "例如：这个需求改了800遍了，你们到底懂不懂产品？（尽管吐槽）",
            buttonText: "按住吐槽"
        },
        {
            title: "拒绝背锅：优雅回击甩锅行为",
            subtitle: "现在的场景：\n明明是第三方接口挂了导致项目延期，\n周会上同事却暗示是你跟进不到位，老板的脸色已经沉下来了。\n（别忍着，把事情的真相和委屈说出来）",
            placeholder: "例如：明明是他们的问题，凭什么赖我头上？我每天催进度记录都有！",
            buttonText: "按住反击"
        },
        {
            title: "拒绝白嫖：拒绝不合理的加班",
            subtitle: "现在的场景：\n隔壁部门的领导笑嘻嘻地过来说“就帮我看一眼，很快的”，\n结果直接想把整个模块甩给你负责，还没有任何排期。\n（不用给面子，直接表达你的拒绝）",
            placeholder: "例如：我也很忙好吗？这种大活怎么可能顺手就做了？",
            buttonText: "按住拒绝"
        },
        {
            title: "应对微管理：反击窒息式控制",
            subtitle: "现在的场景：\n老板每隔 10 分钟就问一次“进度怎么样”，\n甚至连你邮件的标点符号都要逐字修改，你感觉完全被束缚了。\n（深呼吸，把这种窒息感说出来）",
            placeholder: "例如：你能不能别一直盯着我？我是来工作的，不是来当打字员的！",
            buttonText: "按住吐槽"
        },
        {
            title: "被抢功劳：夺回属于你的光芒",
            subtitle: "现在的场景：\n整个方案都是你熬夜做的，\n结果今天的汇报会上，同事拿着你的PPT侃侃而谈，老板还夸他做得好。\n（太气人了，把你的愤怒大声说出来）",
            placeholder: "例如：那都是我一个字一个字写的！他怎么好意思说是他的？",
            buttonText: "按住吐槽"
        }
    ],
    relationship: [
        {
            title: "把你的委屈/愤怒发泄出来",
            subtitle: "现在的场景：\nTA 下班回家就瘫在沙发上刷视频，对你的话爱搭不理。\n你忙前忙后做了一桌菜，让他洗个手吃饭都要催三遍。\n（无需压抑，在这里把火气都发泄出来）",
            placeholder: "例如：你烦不烦啊？每天回家就玩手机，当我是保姆吗？（直接说大实话！）",
            buttonText: "按住倾诉"
        },
        {
            title: "拒绝家务失衡：我不是保姆",
            subtitle: "现在的场景：\n约定好轮流做家务，这周已经是你连续第 5 天洗碗了。\nTA 吃完饭推开碗筷就去打游戏，完全没有要动的意思。\n（别惯着，把你的不满发泄出来）",
            placeholder: "例如：凭什么每次都是我收拾？你手断了吗？",
            buttonText: "按住倾诉"
        },
        {
            title: "打破冷暴力：拒绝沉默",
            subtitle: "现在的场景：\n昨天吵架后 TA 就一直冷暴力，\n把家里当旅馆，问什么都不说话，把你当透明人。\n（这种感觉太糟糕了，把你的绝望喊出来）",
            placeholder: "例如：你要冷战到什么时候？这日子还过不过了？",
            buttonText: "按住倾诉"
        },
        {
            title: "对抗双重标准：我要公平",
            subtitle: "现在的场景：\nTA 可以和朋友聚会喝到半夜，\n你只是稍微晚回一点就被夺命连环 Call，这种不信任让你窒息。\n（把这种不公平的感受说出来）",
            placeholder: "例如：只许州官放火是吧？你自己玩到几点心里没数吗？",
            buttonText: "按住倾诉"
        },
        {
            title: "纪念日被遗忘：失望透顶",
            subtitle: "现在的场景：\n今天是结婚纪念日，你精心准备了礼物，\nTA 却空手回家，还一脸懵地问你“今天吃什么”，仿佛完全忘了这回事。\n（心凉了半截，把这份失望说出来）",
            placeholder: "例如：你根本就不在乎我对不对？连这种日子都能忘！",
            buttonText: "按住倾诉"
        }
    ]
};

// ============================================
// 高频场景胶囊配置 (Conflict-Avoidant Support)
// ============================================
const QUICK_SCENARIOS = {
    work: [
        { label: "拒绝白嫖", prompt: "同事管我要付费资源/样品，没给钱，我不知道怎么拒绝..." },
        { label: "边界被侵犯", prompt: "休息时间/私人空间一直被工作电话打扰，我想说..." },
        { label: "被打断/无视", prompt: "我说话时总被同事打断或强行切话题，我很不爽..." },
        { label: "谈钱/利益", prompt: "我觉得我的付出和回报不成正比，想争取..." }
    ],
    relationship: [
        { label: "伴侣冷暴力", prompt: "对方拒绝沟通/回避问题，我感觉很无助..." },
        { label: "家务分配不公", prompt: "只有我一个人在忙里忙外，对方在那玩手机..." },
        { label: "这种玩笑不好笑", prompt: "对方说的话让我不舒服，但他觉得我开不起玩笑..." }
    ]
};

function QuickScenarioSelector({
    mode,
    onSelect
}: {
    mode: ScenarioMode;
    onSelect: (scenario: { label: string; prompt: string }) => void
}) {
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

// ============================================
// 动态波形可视化组件（精简版）
// ============================================
function WaveformVisualizer({ isRecording }: { isRecording: boolean }) {
    const [bars, setBars] = useState<number[]>(Array(20).fill(4));
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isRecording) {
            setTimeout(() => setBars(Array(20).fill(4)), 0);
            return;
        }

        const animate = () => {
            setBars(prev => prev.map(() =>
                isRecording ? Math.random() * 24 + 6 : 4
            ));
            animationRef.current = requestAnimationFrame(animate);
        };

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
        <div className="flex items-center justify-center gap-0.5 h-10">
            {bars.map((height, i) => (
                <motion.div
                    key={i}
                    className="w-0.5 bg-primary/60 rounded-full"
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
// 呼吸动画光晕
// ============================================
function BreathingHalo({ mode }: { mode: ScenarioMode }) {
    return (
        <div className="relative flex items-center justify-center w-48 h-48 mx-auto mb-4">
            {/* 核心光晕层 1 */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={`absolute inset-0 rounded-full blur-3xl ${mode === "work" ? "bg-blue-200/50" : "bg-pink-200/50"
                    }`}
            />
            {/* 核心光晕层 2 (错开节奏) */}
            <motion.div
                animate={{
                    scale: [1.1, 1.3, 1.1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                    duration: 4,
                    delay: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className={`absolute inset-0 rounded-full blur-2xl ${mode === "work" ? "bg-cyan-100/40" : "bg-rose-100/40"
                    }`}
            />

            {/* 录音图标 (居中) */}
            <div className="relative z-10 bg-background/80 p-6 rounded-full shadow-sm backdrop-blur-sm border border-muted/20">
                <RecordingMicIcon />
            </div>
        </div>
    );
}

// ============================================
// 轮播安抚文案
// ============================================
const COMFORT_MESSAGES = [
    "慢慢来，我在听...",
    "把你真实的想法说出来...",
    "这里很安全...",
    "就像和朋友聊天一样...",
    "不用担心措辞...",
];

function ComfortingMessageDisplay() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % COMFORT_MESSAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="h-8 flex items-center justify-center mb-2">
            <AnimatePresence mode="wait">
                <motion.p
                    key={index}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.5 }}
                    className="text-muted-foreground font-medium"
                >
                    {COMFORT_MESSAGES[index]}
                </motion.p>
            </AnimatePresence>
        </div>
    );
}

// ============================================
// 正向计时器 (Hide Anxiety)
// ============================================
function RecordingTimer({ seconds }: { seconds: number }) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const timeString = `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

    return (
        <div className="text-center mt-2">
            <span className="text-sm font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                已录制 {timeString}
            </span>
        </div>
    );
}

// ============================================
// 主组件内容
// ============================================
function PracticeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = (searchParams.get("mode") as ScenarioMode) || "work";

    // 初始化场景（默认第一个）
    const [currentScenario, setCurrentScenario] = useState<Scenario>(SCENARIO_POOLS[mode][0]);

    // 客户端随机抽取场景
    useEffect(() => {
        // 随机选择一个场景（排除当前正在展示的，除非只有一个）
        const pool = SCENARIO_POOLS[mode];
        if (pool.length > 1) {
            const randomIndex = Math.floor(Math.random() * pool.length);
            setCurrentScenario(pool[randomIndex]);
        } else {
            setCurrentScenario(pool[0]);
        }
    }, [mode]);

    // 刷新场景
    const handleRefreshScenario = () => {
        const pool = SCENARIO_POOLS[mode];
        let nextIndex;
        // 简单随机，如果跟当前一样就重选（尽力而为）
        let attempts = 0;
        do {
            nextIndex = Math.floor(Math.random() * pool.length);
            attempts++;
        } while (pool[nextIndex].title === currentScenario.title && attempts < 3);

        setCurrentScenario(pool[nextIndex]);
        toast.success("已切换新场景", { duration: 1500 });
    };

    // 状态管理
    const [state, setState] = useState<PracticeState>("idle");
    const [recordingDuration, setRecordingDuration] = useState(0); // 正向计时 (s)
    const [permissionErrorType, setPermissionErrorType] = useState<"denied" | "not-found" | "other" | null>(null);

    // Quick Scenario State
    const [activeScenarioLabel, setActiveScenarioLabel] = useState<string | null>(null);
    const [scenarioContext, setScenarioContext] = useState<string>("");

    // 实时语音转文字状态
    const [realtimeText, setRealtimeText] = useState("");

    // 录音相关 Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null); // Web Speech API 实例
    const fullTranscriptRef = useRef(""); // 累积的完整识别文本
    const startTimeRef = useRef<number>(0); // 录音开始时间戳

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
            startTimeRef.current = Date.now(); // 记录录音开始时间

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

                // 关键修复：当识别自动结束时（用户停顿），自动重启
                recognition.onend = () => {
                    // 检查录音是否仍在进行中
                    if (streamRef.current && mediaRecorderRef.current?.state === "recording") {
                        console.log("[Web Speech API] 识别结束，自动重启...");
                        try {
                            recognition.start();
                        } catch (e) {
                            console.warn("[Web Speech API] 重启失败:", e);
                        }
                    }
                };

                recognitionRef.current = recognition;
                recognition.start();
            } else {
                console.warn("浏览器不支持 Web Speech API，跳过实时字幕");
            }

            console.log("[录音] ✅ 开始录音");
            setPermissionErrorType(null);

        } catch (error) {
            console.error("[录音] 获取麦克风权限失败:", error);

            if (error instanceof DOMException) {
                if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
                    setPermissionErrorType("denied");
                    toast.error("麦克风权限被拒绝", {
                        description: "请在浏览器设置中允许访问麦克风",
                        duration: 5000,
                    });
                } else if (error.name === "NotFoundError") {
                    setPermissionErrorType("not-found");
                    toast.error("未找到麦克风", {
                        description: "请确保您的设备有可用的麦克风",
                        duration: 5000,
                    });
                } else {
                    setPermissionErrorType("other");
                    toast.error("无法访问麦克风", {
                        description: error.message,
                        duration: 5000,
                    });
                }
            } else {
                setPermissionErrorType("other");
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

    // 正向计时逻辑 (Count Up)
    useEffect(() => {
        if (state !== "recording") return;

        const timer = setInterval(() => {
            setRecordingDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [state]);

    // 进入录音状态时自动开始录音
    // 状态变化时的清理工作 (注意：不再自动 startRecording，必须由点击触发)
    useEffect(() => {
        if (state !== "recording") {
            cleanupRecording();
        }

        return () => {
            if (state === "recording") {
                cleanupRecording();
            }
        };
    }, [state, cleanupRecording]);



    // 跳过思考，直接录音 (点击触发，兼容 iOS)
    const handleStartPractice = async () => {
        setState("recording");
        setRecordingDuration(0);
        // 必须在点击事件中直接调用 getUserMedia
        await startRecording();
    };

    // 提交分析
    const handleSubmit = useCallback(async () => {
        // ============================================
        // Guardrail 1: 前端时长检查 (至少 2 秒)
        // ============================================
        const recordingDuration = Date.now() - startTimeRef.current;
        if (recordingDuration < 2000) {
            toast.warning("说话时间太短啦，请至少说 2 秒哦！");
            setState("idle");
            cleanupRecording();
            return;
        }

        setState("analyzing");

        try {
            let jsonBody: string | null = null;

            // 停止录音清理状态 (不再上传音频文件，直接用实时转写的文本)
            await stopRecording();

            if (fullTranscriptRef.current && fullTranscriptRef.current.trim().length > 1) {
                // 优先使用 Web Speech API 的实时转写结果
                console.log("[提交] 使用 Web Speech API 文本提交");
                console.log("[提交] 文本内容:", fullTranscriptRef.current);

                jsonBody = JSON.stringify({
                    text: activeScenarioLabel
                        ? `【当前场景：${activeScenarioLabel} - ${scenarioContext}】\n用户发言：${fullTranscriptRef.current}`
                        : fullTranscriptRef.current,
                    mode
                });
            } else {
                // 如果文字也为空
                console.warn("[提交] 录音转写文本为空");
                toast.error("未检测到有效输入", {
                    description: "似乎没有识别到任何说话内容，请大声一点哦。",
                });
                setState("recording");
                return;
            }

            const response = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: jsonBody
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

            // ============================================
            // Guardrail 3: 处理后端返回的 TOO_SHORT 错误
            // ============================================
            const errorMessage = error instanceof Error ? error.message : "";
            if (errorMessage.includes("TOO_SHORT") || errorMessage.includes("内容太少")) {
                toast.warning("听不太清，或者内容太短了，请再试一次吧！");
            } else {
                toast.error("分析失败", {
                    description: errorMessage || "请稍后重试",
                });
            }
            setState("idle");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router, stopRecording, cleanupRecording]);

    // 换一道题 (已废弃，现在使用场景模式)
    // const handleNewTopic = () => {};

    // 计算进度百分比 (已废弃，不再显示倒计时进度条)
    // const getProgress = () => ...

    return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center p-2 md:p-4 overflow-hidden">
            <div className="w-full max-w-xl">
                {/* 顶部导航 */}
                <div className="flex items-center justify-between mb-4">
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
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="w-fit">
                                    {currentScenario.title}
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                                    onClick={handleRefreshScenario}
                                    title="换一个场景"
                                >
                                    <RefreshCw className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 主卡片 */}
                <Card className="overflow-hidden">
                    {/* ============================================ */}
                    {/* 常驻区域：场景引导 */}
                    {/* ============================================ */}
                    <CardHeader className="text-center pb-2 border-b bg-muted/20">
                        <Badge variant="secondary" className="w-fit mx-auto mb-4">
                            {mode === "work" ? "职场" : "亲密关系"}
                        </Badge>
                        <CardTitle className="text-2xl md:text-3xl mb-2">{currentScenario.title}</CardTitle>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                        {/* 场景描述 */}
                        <div className="bg-muted p-3 md:p-4 rounded-lg">
                            <p className="text-base text-center leading-normal whitespace-pre-line">
                                {currentScenario.subtitle}
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
                                        size="default"
                                        className="w-full text-base h-12"
                                        onClick={handleStartPractice}
                                    >
                                        <Mic className="mr-2 w-5 h-5" />
                                        {currentScenario.buttonText}
                                    </Button>
                                </motion.div>
                            )}

                            {/* ============================================ */}
                            {/* THINKING 状态：30秒思考倒计时 + PREP 提示 */}
                            {/* ============================================ */}


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
                                        {permissionErrorType ? (
                                            <div className="flex flex-col items-center justify-center h-48 mb-4">
                                                <MicOff className="w-10 h-10 text-destructive/50 mb-4" />
                                                <span className="font-medium text-destructive">
                                                    {permissionErrorType === "denied" ? "麦克风被禁用" : "麦克风错误"}
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                {/* 高频场景胶囊 */}
                                                <QuickScenarioSelector
                                                    mode={mode}
                                                    onSelect={(item) => {
                                                        setActiveScenarioLabel(item.label);
                                                        setScenarioContext(item.prompt);
                                                        toast.success(`已切换: ${item.label}`, { duration: 1500 });
                                                    }}
                                                />

                                                {/* 核心视觉：呼吸光晕 + 录音中的文案 */}
                                                <BreathingHalo mode={mode} />

                                                {/* 动态引导文案 */}
                                                <div className="h-16 flex items-center justify-center mb-2 px-4 text-center">
                                                    <AnimatePresence mode="wait">
                                                        {activeScenarioLabel ? (
                                                            <motion.div
                                                                key="scenario-prompt"
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="space-y-1"
                                                            >
                                                                <p className="text-primary font-medium">
                                                                    正在模拟【{activeScenarioLabel.replace(/^[^\u4e00-\u9fa5]+/, '')}】场景
                                                                </p>
                                                                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                                                                    &quot;别怕，把你的真实顾虑说出来，AI 帮你撑腰&quot;
                                                                </p>
                                                            </motion.div>
                                                        ) : (
                                                            <ComfortingMessageDisplay key="default-comfort" />
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <RecordingTimer seconds={recordingDuration} />
                                            </>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        {/* 移除进度条 */}
                                        {/* <Progress value={getProgress()} className="h-2" /> */}

                                        {/* 实时字幕区域 */}
                                        <div className="h-10 flex items-center justify-center mb-2">
                                            <AnimatePresence mode="wait">
                                                {realtimeText && (
                                                    <motion.div
                                                        key={realtimeText}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="text-base font-medium text-gray-400 text-center max-w-full px-4 break-words"
                                                    >
                                                        "{realtimeText}"
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* 麦克风错误提示（仅在有错误时显示） */}
                                        {permissionErrorType && (
                                            <div className="bg-muted rounded-lg p-3 text-center text-muted-foreground">
                                                <MicOff className="w-6 h-6 mx-auto mb-1 text-destructive/50" />
                                                <p className="text-sm font-medium">
                                                    {permissionErrorType === "denied" && "麦克风权限被拒绝"}
                                                    {permissionErrorType === "not-found" && "未检测到麦克风"}
                                                    {permissionErrorType === "other" && "麦克风访问失败"}
                                                </p>
                                            </div>
                                        )}

                                        {/* NVC 提醒 (已隐藏) */}
                                        {/* <div className="grid grid-cols-4 gap-1 text-center text-xs text-muted-foreground">
                                            {NVC_HINTS.map((hint: { letter: string; desc: string }, i: number) => (
                                                <div key={i} className="p-2">
                                                    <span className="font-bold text-primary">{hint.letter}</span> {hint.desc}
                                                </div>
                                            ))}
                                        </div> */}

                                        <Button
                                            variant="outline"
                                            size="default"
                                            className="w-full h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={handleSubmit}
                                        >
                                            ✓ 完成录音，开始分析
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {/* ============================================ */}
                            {/* ANALYZING 状态：AI 分析中 */}
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
                                    <div className="text-center">
                                        <div className="flex justify-center mb-6">
                                            <Loader2 className="w-16 h-16 text-primary animate-spin" />
                                        </div>
                                        <CardTitle className="text-2xl">AI 正在深度共情...</CardTitle>
                                    </div>
                                    <p className="text-muted-foreground animate-pulse text-center mt-4">
                                        正在用心聆听，为您转化高情商表达...
                                    </p>
                                    <div className="space-y-4 max-w-xs mx-auto mt-8">
                                        {["语音转文字", "捕捉情绪", "高情商转化", "生成建议"].map((step, i) => (
                                            <motion.div
                                                key={step}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.5 }}
                                                className="flex items-center gap-3"
                                            >
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: i * 0.5 + 0.3 }}
                                                >
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                </motion.div>
                                                <span className="text-muted-foreground">{step}</span>
                                            </motion.div>
                                        ))}
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
