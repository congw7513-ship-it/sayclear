import { NextRequest, NextResponse } from "next/server";
import { QUICK_SCENARIOS } from "@/lib/constants";

// ============================================
// API 配置
// ============================================
const MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MINIMAX_MODEL = "MiniMax-Text-01";
const API_TIMEOUT_MS = 8000; // 8秒超时

// 场景类型
interface GeneratedScenario {
    label: string;
    prompt: string;
}

interface ScenariosResponse {
    success: boolean;
    data?: GeneratedScenario[];
    error?: string;
}

// ============================================
// 场景生成 Prompt (精简版，加快响应)
// ============================================
function getScenarioGenerationPrompt(mode: "work" | "relationship"): string {
    const context = mode === "work" ? "职场" : "亲密关系";

    return `生成4个${context}沟通练习场景，针对"讨好型人格/冲突回避型"人群。

要求：
- label: 2-4字标题（不要emoji）
- prompt: 15-30字具体情境描述

直接返回JSON数组：
[{"label":"标题","prompt":"描述"},{"label":"标题","prompt":"描述"},{"label":"标题","prompt":"描述"},{"label":"标题","prompt":"描述"}]`;
}

// ============================================
// 带超时的 fetch
// ============================================
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ============================================
// 调用 MiniMax 生成场景
// ============================================
async function generateScenariosWithMiniMax(
    mode: "work" | "relationship",
    apiKey: string
): Promise<GeneratedScenario[]> {
    console.log("[Scenarios] 开始生成动态场景...");

    const prompt = getScenarioGenerationPrompt(mode);

    const response = await fetchWithTimeout(MINIMAX_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: MINIMAX_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 500, // 限制输出长度加快响应
        }),
    }, API_TIMEOUT_MS);

    if (!response.ok) {
        throw new Error(`MiniMax 错误: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
        throw new Error("空响应");
    }

    // 提取 JSON 数组
    const startIndex = content.indexOf("[");
    const endIndex = content.lastIndexOf("]");
    if (startIndex === -1 || endIndex === -1) {
        throw new Error("格式错误");
    }

    const scenarios: GeneratedScenario[] = JSON.parse(content.substring(startIndex, endIndex + 1));

    if (!Array.isArray(scenarios) || scenarios.length === 0) {
        throw new Error("无效数据");
    }

    console.log("[Scenarios] 生成完成! 数量:", scenarios.length);
    return scenarios;
}

// ============================================
// GET 请求处理
// ============================================
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") as "work" | "relationship" || "work";

    console.log("[API] 场景请求, 模式:", mode);

    const apiKey = process.env.MINIMAX_API_KEY;

    // 无 API Key 时直接返回静态数据
    if (!apiKey) {
        console.log("[API] 无 API Key，使用静态数据");
        return NextResponse.json<ScenariosResponse>({
            success: true,
            data: QUICK_SCENARIOS[mode] || QUICK_SCENARIOS.work,
        });
    }

    try {
        const scenarios = await generateScenariosWithMiniMax(mode, apiKey);
        return NextResponse.json<ScenariosResponse>({
            success: true,
            data: scenarios,
        });
    } catch (error) {
        console.warn("[API] 生成失败，回退到静态数据:", error);
        return NextResponse.json<ScenariosResponse>({
            success: true,
            data: QUICK_SCENARIOS[mode] || QUICK_SCENARIOS.work,
        });
    }
}
