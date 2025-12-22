import type { Candidate } from '../types';
import { STATUS_LABELS } from '../types';

/**
 * 候補者情報からMarkdownドキュメントを生成
 */
export function generateCandidateMarkdown(candidate: Candidate): string {
  const lines: string[] = [];

  lines.push(`# 採用候補者: ${candidate.name}`);
  lines.push('');
  lines.push('## 基本情報');
  lines.push('');
  lines.push(`| 項目 | 内容 |`);
  lines.push(`|------|------|`);
  lines.push(`| 氏名 | ${candidate.name} |`);
  lines.push(`| メール | ${candidate.email} |`);
  if (candidate.phone) {
    lines.push(`| 電話番号 | ${candidate.phone} |`);
  }
  lines.push(`| 応募ポジション | ${candidate.position} |`);
  lines.push(`| ステータス | ${STATUS_LABELS[candidate.status]} |`);
  lines.push(`| 応募日 | ${candidate.applicationDate} |`);
  if (candidate.interviewDate) {
    lines.push(`| 面接日 | ${candidate.interviewDate} |`);
  }
  if (candidate.evaluation !== undefined) {
    lines.push(`| 評価 | ${'★'.repeat(candidate.evaluation)}${'☆'.repeat(5 - candidate.evaluation)} (${candidate.evaluation}/5) |`);
  }

  if (candidate.skills && candidate.skills.length > 0) {
    lines.push('');
    lines.push('## スキル');
    lines.push('');
    candidate.skills.forEach((skill) => {
      lines.push(`- ${skill}`);
    });
  }

  if (candidate.notes) {
    lines.push('');
    lines.push('## 備考');
    lines.push('');
    lines.push(candidate.notes);
  }

  if (candidate.resumeUrl) {
    lines.push('');
    lines.push('## 添付書類');
    lines.push('');
    lines.push(`- [履歴書](${candidate.resumeUrl})`);
  }

  lines.push('');
  lines.push('---');
  lines.push(`*生成日時: ${new Date().toLocaleString('ja-JP')}*`);

  return lines.join('\n');
}

/**
 * 複数候補者の一覧Markdownを生成
 */
export function generateCandidatesListMarkdown(candidates: Candidate[]): string {
  const lines: string[] = [];

  lines.push('# 採用候補者一覧');
  lines.push('');
  lines.push(`総数: ${candidates.length}名`);
  lines.push('');
  lines.push('| 氏名 | ポジション | ステータス | 応募日 | 評価 |');
  lines.push('|------|------------|------------|--------|------|');

  candidates.forEach((candidate) => {
    const evaluation = candidate.evaluation
      ? `${'★'.repeat(candidate.evaluation)}`
      : '-';
    lines.push(
      `| ${candidate.name} | ${candidate.position} | ${STATUS_LABELS[candidate.status]} | ${candidate.applicationDate} | ${evaluation} |`
    );
  });

  lines.push('');
  lines.push('---');
  lines.push(`*生成日時: ${new Date().toLocaleString('ja-JP')}*`);

  return lines.join('\n');
}

/**
 * Markdownファイルをダウンロード
 */
export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
