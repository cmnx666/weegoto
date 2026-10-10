// 站点全局信息 —— 想改站名、简介、作者，只改这一个文件
export const SITE = {
  title: 'weegoto · EEG 抑郁症识别',
  shortTitle: 'weegoto',
  description:
    '一条可复现的脑电抑郁症识别基线，以及我们在过程中发现的批次混杂问题。记录项目进展、技术路线与方法学思考。',
  author: 'weegoto 项目组',
  // 联系方式（可留空，留空则不显示）
  email: '',
  github: 'https://github.com/',
} as const;

// 三个内容栏目的元信息：路径、中文名、一句话说明
export const SECTIONS = {
  progress: {
    label: '项目进展',
    en: 'Progress',
    description: '阶段成果、实验数据、踩坑记录 —— 我们做到哪一步了。',
  },
  outlook: {
    label: '未来展望',
    en: 'Outlook',
    description: '从手工特征到深度学习与 Mamba —— 我们打算往哪走。',
  },
  notes: {
    label: '心得分享',
    en: 'Notes',
    description: '论文阅读笔记、方法学思考、工具踩坑 —— 我们学到了什么。',
  },
} as const;

export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];
