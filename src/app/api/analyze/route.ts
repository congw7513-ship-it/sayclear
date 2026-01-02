import { NextRequest, NextResponse } from "next/server";
import { AnalyzeResponse, AnalysisResult } from "@/types/analysis";
import { MOCK_MODE, MOCK_ANALYSIS_RESULT } from "@/lib/mock-data";
import { getSystemPrompt } from "@/lib/prompts";

// ============================================
// API 配置
// ============================================

// MiniMax 文本分析 API
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MINIMAX_MODEL = "MiniMax-Text-01";

// Groq Whisper STT API (云端)
const GROQ_API_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_WHISPER_MODEL = "whisper-large-v3";

// 使用 Groq Whisper API 进行语音转文字
// ============================================
async function transcribeAudioWithGroq(
    audioFile: File
): Promise<string> {
    console.log("🎤 [STT] 开始语音转文字 (Groq Whisper)...");
    console.log(`🎤[STT] 文件: ${audioFile.name}, 大小: ${audioFile.size} bytes, 类型: ${audioFile.type} `);

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
        throw new Error("GROQ_API_KEY 未配置");
    }

    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", GROQ_WHISPER_MODEL);
    formData.append("language", "zh"); // 中文

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${groqApiKey} `,
        },
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("🎤 [STT] ❌ Groq 转录失败:", errorText);
        throw new Error(`Groq STT 错误: ${response.status} - ${errorText} `);
    }

    const data = await response.json();
    const transcription = data.text || "";

    console.log("🎤 [STT Result]:", transcription);
    console.log("🎤 [STT] ✅ 语音转文字完成!");

    return transcription;
}

// ============================================
// 使用 MiniMax 进行情商分析
// ============================================
async function analyzeWithMiniMax(
    text: string,
    apiKey: string,
    mode: "work" | "relationship" = "work"
): Promise<AnalysisResult> {
    console.log("🧠 [LLM] 开始情商分析...");
    console.log("🧠 [LLM] 场景模式:", mode);
    console.log("🧠 [LLM] 输入文本:", text.substring(0, 200) + (text.length > 200 ? "..." : ""));

    // 构建动态 Prompt：使用新的 System Prompt 生成器
    const dynamicPrompt = getSystemPrompt(mode);

    const response = await fetch(MINIMAX_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey} `,
        },
        body: JSON.stringify({
            model: MINIMAX_MODEL,
            messages: [
                { role: "system", content: dynamicPrompt },
                { role: "user", content: text },
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("🧠 [LLM] ❌ 分析失败:", errorText);
        throw new Error(`LLM 错误: ${response.status} - ${errorText} `);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("LLM 返回了空响应");
    }

    console.log("🧠 [LLM] 原始响应:", content.substring(0, 300) + "...");

    // 尝试从内容中提取 JSON（处理可能的 markdown 代码块）
    // 尝试从内容中提取 JSON（更稳健的方式：寻找首尾大括号）
    let jsonContent = content;
    const startIndex = content.indexOf("{");
    const endIndex = content.lastIndexOf("}");

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonContent = content.substring(startIndex, endIndex + 1);
    }

    const analysisResult: AnalysisResult = JSON.parse(jsonContent);
    console.log("🧠 [LLM] ✅ 分析完成! 分数:", analysisResult.scores);

    return analysisResult;
}

