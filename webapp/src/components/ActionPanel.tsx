import { useState } from 'react';
import type { Candidate, AIGeneratedInput } from '../types';
import { larkClient } from '../api/larkClient';

interface ActionPanelProps {
  data: AIGeneratedInput | null;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

export function ActionPanel({ data, onSuccess, onError }: ActionPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [registeredCount, setRegisteredCount] = useState(0);

  const candidates: Candidate[] =
    data?.candidates || (data?.candidate ? [data.candidate] : []);

  const isConfigured = larkClient.isConfigured();

  const handleRegister = async () => {
    if (candidates.length === 0) {
      onError('登録する候補者がありません');
      return;
    }

    if (!isConfigured) {
      onError(
        'LarkBase APIが設定されていません。環境変数を確認してください。'
      );
      return;
    }

    setIsLoading(true);
    setRegisteredCount(0);

    try {
      for (let i = 0; i < candidates.length; i++) {
        await larkClient.createCandidate(candidates[i]);
        setRegisteredCount(i + 1);
      }

      onSuccess(`${candidates.length}名の候補者をLarkBaseに登録しました`);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : 'LarkBaseへの登録に失敗しました'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="action-panel">
      <h2>アクション</h2>

      <div className="action-status">
        {!isConfigured && (
          <div className="warning-message">
            <span className="warning-icon">⚠</span>
            LarkBase API未設定
            <div className="warning-details">
              環境変数を設定してください:
              <ul>
                <li>VITE_LARK_APP_ID</li>
                <li>VITE_LARK_APP_SECRET</li>
                <li>VITE_LARK_BASE_APP_TOKEN</li>
                <li>VITE_LARK_TABLE_ID</li>
              </ul>
            </div>
          </div>
        )}

        {isConfigured && (
          <div className="success-message">
            <span className="success-icon">✓</span>
            LarkBase API設定済み
          </div>
        )}
      </div>

      <div className="action-buttons">
        <button
          onClick={handleRegister}
          disabled={!isConfigured || candidates.length === 0 || isLoading}
          className="btn-primary btn-large"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              登録中... ({registeredCount}/{candidates.length})
            </>
          ) : (
            <>
              LarkBaseに登録
              {candidates.length > 0 && (
                <span className="badge">{candidates.length}名</span>
              )}
            </>
          )}
        </button>
      </div>

      <div className="action-info">
        <h3>登録される情報</h3>
        <ul>
          <li>氏名、メール、電話番号</li>
          <li>応募ポジション、ステータス</li>
          <li>応募日、面接日</li>
          <li>評価、備考、スキル</li>
        </ul>
      </div>
    </div>
  );
}
