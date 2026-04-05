/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CategoryColors, RankDef } from './types';

export const RANKS: RankDef[] = [
  {
    min: 90,
    label: 'S',
    color: '#FFD700',
    bg: 'linear-gradient(135deg, #FFD700, #FFA500)',
    title: 'セキュリティマスター',
  },
  {
    min: 70,
    label: 'A',
    color: '#E53935',
    bg: 'linear-gradient(135deg, #E53935, #FF6F61)',
    title: '脆弱性ハンター',
  },
  {
    min: 50,
    label: 'B',
    color: '#1E88E5',
    bg: 'linear-gradient(135deg, #1E88E5, #42A5F5)',
    title: 'セキュリティ見習い',
  },
  {
    min: 30,
    label: 'C',
    color: '#43A047',
    bg: 'linear-gradient(135deg, #43A047, #66BB6A)',
    title: '防御初心者',
  },
  {
    min: 0,
    label: 'D',
    color: '#78909C',
    bg: 'linear-gradient(135deg, #78909C, #B0BEC5)',
    title: '要訓練',
  },
];

export function getRank(score: number): RankDef {
  return RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1];
}

export const categoryColors: CategoryColors = {
  'SQL Injection': { bg: '#FFF3E0', fg: '#E65100', icon: '🗄️' },
  XSS: { bg: '#FBE9E7', fg: '#BF360C', icon: '🌐' },
  'Broken Auth': { bg: '#E8EAF6', fg: '#283593', icon: '🔓' },
  'Path Traversal': { bg: '#E0F2F1', fg: '#00695C', icon: '📁' },
  'Rate Limiting': { bg: '#FFF8E1', fg: '#F57F17', icon: '⏱️' },
  'JWT Vuln': { bg: '#FCE4EC', fg: '#AD1457', icon: '🎫' },
  'NoSQL Injection': { bg: '#E8F5E9', fg: '#2E7D32', icon: '🍃' },
  'Insecure Deserialization': { bg: '#F3E5F5', fg: '#6A1B9A', icon: '💣' },
};

export const floatingEmojis = ['🔒', '🛡️', '🐛', '🔍', '⚠️', '🔑', '🕵️', '💻'];
