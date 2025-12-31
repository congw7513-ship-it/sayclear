import { AnalysisResult } from "@/types/analysis";

// ============================================
// MOCK 模式开关
// 设为 true 时不调用 OpenAI API，直接返回假数据
// ============================================
export const MOCK_MODE = process.env.MOCK_MODE === "true";

// Mock 数据：模拟一个中等水平的分析结果
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
    scores: {
        logic: 72,
        structure: 65,
        efficiency: 78,
    },
    diagnosis:
        "结论埋在最后，听众需要等待太久才能理解你的核心观点。",
    prep_analysis: {
        point_detected: true,
        conclusion_position: "end",
    },
    advice: [
        "把结论放在开头：先说'我建议我们采用方案A'，再解释原因。",
        "用具体数据支撑论点：比如'方案A可以节省30%的成本'，而不是'方案A更好'。",
        "减少填充词：你使用了8次'然后'和5次'就是说'，这降低了表达效率。",
    ],
    segments: [
        {
            text: "我觉得这个项目进展还可以",
            type: "highlight_bad",
            comment: "开头太模糊，缺乏具体结论。'还可以'是什么意思？",
        },
        {
            text: "我们已经完成了80%的开发工作",
            type: "highlight_good",
            comment: "好！使用了具体数据，让听众能准确理解进度。",
        },
        {
            text: "然后就是说，我们下周应该能完成",
            type: "highlight_bad",
            comment: "填充词过多（'然后就是说'），直接说'下周将完成'更有力。",
        },
        {
            text: "综上所述，项目按计划进行",
            type: "highlight_good",
            comment: "结尾有总结，但建议把这句话移到开头作为结论。",
        },
    ],
};

// 用于测试错误情况的 Mock
export const MOCK_ERROR_RESULT = {
    success: false,
    error: "输入文本太短（少于10个字），无法进行有效分析。",
};
