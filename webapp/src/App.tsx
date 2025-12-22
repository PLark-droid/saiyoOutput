import { useState, useCallback } from 'react';
import { JsonInput } from './components/JsonInput';
import { Preview } from './components/Preview';
import { ActionPanel } from './components/ActionPanel';
import type { AIGeneratedInput } from './types';
import './App.css';

function App() {
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
          AIで生成したJSONを貼り付けてLarkBaseに登録、Markdownドキュメントを作成
        </p>
      </header>

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
