/**
 * JSONの変換結果をテストするスクリプト
 */

import { detectDocumentType, validateDocument, convertDocument } from '../src/utils/documentConverter';

const testJson = {
  "document_type": "推薦文",
  "creation_date": "20XX年XX月XX日",
  "candidate_name": "○○ ○○",

  "sections": [
    {
      "section_id": "candidate_overview",
      "heading": "■候補者概要",
      "heading_level": "heading1",
      "content": {
        "text": "○○様は、非常に明るく親しみやすい人柄です。"
      }
    },
    {
      "section_id": "reason_for_change",
      "heading": "■転職理由",
      "heading_level": "heading1",
      "content": {
        "text": "○○様が今回転職を検討されている理由は、前向きな成長意欲です。"
      }
    },
    {
      "section_id": "recommendation_reason",
      "heading": "■推薦理由",
      "heading_level": "heading1",
      "content": {
        "introduction": "私が○○様を強く推薦する理由は、以下の3点です。",
        "reasons": [
          {
            "id": "reason_1",
            "heading": "1. 稀有な人材",
            "heading_level": "heading2",
            "description": "○○様は、高度な技術力を持っています。"
          },
          {
            "id": "reason_2",
            "heading": "2. 自己学習力",
            "heading_level": "heading2",
            "description": "○○様は、自己学習力に長けています。"
          }
        ],
        "aspiration_and_potential": {
          "heading": "○○様の志向性と将来性",
          "heading_level": "heading2",
          "content": "○○様は、次のステージに進みたいと考えています。"
        },
        "overall_assessment": {
          "heading": "総評",
          "heading_level": "heading2",
          "content": "○○様は、非常に稀有な人材です。"
        }
      }
    },
    {
      "section_id": "conditions",
      "heading": "■条件面",
      "heading_level": "heading1",
      "content": {
        "table": {
          "rows": [
            {
              "cells": [
                {"content": "希望年収", "type": "label"},
                {"content": "500万円", "type": "value"}
              ]
            },
            {
              "cells": [
                {"content": "転職時期", "type": "label"},
                {"content": "即日可能", "type": "value"}
              ]
            },
            {
              "cells": [
                {"content": "勤務地", "type": "label"},
                {"content": "東京都内", "type": "value"}
              ]
            },
            {
              "cells": [
                {"content": "休日", "type": "label"},
                {"content": "土日祝休み", "type": "value"}
              ]
            },
            {
              "cells": [
                {"content": "職種", "type": "label"},
                {"content": "3DCGデザイナー", "type": "value"}
              ]
            },
            {
              "cells": [
                {"content": "その他", "type": "label"},
                {"content": "リモートワーク希望", "type": "value"}
              ]
            }
          ]
        }
      }
    }
  ],

  "footer": {
    "text": "以上",
    "alignment": "right"
  }
};

console.log('🔍 変換テスト\n');

// ドキュメントタイプ検出
const docType = detectDocumentType(testJson);
console.log('検出タイプ:', docType);

// バリデーション
const validated = validateDocument(testJson);
if (!validated) {
  console.log('❌ バリデーション失敗');
  process.exit(1);
}

console.log('✓ バリデーション成功\n');

// 変換
try {
  const { type, record } = convertDocument(validated);
  console.log('変換タイプ:', type);
  console.log('\n📋 変換結果:');
  console.log('─'.repeat(50));

  for (const [key, value] of Object.entries(record)) {
    const displayValue = typeof value === 'string' && value.length > 100
      ? value.substring(0, 100) + '...'
      : value;
    console.log(`${key}: ${displayValue}`);
  }

  console.log('\n✅ 変換成功');
} catch (error) {
  console.log('❌ 変換エラー:', error);
}
