import { useState, useCallback } from 'react';
import { larkClient } from '../api/larkClient';
import {
  detectDocumentType,
  validateDocument,
  convertDocument,
} from '../utils/documentConverter';
import type { DocumentType } from '../types/documents';

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
    fieldCount: number;
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
      const parsed = JSON.parse(jsonInput);
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
      const candidateName =
        docType === '職務経歴書'
          ? (parsed as any).candidate_name?.value || ''
          : (parsed as any).candidate_name || '';

      const converted = convertDocument(validated);
      const fieldCount = Object.keys(converted.record).length;

      setPreviewData({
        type: docType,
        candidateName,
        fieldCount,
      });

      onSuccess?.(`✓ ${docType}として認識しました（候補者: ${candidateName}）`);
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
      const parsed = JSON.parse(jsonInput);
      const validated = validateDocument(parsed);

      if (!validated) {
        throw new Error('ドキュメントのバリデーションに失敗しました');
      }

      const { type, record } = convertDocument(validated);

      await larkClient.createDocumentRecord(type, record);

      const candidateName =
        type === '職務経歴書'
          ? (parsed as any).candidate_name?.value || ''
          : (parsed as any).candidate_name || '';

      onSuccess?.(
        `✓ ${type}をBaseに取り込みました（候補者: ${candidateName}）`
      );

      // 成功後にリセット
      setJsonInput('');
      setDetectedType(null);
      setPreviewData(null);
    } catch (e) {
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
          placeholder={`{
  "document_type": "職務経歴書" | "推薦文" | "キャリアプラン",
  "candidate_name": "...",
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
                <th>フィールド数</th>
                <td>{previewData.fieldCount}項目</td>
              </tr>
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
          {isLoading ? '取り込み中...' : 'Baseに取り込む'}
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
  );
}
