import { useState, useCallback } from 'react';
import type { AIGeneratedInput, Candidate } from '../types';

interface JsonInputProps {
  onParse: (data: AIGeneratedInput) => void;
  onError: (error: string) => void;
}

const SAMPLE_JSON = `{
  "candidate": {
    "name": "山田 太郎",
    "email": "yamada@example.com",
    "phone": "090-1234-5678",
    "position": "フロントエンドエンジニア",
    "status": "new",
    "applicationDate": "2024-01-15",
    "skills": ["React", "TypeScript", "Next.js"],
    "notes": "即戦力として期待"
  }
}`;

function validateCandidate(candidate: Candidate): void {
  if (!candidate.name) throw new Error('氏名は必須です');
  if (!candidate.email) throw new Error('メールは必須です');
  if (!candidate.position) throw new Error('応募ポジションは必須です');
  if (!candidate.status) throw new Error('ステータスは必須です');
  if (!candidate.applicationDate) throw new Error('応募日は必須です');
}

export function JsonInput({ onParse, onError }: JsonInputProps) {
  const [jsonText, setJsonText] = useState('');
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const validateAndParse = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setIsValid(null);
        return;
      }

      try {
        const parsed = JSON.parse(text) as AIGeneratedInput;

        // 基本的なバリデーション
        if (parsed.candidate) {
          validateCandidate(parsed.candidate);
        }
        if (parsed.candidates) {
          parsed.candidates.forEach(validateCandidate);
        }

        setIsValid(true);
        onParse(parsed);
      } catch (error) {
        setIsValid(false);
        onError(error instanceof Error ? error.message : 'Invalid JSON');
      }
    },
    [onParse, onError]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    validateAndParse(text);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    setTimeout(() => validateAndParse(text), 0);
  };

  const loadSample = () => {
    setJsonText(SAMPLE_JSON);
    validateAndParse(SAMPLE_JSON);
  };

  const clear = () => {
    setJsonText('');
    setIsValid(null);
  };

  return (
    <div className="json-input">
      <div className="json-input-header">
        <h2>JSON入力</h2>
        <div className="json-input-actions">
          <button onClick={loadSample} className="btn-secondary">
            サンプル読込
          </button>
          <button onClick={clear} className="btn-secondary">
            クリア
          </button>
        </div>
      </div>

      <textarea
        value={jsonText}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder="AIで生成したJSONをここに貼り付けてください..."
        className={`json-textarea ${
          isValid === true ? 'valid' : isValid === false ? 'invalid' : ''
        }`}
        spellCheck={false}
      />

      <div className="json-input-status">
        {isValid === true && (
          <span className="status-valid">✓ 有効なJSON</span>
        )}
        {isValid === false && (
          <span className="status-invalid">✗ 無効なJSON</span>
        )}
      </div>
    </div>
  );
}
