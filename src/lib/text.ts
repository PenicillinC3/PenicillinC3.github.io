/** 去除 Markdown 标记，仅保留可读文本（供搜索索引/摘要用） */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // 代码块整体视为空格
    .replace(/`([^`]*)`/g, '$1') // 行内代码
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接保留文字
    .replace(/^#{1,6}\s+/gm, '') // 标题
    .replace(/^>\s?/gm, '') // 引用
    .replace(/^[-*+]\s+/gm, '') // 无序列表符
    .replace(/^\d+[.)]\s+/gm, '') // 有序列表符
    .replace(/[*_~]/g, '') // 强调符号
    .replace(/\s+/g, ' ')
    .trim();
}

/** 生成定长摘要，超出截断加省略号 */
export function excerpt(md: string, len = 140): string {
  const text = stripMarkdown(md);
  return text.length > len ? `${text.slice(0, len).trimEnd()}…` : text;
}
