import { describe, expect, it } from 'vitest';
import { safeJsonParse, sanitizeJson } from '../utils/jsonSanitizer';

describe('jsonSanitizer', () => {
  it('parses single-quoted keys and values', () => {
    const input = "{'document_type':'推薦文','candidate_name':'山田太郎'}";
    const parsed = safeJsonParse<{ document_type: string; candidate_name: string }>(
      input
    );

    expect(parsed.document_type).toBe('推薦文');
    expect(parsed.candidate_name).toBe('山田太郎');
  });

  it('removes comments and trailing commas', () => {
    const input = `
      {
        // candidate profile
        "candidate_name": "山田太郎", // inline comment
        "sections": [
          {
            "section_id": "summary",
          },
        ],
      }
    `;

    const parsed = safeJsonParse<{
      candidate_name: string;
      sections: Array<{ section_id: string }>;
    }>(input);

    expect(parsed.candidate_name).toBe('山田太郎');
    expect(parsed.sections[0].section_id).toBe('summary');
  });

  it('keeps comment-like text inside string values', () => {
    const input = `
      {
        "memo": "URL https://example.com/a//b and text /*not comment*/",
        "path": "C:/tmp/file"
      }
    `;

    const parsed = safeJsonParse<{ memo: string; path: string }>(input);
    expect(parsed.memo).toContain('https://example.com/a//b');
    expect(parsed.memo).toContain('/*not comment*/');
    expect(parsed.path).toBe('C:/tmp/file');
  });

  it('extracts JSON from markdown code fences', () => {
    const input = `
      生成結果:

      \`\`\`json
      {
        "document_type": "推薦文",
        "candidate_name": "山田太郎"
      }
      \`\`\`
    `;

    const parsed = safeJsonParse<{ document_type: string; candidate_name: string }>(
      input
    );
    expect(parsed.document_type).toBe('推薦文');
    expect(parsed.candidate_name).toBe('山田太郎');
  });

  it('escapes embedded double quotes in string values', () => {
    const input = `{
      "catchphrase": "「対象者の"本当のニーズ"を汲み取る傾聴力」",
      "next": "ok"
    }`;

    const parsed = safeJsonParse<{ catchphrase: string; next: string }>(input);
    expect(parsed.catchphrase).toBe('「対象者の"本当のニーズ"を汲み取る傾聴力」');
    expect(parsed.next).toBe('ok');
  });

  it('escapes multiple embedded quotes in a single value', () => {
    const input = `{"a": "say "hi" and "bye" please"}`;
    const parsed = safeJsonParse<{ a: string }>(input);
    expect(parsed.a).toBe('say "hi" and "bye" please');
  });

  it('quotes unquoted property names', () => {
    const input = `{document_type: "推薦文", candidate_name: "山田太郎"}`;
    const sanitized = sanitizeJson(input);
    const parsed = JSON.parse(sanitized) as {
      document_type: string;
      candidate_name: string;
    };

    expect(parsed.document_type).toBe('推薦文');
    expect(parsed.candidate_name).toBe('山田太郎');
  });
});
