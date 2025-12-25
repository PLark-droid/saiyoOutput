import axios, { type AxiosInstance } from 'axios';
import type {
  Candidate,
  LarkBaseResponse,
  LarkBaseCreateResponse,
  LarkBaseRecord,
} from '../types';
import type {
  DocumentType,
  CareerHistoryBaseRecord,
  RecommendationBaseRecord,
  CareerPlanBaseRecord,
} from '../types/documents';

// 開発環境ではViteプロキシ経由、本番環境では直接アクセス
const LARK_BASE_URL = import.meta.env.DEV ? '/lark-api' : 'https://open.larksuite.com/open-apis';

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

  // ドキュメント用テーブルID
  private careerHistoryTableId: string;
  private recommendationTableId: string;
  private careerPlanTableId: string;

  constructor() {
    this.appId = import.meta.env.VITE_LARK_APP_ID || '';
    this.appSecret = import.meta.env.VITE_LARK_APP_SECRET || '';
    this.baseAppToken = import.meta.env.VITE_LARK_BASE_APP_TOKEN || '';
    this.tableId = import.meta.env.VITE_LARK_TABLE_ID || '';

    // ドキュメント用テーブルID（環境変数から取得）
    this.careerHistoryTableId = import.meta.env.VITE_LARK_CAREER_HISTORY_TABLE_ID || '';
    this.recommendationTableId = import.meta.env.VITE_LARK_RECOMMENDATION_TABLE_ID || '';
    this.careerPlanTableId = import.meta.env.VITE_LARK_CAREER_PLAN_TABLE_ID || '';

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

  // ============================================
  // ドキュメント取り込み機能
  // ============================================

  /**
   * ドキュメントタイプからテーブルIDを取得
   */
  private getDocumentTableId(documentType: DocumentType): string {
    switch (documentType) {
      case '職務経歴書':
        return this.careerHistoryTableId;
      case '推薦文':
        return this.recommendationTableId;
      case 'キャリアプラン':
        return this.careerPlanTableId;
      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  }

  /**
   * ドキュメント用テーブルが設定されているかチェック
   */
  isDocumentTableConfigured(documentType: DocumentType): boolean {
    const tableId = this.getDocumentTableId(documentType);
    return !!(this.appId && this.appSecret && this.baseAppToken && tableId);
  }

  /**
   * 全ドキュメントテーブルの設定状況を取得
   */
  getDocumentTablesStatus(): Record<DocumentType, { configured: boolean; tableId: string }> {
    return {
      '職務経歴書': {
        configured: !!this.careerHistoryTableId,
        tableId: this.careerHistoryTableId,
      },
      '推薦文': {
        configured: !!this.recommendationTableId,
        tableId: this.recommendationTableId,
      },
      'キャリアプラン': {
        configured: !!this.careerPlanTableId,
        tableId: this.careerPlanTableId,
      },
    };
  }

  /**
   * テーブルの既存フィールド名一覧を取得
   */
  private async getTableFields(tableId: string): Promise<string[]> {
    interface FieldsResponse {
      code: number;
      msg: string;
      data: {
        items: { field_name: string }[];
      };
    }

    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${tableId}/fields`;
    const response = await this.authRequest<FieldsResponse>('GET', url);

    if (response.code !== 0) {
      throw new Error(`Failed to get table fields: ${response.msg}`);
    }

    return response.data.items.map((f) => f.field_name);
  }

  /**
   * テーブルにフィールドを追加
   */
  private async addTableField(tableId: string, fieldName: string): Promise<void> {
    interface AddFieldResponse {
      code: number;
      msg: string;
    }

    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${tableId}/fields`;
    const response = await this.authRequest<AddFieldResponse>('POST', url, {
      field_name: fieldName,
      type: 1, // テキスト型
    });

    // 1254043 = フィールドが既に存在する（エラーではない）
    if (response.code !== 0 && response.code !== 1254043) {
      throw new Error(`Failed to add field "${fieldName}": ${response.msg}`);
    }
  }

  /**
   * レコードに必要なフィールドがテーブルに存在するか確認し、不足していれば追加
   */
  private async ensureFieldsExist(
    tableId: string,
    record: Record<string, unknown>
  ): Promise<void> {
    const existingFields = await this.getTableFields(tableId);
    const recordFields = Object.keys(record);

    // 不足フィールドを特定
    const missingFields = recordFields.filter((f) => !existingFields.includes(f));

    if (missingFields.length === 0) {
      return;
    }

    console.log(`🔧 ${missingFields.length}件の不足フィールドを追加中...`);

    // 不足フィールドを追加（順次実行で安全に）
    for (const fieldName of missingFields) {
      await this.addTableField(tableId, fieldName);
      console.log(`  ✓ ${fieldName}`);
      // APIレート制限対策
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log('✅ フィールド追加完了');
  }

  /**
   * 職務経歴書をBaseに登録
   * 6社目以降の会社フィールドが不足している場合は自動追加
   */
  async createCareerHistoryRecord(
    record: CareerHistoryBaseRecord
  ): Promise<LarkBaseRecord> {
    const tableId = this.getDocumentTableId('職務経歴書');
    if (!tableId) {
      throw new Error('職務経歴書テーブルIDが設定されていません');
    }

    // 不足フィールドを自動追加
    await this.ensureFieldsExist(tableId, record);

    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${tableId}/records`;
    const response = await this.authRequest<LarkBaseCreateResponse>(
      'POST',
      url,
      { fields: record }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to create career history record: ${response.msg}`);
    }

    return response.data.record;
  }

  /**
   * 推薦文をBaseに登録
   */
  async createRecommendationRecord(
    record: RecommendationBaseRecord
  ): Promise<LarkBaseRecord> {
    const tableId = this.getDocumentTableId('推薦文');
    if (!tableId) {
      throw new Error('推薦文テーブルIDが設定されていません');
    }

    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${tableId}/records`;
    const response = await this.authRequest<LarkBaseCreateResponse>(
      'POST',
      url,
      { fields: record }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to create recommendation record: ${response.msg}`);
    }

    return response.data.record;
  }

  /**
   * キャリアプランをBaseに登録
   */
  async createCareerPlanRecord(
    record: CareerPlanBaseRecord
  ): Promise<LarkBaseRecord> {
    const tableId = this.getDocumentTableId('キャリアプラン');
    if (!tableId) {
      throw new Error('キャリアプランテーブルIDが設定されていません');
    }

    const url = `/bitable/v1/apps/${this.baseAppToken}/tables/${tableId}/records`;
    const response = await this.authRequest<LarkBaseCreateResponse>(
      'POST',
      url,
      { fields: record }
    );

    if (response.code !== 0) {
      throw new Error(`Failed to create career plan record: ${response.msg}`);
    }

    return response.data.record;
  }

  /**
   * ドキュメントをBaseに登録（統合メソッド）
   */
  async createDocumentRecord(
    documentType: DocumentType,
    record: CareerHistoryBaseRecord | RecommendationBaseRecord | CareerPlanBaseRecord
  ): Promise<LarkBaseRecord> {
    switch (documentType) {
      case '職務経歴書':
        return this.createCareerHistoryRecord(record as CareerHistoryBaseRecord);
      case '推薦文':
        return this.createRecommendationRecord(record as RecommendationBaseRecord);
      case 'キャリアプラン':
        return this.createCareerPlanRecord(record as CareerPlanBaseRecord);
      default:
        throw new Error(`Unknown document type: ${documentType}`);
    }
  }
}

export const larkClient = new LarkClient();
