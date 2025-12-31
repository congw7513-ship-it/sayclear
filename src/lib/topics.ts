// 职场练习题目库
export const WORKPLACE_TOPICS = [
    {
        id: 1,
        title: "项目进度汇报",
        prompt: "向领导汇报当前项目的进展情况，包括完成的部分、遇到的问题和下一步计划。",
    },
    {
        id: 2,
        title: "方案提议",
        prompt: "你发现了一个可以提升团队效率的新方案，请向领导进行提议。",
    },
    {
        id: 3,
        title: "问题反馈",
        prompt: "项目中遇到了一个技术难题需要额外资源，请向领导说明情况并请求支持。",
    },
    {
        id: 4,
        title: "成果展示",
        prompt: "你的团队完成了一个重要里程碑，请向上级汇报成果和价值。",
    },
    {
        id: 5,
        title: "资源申请",
        prompt: "你需要为项目申请额外的预算或人力资源，请准备你的理由和规划。",
    },
];

// 面试练习题目库
export const INTERVIEW_TOPICS = [
    {
        id: 1,
        title: "自我介绍",
        prompt: "请做一个简短有力的自我介绍，突出你最大的优势和与岗位的匹配度。",
    },
    {
        id: 2,
        title: "职业规划",
        prompt: "请描述你未来3-5年的职业规划，以及为什么选择我们公司。",
    },
    {
        id: 3,
        title: "挑战经历",
        prompt: "请分享一个你在工作中遇到的最大挑战，以及你是如何解决的。",
    },
    {
        id: 4,
        title: "团队协作",
        prompt: "请举例说明你是如何在团队中发挥作用并解决冲突的。",
    },
    {
        id: 5,
        title: "离职原因",
        prompt: "请解释你离开上一家公司的原因，以及你对新机会的期待。",
    },
];

// 获取随机题目
export function getRandomTopic(type: "workplace" | "interview" = "workplace") {
    const topics = type === "workplace" ? WORKPLACE_TOPICS : INTERVIEW_TOPICS;
    return topics[Math.floor(Math.random() * topics.length)];
}

// 默认测试文本（当 Dev Mode 输入为空时使用）
export const DEFAULT_TEST_TEXT = `我觉得这个项目进展还可以。然后就是说，我们团队已经完成了大概80%的开发工作。主要是前端的页面都做完了，后端的API也基本通了。

嗯，遇到的问题就是，就是那个性能优化还没有做好，可能会影响用户体验。我们下周打算集中处理这个问题。

综上所述，项目整体是按计划进行的，预计下周可以进入测试阶段。`;
