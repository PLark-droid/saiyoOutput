function extractFencedContent(input: string): string {
  const fenced = input.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1] : input;
}

function findBalancedJsonEnd(input: string, start: number): number {
  const stack: string[] = [];
  let inDouble = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inDouble) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDouble = false;
      }
      continue;
    }

    if (inSingle) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '\'') {
        inSingle = false;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      continue;
    }

    if (ch === '\'') {
      inSingle = true;
      continue;
    }

    if (ch === '{' || ch === '[') {
      stack.push(ch);
      continue;
    }

    if (ch === '}' || ch === ']') {
      if (stack.length === 0) continue;
      const opening = stack.pop();
      if (
        (opening === '{' && ch !== '}') ||
        (opening === '[' && ch !== ']')
      ) {
        return -1;
      }
      if (stack.length === 0) return i;
    }
  }

  return -1;
}

function extractLikelyJson(input: string): string {
  const text = extractFencedContent(input.trim());
  const firstBrace = text.search(/[{\[]/);
  if (firstBrace < 0) return text;

  const end = findBalancedJsonEnd(text, firstBrace);
  if (end < 0) return text.slice(firstBrace);
  return text.slice(firstBrace, end + 1);
}

function removeCommentsAndNormalizeQuotes(input: string): string {
  let output = '';
  let inDouble = false;
  let inSingle = false;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        output += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (inDouble) {
      output += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inDouble = false;
      }
      continue;
    }

    if (inSingle) {
      if (escaped) {
        if (ch === '\'') {
          output += '\'';
        } else if (ch === '"') {
          output += '\\"';
        } else {
          output += `\\${ch}`;
        }
        escaped = false;
        continue;
      }

      if (ch === '\\') {
        escaped = true;
        continue;
      }

      if (ch === '\'') {
        inSingle = false;
        output += '"';
        continue;
      }

      if (ch === '"') {
        output += '\\"';
      } else {
        output += ch;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      output += ch;
      continue;
    }

    if (ch === '\'') {
      inSingle = true;
      output += '"';
      continue;
    }

    output += ch;
  }

  return output;
}

function quoteUnquotedPropertyNames(input: string): string {
  const isIdentifierStart = (ch: string) => /[A-Za-z_$]/.test(ch);
  const isIdentifierPart = (ch: string) => /[A-Za-z0-9_$-]/.test(ch);

  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      output += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      output += ch;
      continue;
    }

    if (ch === '{' || ch === ',') {
      output += ch;
      let j = i + 1;
      let ws = '';
      while (j < input.length && /\s/.test(input[j])) {
        ws += input[j];
        j += 1;
      }

      if (j < input.length && isIdentifierStart(input[j])) {
        let k = j + 1;
        while (k < input.length && isIdentifierPart(input[k])) {
          k += 1;
        }

        const key = input.slice(j, k);
        let k2 = k;
        let keyWs = '';
        while (k2 < input.length && /\s/.test(input[k2])) {
          keyWs += input[k2];
          k2 += 1;
        }

        if (input[k2] === ':') {
          output += `${ws}"${key}"${keyWs}:`;
          i = k2;
          continue;
        }
      }

      output += ws;
      i = j - 1;
      continue;
    }

    output += ch;
  }

  return output;
}

function removeTrailingCommas(input: string): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inString) {
      output += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      output += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) {
        j += 1;
      }
      if (input[j] === '}' || input[j] === ']') {
        continue;
      }
    }

    output += ch;
  }

  return output;
}

/**
 * AI生成JSONの前処理:
 * - markdown code fence除去
 * - コメント除去
 * - 単一引用符文字列をJSON文字列へ正規化
 * - 非引用プロパティ名を引用符付きに変換
 * - トレイリングカンマ除去
 */
export function sanitizeJson(input: string): string {
  const noBom = input.replace(/^\uFEFF/, '');
  const extracted = extractLikelyJson(noBom);
  const withoutComments = removeCommentsAndNormalizeQuotes(extracted);
  const quotedKeys = quoteUnquotedPropertyNames(withoutComments);
  return removeTrailingCommas(quotedKeys).trim();
}

export function safeJsonParse<T = unknown>(input: string): T {
  const sanitized = sanitizeJson(input);
  return JSON.parse(sanitized) as T;
}
