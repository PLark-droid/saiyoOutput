import axios, { type AxiosInstance } from 'axios';
import type {
  Candidate,
  LarkBaseResponse,
  LarkBaseCreateResponse,
  LarkBaseRecord,
} from '../types';

const LARK_BASE_URL = 'https://open.larksuite.com/open-apis';

interface TenantAccessTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

/**
 * LarkBase APIクライアント
 */
export class LarkClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private appId: string;
  private appSecret: string;
  private baseAppToken: string;
  private tableId: string;

  constructor() {
    this.appId = import.meta.env.VITE_LARK_APP_ID || '';
    this.appSecret = import.meta.env.VITE_LARK_APP_SECRET || '';
    this.baseAppToken = import.meta.env.VITE_LARK_BASE_APP_TOKEN || '';
    this.tableId = import.meta.env.VITE_LARK_TABLE_ID || '';

    this.client = axios.create({
      baseURL: LARK_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * アクセストークンを取得
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken;
    }

    const response = await this.client.post<TenantAccessTokenResponse>(
      '/auth/v3/tenant_access_token/internal',
      {
        app_id: this.appId,
        app_secret: this.appSecret,
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`Failed to get access token: ${response.data.msg}`);
    }

    this.accessToken = response.data.tenant_access_token;
    this.tokenExpiry = now + (response.data.expire - 60) * 1000;

    return this.accessToken;
  }

  /**
   * 認証ヘッダー付きリクエスト
   */
  private async authRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown
  ): Promise<T> {
    const token = await this.getAccessToken();
    const response = await this.client.request<T>({
      method,
      url,
      data,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }

  /**
   * 候補者をLarkBaseからフィールドにマッピング
   */
  private mapCandidateToFields(candidate: Candidate): Record<string, unknown> {
    return {
      '氏名': candidate.name,
      'メール': candidate.email,
      '電話番号': candidate.phone || '',
      '応募ポジション': candidate.position,
      'ステータス': candidate.status,
      '応募日': candidate.applicationDate,
      '面接日': candidate.interviewDate || '',
      '評価': candidate.evaluation || 0,
      '備考': candidate.notes || '',
      '履歴書URL': candidate.resumeUrl || '',
      'スキル': candidate.skills?.join(', ') || '',
    };
  }

  /**
   * LarkBaseレコードから候補者へマッピング
   */
  private mapRecordToCandidate(record: LarkBaseRecord): Candidate {
    const fields = record.fields as Record<string, string | number | string[]>;
    return {
      name: String(fields['氏名'] || ''),
      email: String(fields['メール'] || ''),
      phone: String(fields['電話番号'] || ''),
      position: String(fields['応募ポジション'] || ''),
      status: (fields['ステータス'] as Candidate['status']) || 'new',
      applicationDate: String(fields['応募日'] || ''),
      interviewDate: fields['面接日'] ? String(fields['面接日']) : undefined,
      evaluation: fields['評価'] ? Number(fields['評価']) : undefined,
      notes: fields['備考'] ? String(fields['備考']) : undefined,
      resumeUrl: fields['履歴書URL'] ? String(fields['履歴書URL']) : undefined,
      skills: fields['スキル']
        ? String(fields['スキル']).split(', ').filter(Boolean)
        : undefined,
    };
  }

  /**
   * 候補者一覧を取得
   */
  async getCandidates(): Promise<Candidate[]> {
    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${this.tableId}/records`;
    const response = await this.authRequest<LarkBaseResponse>('GET', url);

    if (response.code !== 0) {
      throw new Error(`Failed to get candidates: ${response.msg}`);
    }

    return response.data.records.map((record) =>
      this.mapRecordToCandidate(record)
    );
  }

  /**
   * 候補者を登録
   */
  async createCandidate(candidate: Candidate): Promise<LarkBaseRecord> {
    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${this.tableId}/records`;
    const response = await this.authRequest<LarkBaseCreateResponse>(
      'POST',
      url,
      {
        fields: this.mapCandidateToFields(candidate),
      }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to create candidate: ${response.msg}`);
    }

    return response.data.record;
  }

  /**
   * 複数候補者を一括登録
   */
  async createCandidates(candidates: Candidate[]): Promise<LarkBaseRecord[]> {
    const results: LarkBaseRecord[] = [];
    for (const candidate of candidates) {
      const record = await this.createCandidate(candidate);
      results.push(record);
    }
    return results;
  }

  /**
   * 設定が有効かチェック
   */
  isConfigured(): boolean {
    return !!(
      this.appId &&
      this.appSecret &&
      this.baseAppToken &&
      this.tableId
    );
  }
}

export const larkClient = new LarkClient();