// ============================================
// POST 请求处理 - 核心数据流
// ============================================
export async function POST(request: NextRequest) {
    console.log("\n" + "=".repeat(50));
    console.log("📥 [API] 收到新请求");
    console.log("=".repeat(50));

    try {
        // ============================================
        // Step 1: 检查 MOCK 模式
        // ============================================
        // Force git update check
        if (MOCK_MODE) {
            console.log("🎭 [MOCK MODE] 返回模拟数据，跳过真实 API");
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return NextResponse.json<AnalyzeResponse>({
                success: true,
                data: MOCK_ANALYSIS_RESULT,
            });
        }

        console.log("🚀 [REAL MODE] 进入真实处理流程");

        // ============================================
        // Step 2: 解析请求，获取文本内容和场景模式
        // ============================================
        const contentType = request.headers.get("content-type") || "";
        let textToAnalyze: string = "";
        let mode: "work" | "relationship" = "work"; // 默认场景

        // ------------------------------------------
        // 情况 A: FormData (音频文件上传)
        // ------------------------------------------
        if (contentType.includes("multipart/form-data")) {
            console.log("📦 [API] 接收到 FormData (音频上传)");

            const formData = await request.formData();
            const audioFile = formData.get("file") as File | null;

            if (audioFile && audioFile.size > 0) {
                console.log(`🎵[API] 检测到音频文件: ${audioFile.name} (${audioFile.size} bytes)`);

                // 🔑 关键步骤: 调用 Groq Whisper 将音频转为文字
                textToAnalyze = await transcribeAudioWithGroq(audioFile);

            } else {
                // FormData 中没有有效音频，检查是否有文本
                const textInput = formData.get("text") as string | null;
                if (textInput) {
                    textToAnalyze = textInput;
                    console.log("📝 [API] FormData 中找到文本输入");
                }
            }

            // 读取场景模式
            const modeInput = formData.get("mode") as string | null;
            if (modeInput === "work" || modeInput === "relationship") {
                mode = modeInput;
            }
            console.log("[API] 场景模式:", mode);
        }
        // ------------------------------------------
        // 情况 B: JSON (文本输入)
        // ------------------------------------------
        else if (contentType.includes("application/json")) {
            console.log("📝 [API] 接收到 JSON (文本输入)");
            const body = await request.json();
            textToAnalyze = body.text || "";

            // 读取场景模式
            if (body.mode === "work" || body.mode === "relationship") {
                mode = body.mode;
            }
            console.log("[API] 场景模式:", mode);
        }
        // ------------------------------------------
        // 情况 C: 不支持的格式
        // ------------------------------------------
        else {
            console.error("❌ [API] 不支持的 Content-Type:", contentType);
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: `不支持的请求格式: ${contentType} ` },
                { status: 400 }
            );
        }

        // ============================================
        // Guardrail 2: 后端内容长度检查 (至少 5 个字符)
        // ============================================
        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            console.error("❌ [API] 没有可分析的文本");
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: "没有检测到语音内容或文本，请重新录音" },
                { status: 400 }
            );
        }

        if (textToAnalyze.trim().length < 5) {
            console.warn(`[Guardrail] 拦截到无效录音: "${textToAnalyze}"`);
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: "TOO_SHORT: 内容太少，无法分析逻辑" },
                { status: 400 }
            );
        }

        console.log("✅ [API] 待分析文本:", textToAnalyze.substring(0, 100) + "...");

        // ============================================
        // Step 4: 调用 LLM 进行逻辑分析
        // ============================================
        const llmApiKey = process.env.MINIMAX_API_KEY;
        if (!llmApiKey) {
            console.error("❌ [API] MINIMAX_API_KEY 未配置");
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: "分析服务未配置 (缺少 MINIMAX_API_KEY)" },
                { status: 500 }
            );
        }

        // 🔑 关键步骤: 用 STT 转录的文本（或用户输入的文本）进行情商分析
        const analysisResult = await analyzeWithMiniMax(textToAnalyze, llmApiKey, mode);

        // 注入原始转录文本，供前端高亮显示
        analysisResult.original_transcript = textToAnalyze;

        console.log("✅ [API] 分析完成，返回结果");
        console.log("=".repeat(50) + "\n");

        return NextResponse.json<AnalyzeResponse>({
            success: true,
            data: analysisResult,
        });

    } catch (error) {
        console.error("❌ [API] 处理错误:", error);
        return NextResponse.json<AnalyzeResponse>(
            {
                success: false,
                error: error instanceof Error ? error.message : "服务器内部错误",
            },
            { status: 500 }
        );
    }
}
