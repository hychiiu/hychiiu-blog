/**
 * src/data/issues.json 的结构（由 scripts/sync-issues.mjs 生成，src/utils/issues-loader.ts 读取）。
 * 这里只描述原始 JSON；经过渲染与校验后的条目类型见 src/utils/issue-schema.ts。
 */

/** GitHub reaction 名 → 次数（如 '+1'、'heart'） */
export type Reactions = Record<string, number>;

export interface RawComment {
  id: number;
  author: string;
  avatar: string;
  authorUrl: string;
  /** GitHub author_association，'OWNER' 表示作者本人 */
  association?: string;
  body: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  reactions?: Reactions;
}

export interface RawIssue {
  number: number;
  /** 由 label 决定：post → 文章，note → 手记 */
  kind: 'post' | 'note';
  title: string;
  body: string;
  /** closed = 归档 */
  state: 'open' | 'closed';
  locked: boolean;
  lang: 'zh' | 'en';
  tags: string[];
  url: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  reactions?: Reactions;
  comments: RawComment[];
}

export interface IssuesFile {
  repo: string;
  issues: RawIssue[];
}
