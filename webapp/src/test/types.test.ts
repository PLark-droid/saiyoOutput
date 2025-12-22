import { describe, it, expect } from 'vitest';
import { STATUS_LABELS } from '../types';
import type { Candidate, CandidateStatus } from '../types';

describe('types', () => {
  describe('STATUS_LABELS', () => {
    it('should have all status labels defined', () => {
      const statuses: CandidateStatus[] = [
        'new',
        'screening',
        'interview_scheduled',
        'interview_completed',
        'offer',
        'hired',
        'rejected',
      ];

      statuses.forEach((status) => {
        expect(STATUS_LABELS[status]).toBeDefined();
        expect(typeof STATUS_LABELS[status]).toBe('string');
      });
    });

    it('should have correct Japanese labels', () => {
      expect(STATUS_LABELS.new).toBe('新規');
      expect(STATUS_LABELS.screening).toBe('書類選考中');
      expect(STATUS_LABELS.interview_scheduled).toBe('面接予定');
      expect(STATUS_LABELS.interview_completed).toBe('面接完了');
      expect(STATUS_LABELS.offer).toBe('オファー中');
      expect(STATUS_LABELS.hired).toBe('採用');
      expect(STATUS_LABELS.rejected).toBe('不採用');
    });
  });

  describe('Candidate type', () => {
    it('should allow valid candidate object', () => {
      const candidate: Candidate = {
        name: 'テスト 太郎',
        email: 'test@example.com',
        position: 'エンジニア',
        status: 'new',
        applicationDate: '2024-01-01',
      };

      expect(candidate.name).toBe('テスト 太郎');
      expect(candidate.email).toBe('test@example.com');
      expect(candidate.position).toBe('エンジニア');
      expect(candidate.status).toBe('new');
    });

    it('should allow optional fields', () => {
      const candidate: Candidate = {
        name: 'テスト 太郎',
        email: 'test@example.com',
        phone: '090-1234-5678',
        position: 'エンジニア',
        status: 'interview_scheduled',
        applicationDate: '2024-01-01',
        interviewDate: '2024-01-15',
        evaluation: 4,
        notes: 'メモ',
        resumeUrl: 'https://example.com/resume.pdf',
        skills: ['JavaScript', 'Python'],
      };

      expect(candidate.phone).toBe('090-1234-5678');
      expect(candidate.interviewDate).toBe('2024-01-15');
      expect(candidate.evaluation).toBe(4);
      expect(candidate.notes).toBe('メモ');
      expect(candidate.resumeUrl).toBe('https://example.com/resume.pdf');
      expect(candidate.skills).toEqual(['JavaScript', 'Python']);
    });
  });
});
