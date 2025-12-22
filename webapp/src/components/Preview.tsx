import ReactMarkdown from 'react-markdown';
import type { Candidate, AIGeneratedInput } from '../types';
import { STATUS_LABELS } from '../types';
import {
  generateCandidateMarkdown,
  generateCandidatesListMarkdown,
  downloadMarkdown,
} from '../utils/markdownGenerator';

interface PreviewProps {
  data: AIGeneratedInput | null;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
}

export function Preview({ data, markdown, onMarkdownChange }: PreviewProps) {
  const candidates: Candidate[] = data?.candidates || (data?.candidate ? [data.candidate] : []);

  const generateMarkdownFromData = () => {
    if (!data) return;

    let content = '';
    if (data.candidate) {
      content = generateCandidateMarkdown(data.candidate);
    } else if (data.candidates && data.candidates.length > 0) {
      content = generateCandidatesListMarkdown(data.candidates);
    }

    onMarkdownChange(content);
  };

  const handleDownload = () => {
    if (!markdown) return;

    const filename = data?.candidate
      ? `candidate_${data.candidate.name}_${new Date().toISOString().split('T')[0]}`
      : `candidates_${new Date().toISOString().split('T')[0]}`;

    downloadMarkdown(markdown, filename);
  };

  return (
    <div className="preview">
      <div className="preview-tabs">
        <div className="preview-section">
          <div className="preview-header">
            <h2>候補者データ</h2>
            <span className="badge">{candidates.length}名</span>
          </div>

          {candidates.length === 0 ? (
            <div className="empty-state">
              JSONを入力すると候補者情報が表示されます
            </div>
          ) : (
            <div className="candidates-list">
              {candidates.map((candidate, index) => (
                <CandidateCard key={index} candidate={candidate} />
              ))}
            </div>
          )}
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <h2>Markdownプレビュー</h2>
            <div className="preview-actions">
              <button
                onClick={generateMarkdownFromData}
                disabled={candidates.length === 0}
                className="btn-secondary"
              >
                Markdown生成
              </button>
              <button
                onClick={handleDownload}
                disabled={!markdown}
                className="btn-primary"
              >
                ダウンロード
              </button>
            </div>
          </div>

          <div className="markdown-editor">
            <textarea
              value={markdown}
              onChange={(e) => onMarkdownChange(e.target.value)}
              placeholder="Markdownを入力または生成してください..."
              className="markdown-textarea"
            />
          </div>

          <div className="markdown-preview">
            <h3>プレビュー</h3>
            <div className="markdown-content">
              {markdown ? (
                <ReactMarkdown>{markdown}</ReactMarkdown>
              ) : (
                <div className="empty-state">
                  Markdownが入力されるとプレビューが表示されます
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CandidateCardProps {
  candidate: Candidate;
}

function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <div className="candidate-card">
      <div className="candidate-header">
        <h3>{candidate.name}</h3>
        <span className={`status-badge status-${candidate.status}`}>
          {STATUS_LABELS[candidate.status]}
        </span>
      </div>

      <div className="candidate-info">
        <div className="info-row">
          <span className="label">ポジション:</span>
          <span className="value">{candidate.position}</span>
        </div>
        <div className="info-row">
          <span className="label">メール:</span>
          <span className="value">{candidate.email}</span>
        </div>
        {candidate.phone && (
          <div className="info-row">
            <span className="label">電話:</span>
            <span className="value">{candidate.phone}</span>
          </div>
        )}
        <div className="info-row">
          <span className="label">応募日:</span>
          <span className="value">{candidate.applicationDate}</span>
        </div>
        {candidate.evaluation !== undefined && (
          <div className="info-row">
            <span className="label">評価:</span>
            <span className="value">
              {'★'.repeat(candidate.evaluation)}
              {'☆'.repeat(5 - candidate.evaluation)}
            </span>
          </div>
        )}
      </div>

      {candidate.skills && candidate.skills.length > 0 && (
        <div className="candidate-skills">
          {candidate.skills.map((skill, index) => (
            <span key={index} className="skill-tag">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
