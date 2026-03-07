/**
 * AI生成JSONの前処理 - トレイリングカンマやコメントを除去してパース可能にする
 */
export function sanitizeJson(input: string): string {
  let result = input.trim();

  // BOM除去
  result = result.replace(/^\uFEFF/, '');

  // 単一行コメント除去 (文字列内は除く簡易対応)
  result = result.replace(/^(\s*)\/\/.*$/gm, '$1');

  // ブロックコメント除去
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');

  // トレイリングカンマ除去 (], } の前)
  result = result.replace(/,\s*([}\]])/g, '$1');

  return result;
}

export function safeJsonParse<T = unknown>(input: string): T {
  const sanitized = sanitizeJson(input);
  return JSON.parse(sanitized) as T;
}
