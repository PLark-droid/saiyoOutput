import { describe, it, expect } from 'vitest';
import {
  generateCandidateMarkdown,
  generateCandidatesListMarkdown,
} from '../utils/markdownGenerator';
import type { Candidate } from '../types';

describe('markdownGenerator', () => {
  const mockCandidate: Candidate = {
    name: '山田 太郎',
    email: 'yamada@example.com',
    phone: '090-1234-5678',
    position: 'フロントエンドエンジニア',
    status: 'new',
    applicationDate: '2024-01-15',
    skills: ['React', 'TypeScript', 'Next.js'],
    notes: '即戦力として期待',
    evaluation: 4,
  };

  describe('generateCandidateMarkdown', () => {
    it('should generate markdown with candidate name as title', () => {
      const result = generateCandidateMarkdown(mockCandidate);
      expect(result).toContain('# 採用候補者: 山田 太郎');
    });

    it('should include basic information table', () => {
      const result = generateCandidateMarkdown(mockCandidate);
      expect(result).toContain('| 氏名 | 山田 太郎 |');
      expect(result).toContain('| メール | yamada@example.com |');
      expect(result).toContain('| 電話番号 | 090-1234-5678 |');
      expect(result).toContain('| 応募ポジション | フロントエンドエンジニア |');
    });

    it('should include skills section', () => {
      const result = generateCandidateMarkdown(mockCandidate);
      expect(result).toContain('## スキル');
      expect(result).toContain('- React');
      expect(result).toContain('- TypeScript');
      expect(result).toContain('- Next.js');
    });

    it('should include notes section', () => {
      const result = generateCandidateMarkdown(mockCandidate);
      expect(result).toContain('## 備考');
      expect(result).toContain('即戦力として期待');
    });

    it('should include evaluation with stars', () => {
      const result = generateCandidateMarkdown(mockCandidate);
      expect(result).toContain('★★★★☆');
      expect(result).toContain('(4/5)');
    });

    it('should handle candidate without optional fields', () => {
      const minimalCandidate: Candidate = {
        name: 'テスト 太郎',
        email: 'test@example.com',
        position: 'エンジニア',
        status: 'new',
        applicationDate: '2024-01-01',
      };

      const result = generateCandidateMarkdown(minimalCandidate);
      expect(result).toContain('# 採用候補者: テスト 太郎');
      expect(result).not.toContain('## スキル');
      expect(result).not.toContain('## 備考');
    });
  });

  describe('generateCandidatesListMarkdown', () => {
    it('should generate list markdown with count', () => {
      const candidates = [mockCandidate];
      const result = generateCandidatesListMarkdown(candidates);
      expect(result).toContain('# 採用候補者一覧');
      expect(result).toContain('総数: 1名');
    });

    it('should include table with all candidates', () => {
      const candidates: Candidate[] = [
        mockCandidate,
        {
          name: '鈴木 花子',
          email: 'suzuki@example.com',
          position: 'バックエンドエンジニア',
          status: 'interview_scheduled',
          applicationDate: '2024-01-20',
          evaluation: 3,
        },
      ];

      const result = generateCandidatesListMarkdown(candidates);
      expect(result).toContain('総数: 2名');
      expect(result).toContain('山田 太郎');
      expect(result).toContain('鈴木 花子');
      expect(result).toContain('フロントエンドエンジニア');
      expect(result).toContain('バックエンドエンジニア');
    });

    it('should handle empty candidates array', () => {
      const result = generateCandidatesListMarkdown([]);
      expect(result).toContain('総数: 0名');
    });
  });
});
