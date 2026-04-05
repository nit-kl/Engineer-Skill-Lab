/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** チャレンジのカテゴリ（meta の categoryColors と対応） */
export type VulnCategory =
  | 'SQL Injection'
  | 'XSS'
  | 'Broken Auth'
  | 'Path Traversal'
  | 'Rate Limiting'
  | 'JWT Vuln'
  | 'NoSQL Injection'
  | 'Insecure Deserialization';

export interface VulnChallenge {
  id: number;
  title: string;
  category: VulnCategory;
  /** 1〜3（表示・並び用） */
  difficulty: number;
  description: string;
  /** 表示用コード（意図的に脆弱なサンプル） */
  code: string;
  /** 0 始まりの行番号（クリック選択と正解判定） */
  vulnerableLines: number[];
  hints: string[];
  explanation: string;
  fixedCode: string;
}

export interface RankDef {
  min: number;
  label: string;
  color: string;
  bg: string;
  title: string;
}

export interface CategoryStyle {
  bg: string;
  fg: string;
  icon: string;
}

export type CategoryColors = Record<VulnCategory, CategoryStyle>;
