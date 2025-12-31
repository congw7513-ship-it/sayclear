import { NextRequest, NextResponse } from "next/server";
import { AnalyzeResponse, AnalysisResult } from "@/types/analysis";
import { MOCK_MODE, MOCK_ANALYSIS_RESULT } from "@/lib/mock-data";

// ============================================
// API 配置
// ============================================

// MiniMax 文本分析 API
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MINIMAX_MODEL = "MiniMax-Text-01";

// 本地 Faster-Whisper STT 服务
const LOCAL_WHISPER_URL = "http://localhost:5000/transcribe";

// System Prompt for Logic Master
const SYSTEM_PROMPT = `# Role
You are "Logic Master," a senior communication coach specializing in workplace reporting. Your goal is to analyze the user's spoken transcript (which may contain minor STT errors) and provide a rigorous critique based strictly on logical structure and efficiency. You do not care about politeness; you care about clarity and impact.

# Context
The user is practicing a "Workplace Report" (e.g., status update, proposal). The ideal structure is the **PREP model**:
1. **Point (P)**: State the conclusion immediately.
2. **Reason (R)**: Explain why.
3. **Example/Evidence (E)**: Provide data, cases, or facts.
4. **Point (P)**: Reiterate the conclusion or call to action.

# Task
Analyze the user's input text following these steps:

1. **Pre-processing**: 
   - Ignore minor homophone errors caused by speech-to-text (STT) unless they make the sentence unintelligible.
   - Remove filler words (e.g., "um," "ah," "like," "you know") from your logical analysis but count them for the "Efficiency" score.

2. **Structural Analysis (PREP Detection)**:
   - Did the user start with the Conclusion (Point)?
   - Is there a logical link between the Reason and the Point?
   - Is the Evidence specific (numbers, facts) or vague?

3. **Scoring (0-100)**:
   - **Logic Score**: How strong is the argument? (Deduct points for logical fallacies, circular reasoning, or missing evidence).
   - **Structure Score**: How well does it fit PREP? (Deduct points heavily if the conclusion is buried at the end).
   - **Efficiency Score**: 100 minus the percentage of fluff/filler words and repetitive sentences.

4. **Feedback Generation**:
   - Provide a "One-Sentence Diagnosis" (The most critical issue).
   - Identify specific segments in the text to highlight as "Good" (Green) or "Bad" (Red).

# Constraints
- Be objective and critical. Do not give false praise.
- If the input is too short (under 10 words) or nonsensical, return an error status.
- Output strictly in JSON format.
- IMPORTANT: Respond in Chinese (Simplified) for all text fields.

# Output JSON Format
{
  "scores": {
    "logic": <int>,
    "structure": <int>,
    "efficiency": <int>
  },
  "diagnosis": "<string: A punchy, 1-sentence summary of the main problem IN CHINESE>",
  "prep_analysis": {
    "point_detected": <boolean>,
    "conclusion_position": "<string: 'start', 'middle', 'end', or 'missing'>"
  },
  "advice": [
    "<string: Specific actionable advice 1 IN CHINESE>",
    "<string: Specific actionable advice 2 IN CHINESE>"
  ],
  "segments": [
    {
      "text": "<string: excerpt from user text>",
      "type": "<string: 'highlight_good' or 'highlight_bad'>",
      "comment": "<string: specific critique for this segment IN CHINESE>"
    }
  ]
}`;

// 使用本地 Faster-Whisper 进行语音转文字
// ============================================
async function transcribeAudioWithLocalWhisper(
    audioFile: File
): Promise<string> {
    console.log("🎤 [STT] 开始语音转文字 (本地 Whisper)...");
    console.log(`🎤 [STT] 文件: ${audioFile.name}, 大小: ${audioFile.size} bytes, 类型: ${audioFile.type}`);
    console.log("正在使用本地 Faster-Whisper 模型进行识别...");

    const formData = new FormData();
    formData.append("file", audioFile);

    const response = await fetch(LOCAL_WHISPER_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("🎤 [STT] ❌ 转录失败:", errorText);

        // 如果本地服务未启动，返回更友好的错误
        if (response.status === 0 || errorText.includes("ECONNREFUSED")) {
            throw new Error("本地 Whisper 服务未启动，请先运行 whisper-server/start.bat");
        }
        throw new Error(`STT 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const transcription = data.text || "";

    console.log("🎤 [STT Result]:", transcription);
    console.log("🎤 [STT] ✅ 语音转文字完成!");

    return transcription;
}

// ============================================
// 使用 MiniMax 进行逻辑分析
// ============================================
async function analyzeWithMiniMax(
    text: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log("🧠 [LLM] 开始逻辑分析...");
    console.log("🧠 [LLM] 输入文本:", text.substring(0, 200) + (text.length > 200 ? "..." : ""));

    const response = await fetch(MINIMAX_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MINIMAX_MODEL,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: text },
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("🧠 [LLM] ❌ 分析失败:", errorText);
        throw new Error(`LLM 错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("LLM 返回了空响应");
    }

    console.log("🧠 [LLM] 原始响应:", content.substring(0, 300) + "...");

    // 尝试从内容中提取 JSON（处理可能的 markdown 代码块）
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
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
        // Step 2: 解析请求，获取文本内容
        // ============================================
        const contentType = request.headers.get("content-type") || "";
        let textToAnalyze: string = "";

        // ------------------------------------------
        // 情况 A: FormData (音频文件上传)
        // ------------------------------------------
        if (contentType.includes("multipart/form-data")) {
            console.log("📦 [API] 接收到 FormData (音频上传)");

            const formData = await request.formData();
            const audioFile = formData.get("file") as File | null;

            if (audioFile && audioFile.size > 0) {
                console.log(`🎵 [API] 检测到音频文件: ${audioFile.name} (${audioFile.size} bytes)`);

                // 🔑 关键步骤: 调用本地 Whisper 将音频转为文字
                textToAnalyze = await transcribeAudioWithLocalWhisper(audioFile);

            } else {
                // FormData 中没有有效音频，检查是否有文本
                const textInput = formData.get("text") as string | null;
                if (textInput) {
                    textToAnalyze = textInput;
                    console.log("📝 [API] FormData 中找到文本输入");
                }
            }
        }
        // ------------------------------------------
        // 情况 B: JSON (文本输入)
        // ------------------------------------------
        else if (contentType.includes("application/json")) {
            console.log("📝 [API] 接收到 JSON (文本输入)");
            const body = await request.json();
            textToAnalyze = body.text || "";
        }
        // ------------------------------------------
        // 情况 C: 不支持的格式
        // ------------------------------------------
        else {
            console.error("❌ [API] 不支持的 Content-Type:", contentType);
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: `不支持的请求格式: ${contentType}` },
                { status: 400 }
            );
        }

        // ============================================
        // Step 3: 验证输入文本
        // ============================================
        if (!textToAnalyze || textToAnalyze.trim().length === 0) {
            console.error("❌ [API] 没有可分析的文本");
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: "没有检测到语音内容或文本，请重新录音" },
                { status: 400 }
            );
        }

        if (textToAnalyze.trim().length < 10) {
            console.error("❌ [API] 文本太短:", textToAnalyze);
            return NextResponse.json<AnalyzeResponse>(
                { success: false, error: "录音内容太短（少于10个字），请录制更长的内容" },
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

        // 🔑 关键步骤: 用 STT 转录的文本（或用户输入的文本）进行分析
        const analysisResult = await analyzeWithMiniMax(textToAnalyze, llmApiKey);

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
