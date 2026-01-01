import { AnalysisResult } from "@/types/analysis";

// ============================================
// MOCK 模式开关
// 设为 true 时不调用 OpenAI API，直接返回假数据
// ============================================
export const MOCK_MODE = process.env.MOCK_MODE === "true";

// Mock 数据：模拟一个 EQ Coach 分析结果
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
    scores: {
        empathy: 55,
        nvc_score: 40,
        safety: 60,
    },
    diagnosis:
        "表达中带有指责和评判，容易让对方产生防御心理。",
    prep_analysis: {
        point_detected: true,
        conclusion_position: "end",
    },
    advice: [
        "✨ 高情商重写版本：我注意到这周你迟到了三次（观察），我有些担心项目进度（感受），因为我需要团队协作顺畅（需求），你能告诉我最近是不是遇到了什么困难吗？（请求）",
        "避免使用「你总是」「你从不」这类绝对化表达，改用「我注意到」开头描述具体事实。",
        "表达感受时用「我觉得担心/困惑/着急」，而不是「你让我很生气」，把情绪归属放在自己身上。",
    ],
    segments: [
        {
            text: "你总是迟到",
            type: "highlight_bad",
            comment: "「总是」是评判性词汇，会让对方感到被攻击。改为「这周有三次迟到」更客观。",
        },
        {
            text: "我注意到项目进度受到了影响",
            type: "highlight_good",
            comment: "好！用「我注意到」开头，描述客观事实而非评价。",
        },
        {
            text: "你能理解一下我的压力吗",
            type: "highlight_bad",
            comment: "这是变相的指责。改为表达自己的需求：「我需要更稳定的协作节奏」。",
        },
        {
            text: "我们一起想想办法好吗",
            type: "highlight_good",
            comment: "邀请式结尾，体现合作意愿，是高情商的表达。",
        },
    ],
};

// 用于测试错误情况的 Mock
export const MOCK_ERROR_RESULT = {
    success: false,
    error: "输入文本太短（少于10个字），无法进行有效分析。",
};
