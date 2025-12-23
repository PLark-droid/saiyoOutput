import { useState, useCallback } from 'react';
import { JsonInput } from './components/JsonInput';
import { Preview } from './components/Preview';
import { ActionPanel } from './components/ActionPanel';
import { DocumentImport } from './components/DocumentImport';
import type { AIGeneratedInput } from './types';
import './App.css';

type TabType = 'candidate' | 'document';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('document');
  const [parsedData, setParsedData] = useState<AIGeneratedInput | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleParse = useCallback((data: AIGeneratedInput) => {
    setParsedData(data);
    setError(null);

    // Markdownが含まれていれば設定
    if (data.markdown) {
      setMarkdown(data.markdown);
    }
  }, []);

  const handleError = useCallback((message: string) => {
    setError(message);
    setSuccessMessage(null);
  }, []);

  const handleSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setError(null);
  }, []);

  const dismissMessage = () => {
    setError(null);
    setSuccessMessage(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>採用候補者 書類作成App</h1>
        <p className="subtitle">
          AIで生成したJSONを貼り付けてLarkBaseに登録
        </p>
      </header>

      {/* タブナビゲーション */}
      <nav className="tab-nav">
        <button
          className={`tab-button ${activeTab === 'document' ? 'active' : ''}`}
          onClick={() => setActiveTab('document')}
        >
          Base取り込み
        </button>
        <button
          className={`tab-button ${activeTab === 'candidate' ? 'active' : ''}`}
          onClick={() => setActiveTab('candidate')}
        >
          候補者登録
        </button>
      </nav>

      {(error || successMessage) && (
        <div
          className={`message ${error ? 'message-error' : 'message-success'}`}
          onClick={dismissMessage}
        >
          <span className="message-icon">{error ? '✗' : '✓'}</span>
          <span className="message-text">{error || successMessage}</span>
          <button className="message-close">×</button>
        </div>
      )}

      <main className="app-main">
        {activeTab === 'document' ? (
          /* Base取り込みタブ */
          <div className="panel-full">
            <DocumentImport
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </div>
        ) : (
          /* 候補者登録タブ（既存機能） */
          <>
            <div className="panel-left">
              <JsonInput onParse={handleParse} onError={handleError} />
              <ActionPanel
                data={parsedData}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>

            <div className="panel-right">
              <Preview
                data={parsedData}
                markdown={markdown}
                onMarkdownChange={setMarkdown}
              />
            </div>
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>
          Powered by <strong>Miyabi Framework</strong> |
          LarkBase連携対応
        </p>
      </footer>
    </div>
  );
}

export default App;
