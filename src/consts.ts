// 站点全局信息 —— 想改站名、简介、作者，只改这一个文件
export const SITE = {
  title: 'weegoto · EEG 抑郁症识别',
  shortTitle: 'weegoto',
  description:
    '一条可复现的脑电抑郁症识别基线，以及我们在过程中发现的批次混杂问题。记录项目进展、技术路线与方法学思考。',
  author: 'weegoto 项目组',
  // 联系方式（可留空，留空则不显示）
  email: '',
  github: 'https://github.com/cmnx666/weegoto',
} as const;

// 仓库信息 —— 访客投稿功能靠它拼出 Issue 链接
export const REPO = {
  owner: 'cmnx666',
  name: 'weegoto',
  slug: 'cmnx666/weegoto',
  url: 'https://github.com/cmnx666/weegoto',
} as const;

// 访客投稿配置
export const CONTRIBUTE = {
  // 在 Issue 上打上这个标签，机器人就会把 Issue 转成文章并发布
  acceptLabel: '已采纳',
  // 投稿入口：打开预填好的 Issue 表单（模板文件名必须与 .github/ISSUE_TEMPLATE/ 下一致）
  submitUrl: `${REPO.url}/issues/new?template=submit-note.yml&title=${encodeURIComponent('[投稿] ')}`,
  // 查看所有投稿与进度
  issuesUrl: `${REPO.url}/issues`,
  // 投稿指南页
  guideUrl: '/contribute',
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
    description:
      '论文阅读笔记、方法学思考、工具踩坑 —— 我们学到了什么。本栏目向所有访客开放投稿。',
  },
} as const;

export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

/**
 * 主导航 —— 全站唯一数据源。
 * Header（各内容页顶栏）与 Timeline（主页左上角）都引用它，
 * 保证「切换页面的按钮」在任何页面都完全一致（文案、顺序、目标）。
 */
export const NAV = [
  ...SECTION_KEYS.map((k) => ({ href: `/${k}`, label: SECTIONS[k].label })),
  { href: '/resources', label: '资源' },
  { href: '/about', label: '关于' },
] as const;
