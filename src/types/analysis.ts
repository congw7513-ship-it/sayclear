// 分析结果的 TypeScript 接口定义
// 匹配 GPT-4o 返回的 JSON Schema

export interface AnalysisScores {
    /** 共情力评分 (0-100) - 是否照顾到了对方情绪 */
    empathy: number;
    /** 非暴力沟通评分 (0-100) - 是否符合观察/感受/需求/请求 */
    nvc_score: number;
    /** 安全感评分 (0-100) - 是否不带攻击性 */
    safety: number;
}

export interface PrepAnalysis {
    /** 是否检测到观点/结论 */
    point_detected: boolean;
    /** 结论的位置 */
    conclusion_position: "start" | "middle" | "end" | "missing";
}

export interface Segment {
    /** 用户文本中的片段 */
    text: string;
    /** 高亮类型：好（绿色）或差（红色） */
    type: "highlight_good" | "highlight_bad";
    /** 对该片段的具体评论 */
    comment: string;
}

export interface AnalysisResult {
    /** 三项评分 */
    scores: AnalysisScores;
    /** 一句话诊断：最关键的问题 */
    diagnosis: string;
    /** PREP 结构分析 */
    prep_analysis: PrepAnalysis;
    /** 改进建议列表 */
    advice: string[];
    /** 需要高亮的文本片段 */
    segments: Segment[];
    /** 原始录音转录文本 */
    original_transcript?: string;
}

// API 请求类型
export interface AnalyzeRequest {
    /** 用户输入的文本（语音转文字后的结果，或直接输入的文本） */
    text: string;
    /** 话题类型 */
    topic?: "workplace" | "interview";
}

// API 响应类型
export interface AnalyzeResponse {
    success: boolean;
    data?: AnalysisResult;
    error?: string;
}
