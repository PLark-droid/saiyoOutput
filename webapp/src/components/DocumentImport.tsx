import { useState, useCallback } from 'react';
import { larkClient } from '../api/larkClient';
import {
  detectDocumentType,
  validateDocument,
  convertDocument,
} from '../utils/documentConverter';
import { safeJsonParse } from '../utils/jsonSanitizer';
import type { DocumentType, CandidateName } from '../types/documents';

type PreviewField = { name: string; value: string; filled: boolean };

function buildPreviewFields(record: Record<string, unknown>): PreviewField[] {
  return Object.entries(record)
    .filter(([k]) => k !== '元データJSON')
    .map(([name, raw]) => {
      const value =
        raw === null || raw === undefined
          ? ''
          : typeof raw === 'string'
            ? raw
            : String(raw);
      return { name, value, filled: value.trim().length > 0 };
    });
}

function resolveName(name: CandidateName | undefined): string {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name.display || name.value || '';
}

interface DocumentImportProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function DocumentImport({ onSuccess, onError }: DocumentImportProps) {
  const [jsonInput, setJsonInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [detectedType, setDetectedType] = useState<DocumentType | null>(null);
  const [previewData, setPreviewData] = useState<{
    type: DocumentType;
    candidateName: string;
    fields: PreviewField[];
  } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // JSONをパースしてバリデーション
  const handleValidate = useCallback(() => {
    setValidationError(null);
    setDetectedType(null);
    setPreviewData(null);

    if (!jsonInput.trim()) {
      setValidationError('JSONを入力してください');
      return;
    }

    try {
      const parsed = safeJsonParse(jsonInput);
      const docType = detectDocumentType(parsed);

      if (!docType) {
        setValidationError(
          'document_type が認識できません。「職務経歴書」「推薦文」「キャリアプラン」のいずれかを指定してください。'
        );
        return;
      }

      const validated = validateDocument(parsed);
      if (!validated) {
        setValidationError('JSONの形式が不正です。sectionsフィールドが必要です。');
        return;
      }

      setDetectedType(docType);

      // プレビュー情報を設定
      const candidateName = resolveName((parsed as any).candidate_name);

      const converted = convertDocument(validated);
      const fields = buildPreviewFields(converted.record as unknown as Record<string, unknown>);
      const filledCount = fields.filter(f => f.filled).length;

      setPreviewData({
        type: docType,
        candidateName,
        fields,
      });

      onSuccess?.(
        `✓ ${docType}として認識しました（候補者: ${candidateName} / ${filledCount}/${fields.length}フィールド格納予定）`
      );
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'JSONのパースに失敗しました';
      setValidationError(`JSONパースエラー: ${errorMessage}`);
      onError?.(errorMessage);
    }
  }, [jsonInput, onSuccess, onError]);

  // Baseに取り込み
  const handleImport = useCallback(async () => {
    if (!detectedType || !jsonInput.trim()) {
      onError?.('先にJSONをバリデーションしてください');
      return;
    }

    // テーブル設定確認
    if (!larkClient.isDocumentTableConfigured(detectedType)) {
      onError?.(
        `${detectedType}用のテーブルIDが設定されていません。環境変数を確認してください。`
      );
      return;
    }

    setIsLoading(true);

    try {
      const parsed = safeJsonParse(jsonInput);
      const validated = validateDocument(parsed);

      if (!validated) {
        throw new Error('ドキュメントのバリデーションに失敗しました');
      }

      const { type, record } = convertDocument(validated);

      // デバッグログ
      console.log('📋 変換結果:', { type, record });
      console.log('📤 API送信開始...');

      const result = await larkClient.createDocumentRecord(type, record);

      console.log('✅ API成功:', result);

      const candidateName = resolveName((parsed as any).candidate_name);

      onSuccess?.(
        `✓ ${type}をBaseに取り込みました（候補者: ${candidateName}）`
      );

      // 成功後にリセット
      setJsonInput('');
      setDetectedType(null);
      setPreviewData(null);
    } catch (e) {
      console.error('❌ インポートエラー:', e);
      const errorMessage =
        e instanceof Error ? e.message : 'Base取り込みに失敗しました';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [detectedType, jsonInput, onSuccess, onError]);

  // テーブル設定状況
  const tableStatus = larkClient.getDocumentTablesStatus();

  return (
    <div className="document-import">
      <h2 className="section-title">Base取り込み</h2>

      <div className="section-content">
        {/* テーブル設定状況 */}
        <div className="table-status">
          <h3>テーブル設定状況</h3>
          <ul className="status-list">
            {(Object.entries(tableStatus) as [DocumentType, { configured: boolean }][]).map(
              ([type, { configured }]) => (
                <li key={type} className={configured ? 'configured' : 'not-configured'}>
                  <span className="status-icon">{configured ? '✓' : '✗'}</span>
                  <span className="status-label">{type}</span>
                </li>
              )
            )}
          </ul>
        </div>

        {/* JSON入力エリア */}
        <div className="input-section">
          <label htmlFor="document-json">ドキュメントJSON</label>
          <textarea
            id="document-json"
            className="json-textarea"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder={`AIで生成したJSONをここに貼り付けてください

{
  "document_type": "職務経歴書",
  "candidate_name": { "value": "山田太郎" },
  "sections": [...]
}`}
            rows={12}
            disabled={isLoading}
          />
        </div>

        {/* バリデーションエラー */}
        {validationError && (
          <div className="validation-error">
            <span className="error-icon">✗</span>
            <span className="error-text">{validationError}</span>
          </div>
        )}

        {/* プレビュー */}
        {previewData && (
          <div className="preview-info">
            <h3>検出結果</h3>
            <table className="preview-table">
              <tbody>
                <tr>
                  <th>ドキュメントタイプ</th>
                  <td>
                    <span className={`doc-type doc-type-${previewData.type}`}>
                      {previewData.type}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>候補者名</th>
                  <td>{previewData.candidateName}</td>
                </tr>
                <tr>
                  <th>フィールド充足率</th>
                  <td>
                    {previewData.fields.filter(f => f.filled).length} / {previewData.fields.length} 項目
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: '1rem' }}>フィールド格納プレビュー</h3>
            <p className="preview-hint">
              <span className="filled-marker">●</span> 格納あり &nbsp;&nbsp;
              <span className="empty-marker">○</span> 空（JSONに対応データ無し）
            </p>
            <table className="preview-fields-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th style={{ width: '180px' }}>フィールド名</th>
                  <th>格納される値</th>
                </tr>
              </thead>
              <tbody>
                {previewData.fields.map(field => (
                  <tr key={field.name} className={field.filled ? 'row-filled' : 'row-empty'}>
                    <td style={{ textAlign: 'center' }}>
                      <span className={field.filled ? 'filled-marker' : 'empty-marker'}>
                        {field.filled ? '●' : '○'}
                      </span>
                    </td>
                    <td><strong>{field.name}</strong></td>
                    <td className="field-value-cell">
                      {field.filled ? (
                        <pre className="field-value">{field.value}</pre>
                      ) : (
                        <span className="field-empty-text">（空）</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* アクションボタン */}
        <div className="action-buttons">
          <button
            className="btn btn-secondary"
            onClick={handleValidate}
            disabled={isLoading || !jsonInput.trim()}
          >
            バリデーション
          </button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={isLoading || !detectedType}
          >
            {isLoading ? (
              <>
                <span className="spinner" />
                取り込み中...
              </>
            ) : (
              'Baseに取り込む'
            )}
          </button>
        </div>

        {/* ヘルプ */}
        <div className="help-section">
          <details>
            <summary>使い方</summary>
            <ol>
              <li>職務経歴書、推薦文、またはキャリアプランのJSONを貼り付け</li>
              <li>「バリデーション」ボタンでJSON形式を確認</li>
              <li>「Baseに取り込む」ボタンで対応するテーブルにレコード作成</li>
            </ol>
          </details>
        </div>
      </div>
    </div>
  );
}
