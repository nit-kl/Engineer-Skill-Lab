import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { loadJson } from '../../utils/loadJson';
import { YoutubeEntryPoint } from './youtube-entrypoint';
import type { Rank, YoutubeContent } from './youtubeTypes';

type CatalogItem = {
  type: string;
  label: string;
  icon: string;
  desc: string;
  color: string;
};

type Category = {
  name: string;
  icon: string;
  items: CatalogItem[];
};

type PlacedNode = CatalogItem & { id: string; x: number; y: number };

type Connection = { from: string; to: string };

/** 正解のひとつ。alternativePatterns と併せてどれか1つに完全一致すれば満点 */
type SolutionPattern = {
  required: string[];
  connections: Array<[string, string]>;
};

type Challenge = {
  id: number;
  title: string;
  difficulty: string;
  diffColor: string;
  emoji: string;
  description: string;
  required: string[];
  connections: Array<[string, string]>;
  /** 同じ難易度・同じ部品集合で妥当な別の繋ぎ方 */
  alternativePatterns?: SolutionPattern[];
  explanation: string;
};

type LearningContent = {
  rankDescriptions: Record<Rank, string>;
};

const CATEGORIES: Category[] = [
  {
    name: 'クライアント層',
    icon: '👤',
    items: [
      { type: 'client', label: 'クライアント', icon: '🖥️', desc: 'Webブラウザ/モバイル', color: '#7EC8E3' },
      { type: 'mobile', label: 'モバイルアプリ', icon: '📱', desc: 'iOS/Android', color: '#80DEEA' },
    ],
  },
  {
    name: 'ネットワーク層',
    icon: '🌐',
    items: [
      { type: 'dns', label: 'DNS', icon: '🔗', desc: '名前解決（ホスト名→IP）', color: '#9575CD' },
      { type: 'cdn', label: 'CDN', icon: '🌍', desc: 'コンテンツ配信', color: '#4DD0E1' },
      { type: 'firewall', label: 'WAF/FW', icon: '🛡️', desc: 'Web攻撃防御', color: '#EF5350' },
      { type: 'lb', label: 'ロードバランサー', icon: '⚖️', desc: 'トラフィック分散', color: '#F4A261' },
      { type: 'ratelimit', label: 'レートリミッター', icon: '🚦', desc: '流量制御', color: '#FF7043' },
      { type: 'vpn', label: 'VPC/VPN', icon: '🔒', desc: '仮想ネットワーク', color: '#5C6BC0' },
    ],
  },
  {
    name: 'アプリケーション層',
    icon: '⚡',
    items: [
      { type: 'proxy', label: 'リバースプロキシ', icon: '🔀', desc: 'TLS終端・ルーティング', color: '#26A69A' },
      { type: 'gateway', label: 'API Gateway', icon: '🚪', desc: 'API管理・ルーティング', color: '#AB47BC' },
      { type: 'web', label: 'Webサーバー', icon: '🌐', desc: 'HTTP/静的配信', color: '#81C784' },
      { type: 'api', label: 'APIサーバー', icon: '⚡', desc: 'ビジネスロジック', color: '#CE93D8' },
      { type: 'grpc', label: 'gRPCサービス', icon: '📡', desc: '内部通信 高速RPC', color: '#7986CB' },
      { type: 'websocket', label: 'WebSocketサーバー', icon: '🔌', desc: 'リアルタイム双方向通信', color: '#4DB6AC' },
      { type: 'ssr', label: 'SSR/BFF', icon: '🖼️', desc: 'サーバーサイドレンダリング', color: '#9CCC65' },
      { type: 'serverless', label: 'サーバーレス', icon: 'λ', desc: '関数実行（FaaS）', color: '#FFA726' },
    ],
  },
  {
    name: '認証・セキュリティ',
    icon: '🔐',
    items: [
      { type: 'auth', label: '認証サービス', icon: '🔐', desc: 'OAuth/JWT/OIDC', color: '#F06292' },
      { type: 'secrets', label: 'シークレット管理', icon: '🗝️', desc: '鍵・資格情報の集中管理', color: '#8D6E63' },
      { type: 'ssl', label: 'SSL/TLS終端', icon: '🔏', desc: '証明書管理', color: '#78909C' },
    ],
  },
  {
    name: 'データストア',
    icon: '🗄️',
    items: [
      { type: 'db', label: 'RDB', icon: '🗄️', desc: 'リレーショナルDB', color: '#E57373' },
      { type: 'nosql', label: 'NoSQL DB', icon: '🍃', desc: 'ドキュメント／KV等', color: '#66BB6A' },
      { type: 'cache', label: 'キャッシュ', icon: '💨', desc: 'インメモリキャッシュ', color: '#FF8A65' },
      { type: 'storage', label: 'オブジェクトストレージ', icon: '📦', desc: 'オブジェクト／ファイル保存', color: '#90A4AE' },
      { type: 'search', label: '検索エンジン', icon: '🔍', desc: '全文検索・検索サービス', color: '#FFD54F' },
      { type: 'graphdb', label: 'グラフDB', icon: '🕸️', desc: 'グラフ構造のデータ', color: '#A1887F' },
      { type: 'tsdb', label: '時系列DB', icon: '📈', desc: 'メトリクス・時系列データ', color: '#4FC3F7' },
    ],
  },
  {
    name: '非同期・メッセージング',
    icon: '📬',
    items: [
      { type: 'queue', label: 'メッセージキュー', icon: '📬', desc: '非同期メッセージング', color: '#FFB74D' },
      { type: 'stream', label: 'イベントストリーム', icon: '🌊', desc: 'イベントログ・ストリーム処理', color: '#29B6F6' },
      { type: 'worker', label: 'ジョブワーカー', icon: '⚙️', desc: 'キューからジョブ取得・非同期処理', color: '#A1887F' },
      { type: 'scheduler', label: 'スケジューラー', icon: '⏰', desc: 'Cron/定期実行', color: '#FFAB91' },
    ],
  },
  {
    name: '通知・外部連携',
    icon: '🔔',
    items: [
      { type: 'email', label: 'メールサービス', icon: '📧', desc: 'トランザクションメール', color: '#4DD0E1' },
      { type: 'push', label: 'プッシュ通知', icon: '🔔', desc: 'モバイル向けプッシュ', color: '#FF8A80' },
      { type: 'sms', label: 'SMS送信', icon: '💬', desc: 'SMSゲートウェイ', color: '#80CBC4' },
      { type: 'webhook', label: 'Webhook', icon: '🪝', desc: '外部イベント連携', color: '#B39DDB' },
      { type: 'thirdparty', label: '外部API', icon: '🔌', desc: '決済/地図/AI等', color: '#BCAAA4' },
    ],
  },
  {
    name: 'インフラ・運用',
    icon: '🏗️',
    items: [
      { type: 'container', label: 'コンテナ基盤', icon: '🐳', desc: 'コンテナ実行・オーケストレーション', color: '#42A5F5' },
      { type: 'cicd', label: 'CI/CDパイプライン', icon: '🔄', desc: 'ビルド・テスト・デプロイ自動化', color: '#66BB6A' },
      { type: 'registry', label: 'コンテナレジストリ', icon: '📋', desc: 'イメージの保管・配布', color: '#7E57C2' },
      { type: 'iac', label: 'IaC', icon: '📐', desc: 'インフラのコード化', color: '#8D6E63' },
    ],
  },
  {
    name: '監視・分析',
    icon: '📊',
    items: [
      { type: 'monitor', label: '監視/アラート', icon: '📊', desc: 'メトリクス・死活監視', color: '#7E57C2' },
      { type: 'logging', label: 'ログ管理', icon: '📝', desc: 'ログ集約・検索', color: '#8D6E63' },
      { type: 'tracing', label: '分散トレーシング', icon: '🔬', desc: 'リクエストの追跡', color: '#26A69A' },
      { type: 'analytics', label: 'アクセス解析', icon: '📉', desc: '行動・トラフィック分析', color: '#EC407A' },
      { type: 'dwh', label: 'データウェアハウス', icon: '🏛️', desc: '分析向けデータ集約', color: '#5C6BC0' },
      { type: 'etl', label: 'ETL/データパイプライン', icon: '🔧', desc: '抽出・変換・ロード', color: '#78909C' },
    ],
  },
];

const ALL_COMPONENTS: CatalogItem[] = CATEGORIES.flatMap(c => c.items);

const CHALLENGES: Challenge[] = [
  {
    id: 1,
    title: '基本的なWebサイト',
    difficulty: '初級',
    diffColor: '#7EC8E3',
    emoji: '🏠',
    description: 'シンプルな静的Webサイトのアーキテクチャを構築しよう！ユーザーがブラウザからアクセスしてコンテンツを見られる構成だよ。',
    required: ['client', 'dns', 'cdn', 'web'],
    connections: [
      ['client', 'dns'],
      ['dns', 'cdn'],
      ['cdn', 'web'],
    ],
    explanation:
      'ユーザーのリクエストはまずDNSで名前解決され、CDNがキャッシュされたコンテンツを配信します。キャッシュミス時はWebサーバーからコンテンツを取得する仕組みです。',
  },
  {
    id: 2,
    title: '動的Webアプリの基本構成',
    difficulty: '中級',
    diffColor: '#F4A261',
    emoji: '💼',
    description:
      'ログインしてデータを読み書きする、動的Webアプリの構成を組み立てよう！',
    required: ['client', 'dns', 'lb', 'web', 'api', 'auth', 'db', 'cache'],
    connections: [
      ['client', 'dns'],
      ['dns', 'lb'],
      ['lb', 'web'],
      ['lb', 'api'],
      ['client', 'auth'],
      ['api', 'auth'],
      ['api', 'db'],
      ['api', 'cache'],
    ],
    explanation:
      'DNSで名前を解決してLBに入り、WebとAPIに振り分ける。ログインまわりはクライアントと認証の間、APIは認証・キャッシュ・RDBとつながる想定だよ。',
    alternativePatterns: [
      {
        required: ['client', 'dns', 'lb', 'web', 'api', 'auth', 'db', 'cache'],
        connections: [
          ['client', 'dns'],
          ['dns', 'lb'],
          ['lb', 'web'],
          ['web', 'api'],
          ['client', 'auth'],
          ['api', 'auth'],
          ['api', 'db'],
          ['api', 'cache'],
        ],
      },
    ],
  },
  {
    id: 3,
    title: '動画配信プラットフォーム',
    difficulty: '中級',
    diffColor: '#F4A261',
    emoji: '🎬',
    description: '動画のアップロード・エンコード・配信を行うプラットフォームを構築しよう！大容量の非同期処理と高速配信がポイント。',
    required: ['client', 'dns', 'lb', 'web', 'api', 'auth', 'db', 'storage', 'queue', 'worker', 'cdn'],
    connections: [
      ['client', 'dns'],
      ['dns', 'lb'],
      ['lb', 'web'],
      ['lb', 'api'],
      ['client', 'auth'],
      ['api', 'auth'],
      ['api', 'db'],
      ['api', 'storage'],
      ['api', 'queue'],
      ['queue', 'worker'],
      ['worker', 'storage'],
      ['dns', 'cdn'],
      ['cdn', 'storage'],
    ],
    explanation:
      'Webサイトの操作はDNS→LB→Web→APIの流れ（一覧・検索など）。動画用ホスト名はDNS→CDNでエッジへ。認証はクライアントとAPIの両方から認証サービスへ。APIはメタデータをRDBに、動画ファイルはオブジェクトストレージに、変換依頼はメッセージキューへ。ジョブワーカーがキューから取り出してストレージ上の動画を変換。視聴はDNS→CDN→オブジェクトストレージで重い動画をエッジ配信します。',
    alternativePatterns: [
      {
        required: ['client', 'dns', 'lb', 'web', 'api', 'auth', 'db', 'storage', 'queue', 'worker', 'cdn'],
        connections: [
          ['client', 'dns'],
          ['dns', 'lb'],
          ['lb', 'web'],
          ['web', 'api'],
          ['client', 'auth'],
          ['api', 'auth'],
          ['api', 'db'],
          ['api', 'storage'],
          ['api', 'queue'],
          ['queue', 'worker'],
          ['worker', 'storage'],
          ['dns', 'cdn'],
          ['cdn', 'storage'],
        ],
      },
    ],
  },
  {
    id: 4,
    title: 'リアルタイムチャットアプリ',
    difficulty: '中級',
    diffColor: '#F4A261',
    emoji: '💬',
    description: 'リアルタイムのメッセージ送受信ができるチャットアプリ。WebSocketとプッシュ通知で即時性を実現しよう！',
    required: ['client', 'dns', 'lb', 'api', 'websocket', 'auth', 'nosql', 'cache', 'push'],
    connections: [
      ['client', 'dns'],
      ['dns', 'lb'],
      ['lb', 'api'],
      ['lb', 'websocket'],
      ['websocket', 'api'],
      ['api', 'auth'],
      ['api', 'nosql'],
      ['api', 'cache'],
      ['api', 'push'],
    ],
    explanation:
      'DNSでサービス名を解決したうえでLBに到達し、LBがHTTPとWebSocket接続を振り分けます。WebSocketサーバーは認証・履歴保存のためにAPIと連携します（メッセージ永続化はAPI経由でNoSQLへ）。キャッシュでオンライン状態管理、プッシュ通知でオフラインユーザーに配信します。',
    alternativePatterns: [
      {
        required: ['client', 'dns', 'lb', 'api', 'websocket', 'auth', 'nosql', 'cache', 'push'],
        connections: [
          ['client', 'dns'],
          ['dns', 'lb'],
          ['lb', 'api'],
          ['lb', 'websocket'],
          ['websocket', 'auth'],
          ['websocket', 'nosql'],
          ['api', 'auth'],
          ['api', 'cache'],
          ['api', 'push'],
        ],
      },
    ],
  },
  {
    id: 5,
    title: 'EC決済フルスタック',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '💳',
    description: '決済・在庫管理・注文メールまで含む本格ECサイト。外部決済API連携とメール通知も実装しよう！',
    required: ['client', 'dns', 'cdn', 'firewall', 'gateway', 'api', 'auth', 'db', 'cache', 'thirdparty', 'queue', 'worker', 'email'],
    connections: [
      ['client', 'dns'],
      ['dns', 'cdn'],
      ['cdn', 'firewall'],
      ['firewall', 'gateway'],
      ['gateway', 'api'],
      ['api', 'auth'],
      ['api', 'db'],
      ['api', 'cache'],
      ['api', 'thirdparty'],
      ['api', 'queue'],
      ['queue', 'worker'],
      ['worker', 'email'],
    ],
    explanation:
      'CDNを「静的配信とAPIオリジンへのルーティングをまとめるエッジ」とみなした一本化です。DNS→CDN→WAF→API Gatewayの順で保護しつつバックエンドへ。認証後、APIがRDBで在庫管理し外部決済APIと連携。注文確定後はキューで非同期にジョブワーカーが確認メールを送信します。',
    alternativePatterns: [
      {
        required: [
          'client',
          'dns',
          'cdn',
          'firewall',
          'gateway',
          'api',
          'auth',
          'db',
          'cache',
          'thirdparty',
          'queue',
          'worker',
          'email',
        ],
        connections: [
          ['client', 'dns'],
          ['dns', 'cdn'],
          ['cdn', 'gateway'],
          ['gateway', 'firewall'],
          ['firewall', 'api'],
          ['api', 'auth'],
          ['api', 'db'],
          ['api', 'cache'],
          ['api', 'thirdparty'],
          ['api', 'queue'],
          ['queue', 'worker'],
          ['worker', 'email'],
        ],
      },
    ],
  },
  {
    id: 6,
    title: 'SNSアプリケーション',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '📸',
    description: 'フィード・認証・メディア管理・検索を備えたSNSアプリ。大量の同時アクセスと多様なデータ処理が必要！',
    required: ['client', 'dns', 'firewall', 'lb', 'api', 'auth', 'nosql', 'cache', 'storage', 'search', 'push'],
    connections: [
      ['client', 'dns'],
      ['dns', 'firewall'],
      ['firewall', 'lb'],
      ['lb', 'api'],
      ['api', 'auth'],
      ['api', 'nosql'],
      ['api', 'cache'],
      ['api', 'storage'],
      ['api', 'search'],
      ['api', 'push'],
    ],
    explanation:
      'DNS→WAF→LBでセキュアにルーティング。認証でユーザー管理し、NoSQLでフィード、キャッシュで高速化、ストレージでメディア管理。検索エンジンで全文検索を提供し、プッシュ通知で「いいね」等を即時通知します。',
    alternativePatterns: [
      {
        required: ['client', 'dns', 'firewall', 'lb', 'api', 'auth', 'nosql', 'cache', 'storage', 'search', 'push'],
        connections: [
          ['client', 'dns'],
          ['dns', 'lb'],
          ['lb', 'firewall'],
          ['firewall', 'api'],
          ['api', 'auth'],
          ['api', 'nosql'],
          ['api', 'cache'],
          ['api', 'storage'],
          ['api', 'search'],
          ['api', 'push'],
        ],
      },
    ],
  },
  {
    id: 7,
    title: 'IoTデータ分析基盤',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '📡',
    description:
      '大量のIoTセンサーデータを収集・蓄積・分析するプラットフォーム。ストリーム処理とデータウェアハウスがカギ！（図の「クライアント」ノードはブラウザではなくセンサー／デバイスを表します）',
    required: ['client', 'gateway', 'stream', 'worker', 'tsdb', 'etl', 'dwh', 'monitor'],
    connections: [
      ['client', 'gateway'],
      ['gateway', 'stream'],
      ['stream', 'worker'],
      ['worker', 'tsdb'],
      ['tsdb', 'etl'],
      ['etl', 'dwh'],
      ['tsdb', 'monitor'],
    ],
    explanation:
      'センサー・ゲートウェイ（図上はクライアントノード）からAPI Gateway経由でイベントストリームへ送信。ジョブワーカーがリアルタイム処理して時系列DBに蓄積。ETLパイプラインでDWHに集約し分析。監視サービスが異常値を検知してアラートを発行します。',
    alternativePatterns: [
      {
        required: ['client', 'gateway', 'stream', 'worker', 'tsdb', 'etl', 'dwh', 'monitor'],
        connections: [
          ['client', 'gateway'],
          ['gateway', 'stream'],
          ['stream', 'worker'],
          ['worker', 'tsdb'],
          ['tsdb', 'etl'],
          ['etl', 'dwh'],
          ['worker', 'monitor'],
        ],
      },
    ],
  },
  {
    id: 8,
    title: 'マイクロサービス本番環境',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '🏗️',
    description: 'コンテナオーケストレーション・CI/CD・監視まで含む本番運用レベルのマイクロサービス基盤を構築しよう！',
    required: ['client', 'dns', 'firewall', 'gateway', 'container', 'cicd', 'registry', 'api', 'db', 'queue', 'worker', 'monitor', 'logging'],
    connections: [
      ['client', 'dns'],
      ['dns', 'firewall'],
      ['firewall', 'gateway'],
      ['gateway', 'container'],
      ['container', 'api'],
      ['api', 'db'],
      ['api', 'queue'],
      ['queue', 'worker'],
      ['cicd', 'registry'],
      ['registry', 'container'],
      ['api', 'monitor'],
      ['api', 'logging'],
    ],
    explanation:
      '利用者はDNSでエンドポイントを解決してからWAFに到達します。CI/CDがコードをビルドしレジストリに保存、コンテナ基盤へデプロイ。WAF→API Gatewayで安全にルーティングし、コンテナ内のAPIサービスが処理。監視とログ管理で本番運用の可観測性を確保します。',
    alternativePatterns: [
      {
        required: [
          'client',
          'dns',
          'firewall',
          'gateway',
          'container',
          'cicd',
          'registry',
          'api',
          'db',
          'queue',
          'worker',
          'monitor',
          'logging',
        ],
        connections: [
          ['client', 'dns'],
          ['dns', 'firewall'],
          ['firewall', 'gateway'],
          ['gateway', 'container'],
          ['container', 'api'],
          ['api', 'db'],
          ['api', 'queue'],
          ['queue', 'worker'],
          ['cicd', 'registry'],
          ['registry', 'container'],
          ['container', 'monitor'],
          ['container', 'logging'],
        ],
      },
    ],
  },
];

const FLOAT_EMOJIS = ['☁️', '⭐', '💡', '🚀', '✨', '🎈', '💎', '🌸', '🧩', '🔧'];

let idCounter = 0;
const genId = () => `node-${++idCounter}`;

function catalogLabel(type: string): string {
  return ALL_COMPONENTS.find(c => c.type === type)?.label ?? type;
}

function formatSolutionExample(c: Challenge): string {
  const comps = c.required.map(catalogLabel).join('、');
  const flows = c.connections.map(([a, b]) => `${catalogLabel(a)} → ${catalogLabel(b)}`).join('\n');
  const altNote =
    c.alternativePatterns && c.alternativePatterns.length > 0
      ? '\n\n※上記と部品が同じで、別の妥当なつなぎ方も正解になります。'
      : '';
  return `使うコンポーネント: ${comps}\n\n接続（この組み合わせで結ぶ）:\n${flows}${altNote}`;
}

function evaluateAgainstPattern(
  nodes: PlacedNode[],
  userConnections: Connection[],
  pattern: SolutionPattern
): { missingComps: string[]; missingConns: Array<[string, string]>; score: number } {
  const placedTypes = new Set(nodes.map(n => n.type));
  const missingComps = pattern.required.filter(r => !placedTypes.has(r));
  const missingConns = pattern.connections.filter(([a, b]) => {
    return !userConnections.some(c => {
      const fn = nodes.find(n => n.id === c.from);
      const tn = nodes.find(n => n.id === c.to);
      if (!fn || !tn) return false;
      return (fn.type === a && tn.type === b) || (fn.type === b && tn.type === a);
    });
  });
  const reqN = pattern.required.length;
  const connN = pattern.connections.length;
  const score = Math.round(
    ((reqN - missingComps.length) / reqN) * 50 + ((connN - missingConns.length) / connN) * 50
  );
  return { missingComps, missingConns, score };
}

/** 主解答と alternativePatterns のうち、最もスコアが高いパターンで採点する */
function evaluateChallenge(
  challenge: Challenge,
  nodes: PlacedNode[],
  userConnections: Connection[]
): { score: number; missingComps: string[]; missingConns: Array<[string, string]> } {
  const patterns: SolutionPattern[] = [
    { required: challenge.required, connections: challenge.connections },
    ...(challenge.alternativePatterns ?? []),
  ];
  let best = evaluateAgainstPattern(nodes, userConnections, patterns[0]);
  for (let i = 1; i < patterns.length; i++) {
    const next = evaluateAgainstPattern(nodes, userConnections, patterns[i]);
    if (next.score > best.score) best = next;
  }
  return { score: best.score, missingComps: best.missingComps, missingConns: best.missingConns };
}

/** このチャレンジで置いてよいコンポーネント型（正解・別解パターンの和集合） */
function allowedTypesForChallenge(ch: Challenge): Set<string> {
  const s = new Set<string>();
  const take = (p: SolutionPattern) => {
    for (const t of p.required) s.add(t);
    for (const [a, b] of p.connections) {
      s.add(a);
      s.add(b);
    }
  };
  take({ required: ch.required, connections: ch.connections });
  for (const alt of ch.alternativePatterns ?? []) take(alt);
  return s;
}

function getRankByScore(score: number): Rank {
  if (score >= 100) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

const NODE_W = 108;
const NODE_H = 72;

const MIN_VIEW_SCALE = 0.35;
const MAX_VIEW_SCALE = 2.5;
const ZOOM_STEP = 1.12;

/** 空きキャンバスをドラッグしてパン開始するまでの移動量（タップ解除・接続キャンセルと区別） */
const CANVAS_PAN_POINTER_THRESHOLD_PX = 12;

/** 初期表示・ビューリセット時のパン（translate が負方向＝ドット／ノードが画面上でやや左上へ） */
const DEFAULT_VIEW_PAN = { x: -52, y: -48 };

/** ビューポートより広い論理座標系（ズームしても「置ける範囲」が画面ピクセル幅に縛られないようにする） */
const WORLD_MIN_W = 2200;
const WORLD_MIN_H = 1600;
const WORLD_VIEWPORT_FACTOR = 4;

function useCompactLayout(breakpointPx: number): boolean {
  const [compact, setCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= breakpointPx : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [breakpointPx]);

  return compact;
}

export default function CloudArchPuzzleApp() {
  const [learning, setLearning] = useState<LearningContent | null>(null);
  const [youtube, setYoutube] = useState<YoutubeContent | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const learningUrl = new URL('./content/learning.json', import.meta.url).href;
      const youtubeUrl = new URL('./content/youtube.json', import.meta.url).href;
      const [l, y] = await Promise.all([loadJson<LearningContent>(learningUrl), loadJson<YoutubeContent>(youtubeUrl)]);
      if (!cancelled) {
        setLearning(l);
        setYoutube(y);
      }
    }

    load().catch(() => {
      // offline/etc. - keep quiz usable without extra content
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const [challenge, setChallenge] = useState<Challenge>(CHALLENGES[0]);
  const [nodes, setNodes] = useState<PlacedNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState<PlacedNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [result, setResult] = useState<null | { score: number; missingComps: string[]; missingConns: Array<[string, string]> }>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [celebrateAnim, setCelebrateAnim] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() =>
    CATEGORIES.reduce((a, c) => ({ ...a, [c.name]: true }), {} as Record<string, boolean>)
  );
  const [searchText, setSearchText] = useState('');

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const movingNode = useRef<string | null>(null);
  const dragPointerId = useRef<number | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);
  /** タッチ／マウス: しきい値通過まではパン確定しない（タップ操作を残す） */
  const pendingCanvasPanRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);
  /** 2指ピンチの直前の指間距離（キャンバス上でズーム用） */
  const pinchDistRef = useRef<number | null>(null);

  const [viewScale, setViewScale] = useState(1);
  const [viewPan, setViewPan] = useState(() => ({ ...DEFAULT_VIEW_PAN }));
  const viewScaleRef = useRef(viewScale);
  const viewPanRef = useRef(viewPan);
  viewScaleRef.current = viewScale;
  viewPanRef.current = viewPan;

  const [worldSize, setWorldSize] = useState({ w: WORLD_MIN_W, h: WORLD_MIN_H });
  const worldSizeRef = useRef(worldSize);
  worldSizeRef.current = worldSize;

  const compact = useCompactLayout(720);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      const nw = Math.max(WORLD_MIN_W, Math.ceil(r.width * WORLD_VIEWPORT_FACTOR), Math.ceil(r.width));
      const nh = Math.max(WORLD_MIN_H, Math.ceil(r.height * WORLD_VIEWPORT_FACTOR), Math.ceil(r.height));
      setWorldSize(prev => ({
        w: Math.max(prev.w, nw),
        h: Math.max(prev.h, nh),
      }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rank = result ? getRankByScore(result.score) : null;

  const youtubeForChallenge = useMemo((): YoutubeContent | null => {
    if (!youtube) return null;
    const override = youtube.byChallengeId?.[String(challenge.id)]?.rankToVideo;
    if (override) {
      return { ...youtube, rankToVideo: override };
    }
    return youtube;
  }, [youtube, challenge.id]);

  const resetBoard = useCallback(
    (ch?: Challenge) => {
      setNodes([]);
      setConnections([]);
      setResult(null);
      setShowSolution(false);
      setConnecting(null);
      setSelectedNode(null);
      setCelebrateAnim(false);
      setViewScale(1);
      setViewPan({ ...DEFAULT_VIEW_PAN });
      if (ch) setChallenge(ch);
    },
    []
  );

  const resetView = useCallback(() => {
    setViewScale(1);
    setViewPan({ ...DEFAULT_VIEW_PAN });
  }, []);

  const zoomViewAroundCanvasPoint = useCallback((factor: number, lx: number, ly: number) => {
    const pan = viewPanRef.current;
    const scale = viewScaleRef.current;
    const wx = (lx - pan.x) / scale;
    const wy = (ly - pan.y) / scale;
    const next = Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, scale * factor));
    setViewScale(next);
    setViewPan({ x: lx - wx * next, y: ly - wy * next });
  }, []);

  const zoomViewAtCenter = useCallback(
    (factor: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      zoomViewAroundCanvasPoint(factor, rect.width / 2, rect.height / 2);
    },
    [zoomViewAroundCanvasPoint]
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const rect = el.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      const pan = viewPanRef.current;
      const scale = viewScaleRef.current;
      const wx = (lx - pan.x) / scale;
      const wy = (ly - pan.y) / scale;
      const next = Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, scale * factor));
      setViewScale(next);
      setViewPan({ x: lx - wx * next, y: ly - wy * next });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  /** スマホ・タブレット: 2指ピンチでキャンバス拡大縮小 */
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) {
        pendingCanvasPanRef.current = null;
        panDragRef.current = null;
      }
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchDistRef.current = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length < 2 || pinchDistRef.current == null || pinchDistRef.current <= 0) return;
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      const rect = el.getBoundingClientRect();
      const lx = midX - rect.left;
      const ly = midY - rect.top;
      const prev = pinchDistRef.current;
      const factor = dist / prev;
      pinchDistRef.current = dist;
      zoomViewAroundCanvasPoint(factor, lx, ly);
    };

    const endPinch = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchDistRef.current = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', endPinch);
    el.addEventListener('touchcancel', endPinch);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', endPinch);
      el.removeEventListener('touchcancel', endPinch);
    };
  }, [zoomViewAroundCanvasPoint]);

  const handleDragStart = (e: ReactDragEvent<HTMLDivElement>, comp: CatalogItem) => {
    e.dataTransfer.setData('component', JSON.stringify(comp));
  };

  const handleDrop = (e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('component');
    if (!data) return;
    const comp = JSON.parse(data) as CatalogItem;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pan = viewPanRef.current;
    const sc = viewScaleRef.current;
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const x = (lx - pan.x) / sc - NODE_W / 2;
    const y = (ly - pan.y) / sc - NODE_H / 2;
    const w = worldSizeRef.current;
    setNodes(prev => [
      ...prev,
      {
        id: genId(),
        ...comp,
        x: Math.max(0, Math.min(x, w.w - NODE_W)),
        y: Math.max(0, Math.min(y, w.h - NODE_H)),
      },
    ]);
  };

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>) => e.preventDefault();

  const addComponentFromCatalog = useCallback((comp: CatalogItem) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pan = viewPanRef.current;
    const sc = viewScaleRef.current;
    setNodes(prev => {
      const stagger = (prev.length % 6) * 14;
      const w = worldSizeRef.current;
      const cx = (rect.width / 2 - pan.x) / sc - NODE_W / 2 + stagger;
      const cy = (rect.height / 2 - pan.y) / sc - NODE_H / 2 + stagger;
      const x = Math.max(0, Math.min(cx, w.w - NODE_W));
      const y = Math.max(0, Math.min(cy, w.h - NODE_H));
      return [...prev, { id: genId(), ...comp, x, y }];
    });
  }, []);

  const handleNodePointerDown = (e: ReactPointerEvent<HTMLDivElement>, node: PlacedNode) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (connecting) return;
    e.preventDefault();
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const pan = viewPanRef.current;
    const sc = viewScaleRef.current;
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;
    const wx = (lx - pan.x) / sc;
    const wy = (ly - pan.y) / sc;
    dragOffset.current = { x: wx - node.x, y: wy - node.y };
    movingNode.current = node.id;
    dragPointerId.current = e.pointerId;
    setSelectedNode(node.id);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const toWorld = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const lx = clientX - rect.left;
      const ly = clientY - rect.top;
      const p = viewPanRef.current;
      const s = viewScaleRef.current;
      return { x: (lx - p.x) / s, y: (ly - p.y) / s };
    };

    const handleMove = (e: PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pending = pendingCanvasPanRef.current;
      if (pending && e.pointerId === pending.pointerId) {
        const dx = e.clientX - pending.startX;
        const dy = e.clientY - pending.startY;
        if (Math.hypot(dx, dy) >= CANVAS_PAN_POINTER_THRESHOLD_PX) {
          pendingCanvasPanRef.current = null;
          panDragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            panX: pending.startPanX,
            panY: pending.startPanY,
          };
          try {
            canvas.setPointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
        }
      }

      if (panDragRef.current && e.pointerId === panDragRef.current.pointerId) {
        const d = panDragRef.current;
        setViewPan({
          x: d.panX + (e.clientX - d.startX),
          y: d.panY + (e.clientY - d.startY),
        });
        return;
      }

      if (movingNode.current && dragPointerId.current === e.pointerId) {
        const world = worldSizeRef.current;
        const pt = toWorld(e.clientX, e.clientY);
        const x = pt.x - dragOffset.current.x;
        const y = pt.y - dragOffset.current.y;
        setNodes(prev =>
          prev.map(n =>
            n.id === movingNode.current
              ? { ...n, x: Math.max(0, Math.min(x, world.w - NODE_W)), y: Math.max(0, Math.min(y, world.h - NODE_H)) }
              : n
          )
        );
      }

      if (connecting) {
        setMousePos(toWorld(e.clientX, e.clientY));
      }
    };

    const handleUp = (e: PointerEvent) => {
      if (pendingCanvasPanRef.current?.pointerId === e.pointerId) {
        pendingCanvasPanRef.current = null;
      }
      if (panDragRef.current && e.pointerId === panDragRef.current.pointerId) {
        panDragRef.current = null;
      }
      if (dragPointerId.current !== null && e.pointerId === dragPointerId.current) {
        movingNode.current = null;
        dragPointerId.current = null;
      }
    };

    document.addEventListener('pointermove', handleMove, { capture: true });
    document.addEventListener('pointerup', handleUp, { capture: true });
    document.addEventListener('pointercancel', handleUp, { capture: true });
    return () => {
      document.removeEventListener('pointermove', handleMove, { capture: true });
      document.removeEventListener('pointerup', handleUp, { capture: true });
      document.removeEventListener('pointercancel', handleUp, { capture: true });
    };
  }, [connecting]);

  const startConnect = (e: ReactPointerEvent<HTMLDivElement>, node: PlacedNode) => {
    e.stopPropagation();
    if (connecting) {
      if (connecting.id !== node.id) {
        const exists = connections.some(
          c => (c.from === connecting.id && c.to === node.id) || (c.from === node.id && c.to === connecting.id)
        );
        if (!exists) setConnections(prev => [...prev, { from: connecting.id, to: node.id }]);
      }
      setConnecting(null);
    } else {
      setConnecting(node);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pan = viewPanRef.current;
      const sc = viewScaleRef.current;
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      setMousePos({ x: (lx - pan.x) / sc, y: (ly - pan.y) / sc });
    }
  };

  const deleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    setSelectedNode(null);
  };

  const deleteConnection = (idx: number) => {
    setConnections(prev => prev.filter((_, i) => i !== idx));
  };

  const getCenter = (node: PlacedNode) => ({ x: node.x + 54, y: node.y + 36 });

  const checkAnswer = () => {
    const { score, missingComps, missingConns } = evaluateChallenge(challenge, nodes, connections);
    setResult({ score, missingComps, missingConns });
    if (score === 100) setCelebrateAnim(true);
  };

  const getLabel = (type: string) => ALL_COMPONENTS.find(c => c.type === type)?.label ?? type;

  const toggleCat = (name: string) => setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));

  const allowedTypes = useMemo(() => allowedTypesForChallenge(challenge), [challenge]);

  const filteredCats = useMemo(() => {
    return CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item =>
          allowedTypes.has(item.type) &&
          (!searchText ||
            item.label.includes(searchText) ||
            item.desc.includes(searchText) ||
            item.type.toLowerCase().includes(searchText.toLowerCase()))
      ),
    })).filter(cat => cat.items.length > 0);
  }, [searchText, allowedTypes]);

  const catalogItemCount = useMemo(() => filteredCats.reduce((n, c) => n + c.items.length, 0), [filteredCats]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100vw',
        boxSizing: 'border-box',
        height: compact ? 'calc(100vh - 88px)' : 'calc(100vh - 120px)',
        minHeight: compact ? 0 : 520,
        maxHeight: compact ? 'calc(100vh - 88px)' : 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #fce4ec 0%, #e1f5fe 30%, #fff9c4 60%, #e8f5e9 100%)',
        fontFamily: "'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif",
        color: '#263238',
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'manipulation',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=M+PLUS+Rounded+1c:wght@300;400;500;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 7px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #f48fb1, #f06292); border-radius: 4px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pop { 0% { transform: scale(0.75); opacity: 0; } 60% { transform: scale(1.04); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes float0 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(8deg); } }
        @keyframes float1 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-14px) rotate(-6deg); } }
        @keyframes float2 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-22px) rotate(12deg); } }
        @keyframes nodeBounce { 0% { transform: scale(0.5); opacity:0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity:1; } }
        @keyframes connDash { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -24; } }
        @keyframes celebrate { 0% { transform: scale(1); } 25% { transform: scale(1.03) rotate(-1deg); } 50% { transform: scale(1.01) rotate(1deg); } 100% { transform: scale(1); } }
        @keyframes sparkle { 0%,100% { opacity:0; transform: scale(0) rotate(0deg); } 50% { opacity:1; transform: scale(1) rotate(180deg); } }
        .comp-card {
          padding: 6px 9px; border-radius: 12px; cursor: grab; display: flex; align-items: center; gap: 8px;
          background: white; border: 1.5px solid transparent; transition: all 0.18s;
          box-shadow: 0 1px 5px rgba(244,143,177,0.07);
        }
        .comp-card:hover { border-color: #f48fb1; transform: translateY(-1px) scale(1.02); box-shadow: 0 4px 14px rgba(244,143,177,0.16); }
        .comp-card:active { cursor: grabbing; transform: scale(0.97); }
        .canvas-node {
          position: absolute; width: 108px; height: 72px; border-radius: 18px; cursor: move;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
          background: white; border: 2.5px solid; transition: box-shadow 0.2s, border-color 0.2s; user-select: none;
          animation: nodeBounce 0.3s ease; box-shadow: 0 3px 12px rgba(0,0,0,0.06);
          touch-action: none;
        }
        .canvas-node:hover { z-index: 10; box-shadow: 0 8px 28px rgba(0,0,0,0.10); }
        .conn-port {
          position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%);
          width: 18px; height: 18px; border-radius: 50%; cursor: crosshair;
          border: 2.5px solid #f48fb1; background: white; transition: all 0.15s; z-index: 5;
          box-shadow: 0 2px 6px rgba(244,143,177,0.2);
          touch-action: none;
        }
        @media (hover: none), (pointer: coarse) {
          .conn-port {
            width: 30px; height: 30px; bottom: -12px; border-width: 3px;
          }
        }
        .conn-port:hover { background: #f48fb1; transform: translateX(-50%) scale(1.3); box-shadow: 0 3px 14px rgba(244,143,177,0.4); }
        .del-btn {
          position: absolute; top: -7px; right: -7px; width: 22px; height: 22px;
          border-radius: 50%; background: linear-gradient(135deg, #ef5350, #e53935); color: white; border: 2px solid white;
          font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center;
          opacity: 0; transition: all 0.15s; z-index: 6; line-height: 1;
          box-shadow: 0 2px 8px rgba(239,83,80,0.25);
        }
        .canvas-node:hover .del-btn { opacity: 1; }
        .del-btn:hover { transform: scale(1.15); }
        @media (hover: none), (pointer: coarse) {
          .canvas-node .del-btn { opacity: 0.88; }
        }
        .btn {
          padding: 8px 16px; border-radius: 20px; border: none; cursor: pointer; font-size: 13px;
          font-weight: 700; transition: all 0.2s; font-family: 'M PLUS Rounded 1c', sans-serif;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.09); }
        .btn:active { transform: scale(0.97); }
        .badge {
          font-size: 12px; padding: 4px 12px; border-radius: 20px; font-weight: 700;
          background: linear-gradient(135deg, #f48fb1, #ff8a65); color: white;
          box-shadow: 0 2px 5px rgba(244,143,177,0.25);
        }
        .challenge-card {
          padding: 13px 15px; border-radius: 20px; cursor: pointer; border: 2px solid transparent;
          background: white; transition: all 0.2s; position: relative; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .challenge-card:hover { border-color: #f48fb1; transform: translateY(-2px); box-shadow: 0 6px 22px rgba(244,143,177,0.13); }
        .floating-emoji { position: absolute; pointer-events: none; opacity: 0.13; z-index: 2; }
        .topline { position: absolute; top: 0; left: 16px; right: 16px; height: 3px; border-radius: 0 0 3px 3px; }
        .white-card {
          background: white; border-radius: 20px; border: 1px solid rgba(244,143,177,0.06);
          box-shadow: 0 2px 8px rgba(0,0,0,0.03); position: relative; overflow: hidden;
        }
        .cat-header {
          display: flex; align-items: center; gap: 6px; padding: 6px 4px; cursor: pointer;
          border-radius: 8px; transition: background 0.15s; user-select: none;
        }
        .cat-header:hover { background: rgba(244,143,177,0.06); }
        .search-input {
          width: 100%; padding: 8px 10px 8px 32px; border-radius: 12px; border: 1.5px solid #f48fb130;
          font-size: 14px; font-family: inherit; outline: none; background: white; color: #263238;
          transition: border-color 0.2s;
        }
        .search-input::placeholder { color: #9575cd; }
        .search-input:focus { border-color: #f48fb1; }
      `}</style>

      {FLOAT_EMOJIS.map((em, i) => (
        <span
          key={i}
          className="floating-emoji"
          style={{
            left: `${8 + (i * 9.5) % 88}%`,
            top: `${12 + (i * 17) % 72}%`,
            fontSize: 16 + (i % 3) * 8,
            animation: `float${i % 3} ${3 + (i % 4) * 0.7}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        >
          {em}
        </span>
      ))}

      {/* ドロップ・パン対象のボード（ルート全面・ヘッダー背後までドット） */}
      <div
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            /* z-auto と並べると flex が後勝ちで誤った合成になるが、-1 にすると DnD のヒットが効かない環境がある。1 + ワークエリア 2 で順序を固定 */
            zIndex: 1,
            overflow: 'hidden',
            /* 2指ピンチを自前で扱う（ブラウザのページズームと競合させない） */
            touchAction: 'none',
            ...(celebrateAnim ? { animation: 'celebrate 0.5s ease' } : {}),
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPointerDown={e => {
            if (e.button === 1) {
              e.preventDefault();
              panDragRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                panX: viewPan.x,
                panY: viewPan.y,
              };
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }
          }}
          onClick={() => {
            if (connecting) setConnecting(null);
            setSelectedNode(null);
          }}
        >
            {nodes.length === 0 && !result && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  pointerEvents: 'none',
                  padding: '0 12px',
                }}
              >
                <div>
                  <div style={{ fontSize: compact ? 40 : 52, marginBottom: 10, opacity: 0.3 }}>🧩</div>
                  <div
                    style={{
                      fontSize: compact ? 14 : 17,
                      color: '#c2185b',
                      opacity: 0.75,
                      fontFamily: "'M PLUS Rounded 1c', sans-serif",
                      fontWeight: 800,
                      lineHeight: 1.4,
                    }}
                  >
                    {compact ? '下の一覧をタップしてキャンバスに追加！' : 'コンポーネントをここにドロップ！'}
                  </div>
                  <div style={{ fontSize: compact ? 12 : 13, marginTop: 8, color: '#6a1b9a', opacity: 0.85, fontWeight: 600, lineHeight: 1.45 }}>
                    {compact ? (
                      <>
                        空いた所を指でドラッグして画面移動・2指でズーム
                        <br />
                        <span style={{ display: 'inline-block', marginTop: 4 }}>ノード下の●同士で接続</span>
                      </>
                    ) : (
                      'ノードの下の●ポートをクリックして接続線を引こう'
                    )}
                  </div>
                </div>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                top: compact ? 52 : 72,
                right: 8,
                zIndex: 15,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 6px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.92)',
                border: '1.5px solid rgba(244,143,177,0.2)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                pointerEvents: 'auto',
              }}
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                className="btn"
                title="縮小"
                onClick={() => zoomViewAtCenter(1 / ZOOM_STEP)}
                style={{
                  padding: '4px 10px',
                  fontSize: compact ? 13 : 14,
                  minWidth: 36,
                  lineHeight: 1.2,
                }}
              >
                −
              </button>
              <span
                style={{
                  fontSize: compact ? 11 : 12,
                  fontWeight: 800,
                  color: '#6a1b9a',
                  minWidth: compact ? 38 : 44,
                  textAlign: 'center',
                }}
              >
                {Math.round(viewScale * 100)}%
              </span>
              <button
                type="button"
                className="btn"
                title="拡大"
                onClick={() => zoomViewAtCenter(ZOOM_STEP)}
                style={{
                  padding: '4px 10px',
                  fontSize: compact ? 13 : 14,
                  minWidth: 36,
                  lineHeight: 1.2,
                }}
              >
                +
              </button>
              <button
                type="button"
                className="btn"
                title="表示をリセット"
                onClick={resetView}
                style={{
                  padding: '4px 8px',
                  fontSize: compact ? 11 : 12,
                  marginLeft: 2,
                  color: '#7b1fa2',
                  background: 'white',
                  border: '1.5px solid #e1bee7',
                }}
              >
                {compact ? '⌂' : '全体'}
              </button>
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: `max(100%, ${worldSize.w}px)`,
                height: `max(100%, ${worldSize.h}px)`,
                minWidth: '100%',
                minHeight: '100%',
                boxSizing: 'border-box',
                transform: `translate(${viewPan.x}px, ${viewPan.y}px) scale(${viewScale})`,
                transformOrigin: '0 0',
                background: 'rgba(255,255,255,0.2)',
                backgroundImage: `radial-gradient(circle, rgba(244,143,177,0.09) 1.2px, transparent 1.2px)`,
                backgroundSize: '30px 30px',
              }}
              onPointerDown={e => {
                if (e.button !== 0) return;
                if (e.target !== e.currentTarget) return;
                if (e.pointerType !== 'touch' && e.pointerType !== 'pen' && e.pointerType !== 'mouse') return;
                pendingCanvasPanRef.current = {
                  pointerId: e.pointerId,
                  startX: e.clientX,
                  startY: e.clientY,
                  startPanX: viewPanRef.current.x,
                  startPanY: viewPanRef.current.y,
                };
              }}
            >
            {/* SVG Connections */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}
            >
              <defs>
                <marker id="arrowPink" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#f48fb1" opacity="0.8" />
                </marker>
                <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f48fb1" />
                  <stop offset="100%" stopColor="#ce93d8" />
                </linearGradient>
              </defs>

              {connections.map((conn, idx) => {
                const fromN = nodes.find(n => n.id === conn.from);
                const toN = nodes.find(n => n.id === conn.to);
                if (!fromN || !toN) return null;
                const a = getCenter(fromN);
                const b = getCenter(toN);
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const cx = (a.x + b.x) / 2 - dy * 0.12;
                const cy = (a.y + b.y) / 2 + dx * 0.12;

                return (
                  <g
                    key={idx}
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation();
                      deleteConnection(idx);
                    }}
                  >
                    <path d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`} fill="none" stroke="transparent" strokeWidth={18} />
                    <path
                      d={`M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`}
                      fill="none"
                      stroke="url(#connGrad)"
                      strokeWidth={2.5}
                      opacity={0.5}
                      markerEnd="url(#arrowPink)"
                      strokeDasharray="8,5"
                      style={{ animation: 'connDash 2s linear infinite' }}
                    />
                    <circle cx={cx} cy={cy} r={9} fill="white" stroke="#f48fb140" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 1px 3px rgba(244,143,177,0.12))' }} />
                    <text x={cx} y={cy + 4} textAnchor="middle" fill="#c62828" fontSize={11} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                      ✕
                    </text>
                  </g>
                );
              })}

              {connecting && (
                <line
                  x1={getCenter(connecting).x}
                  y1={getCenter(connecting).y}
                  x2={mousePos.x}
                  y2={mousePos.y}
                  stroke="#f48fb1"
                  strokeWidth={2.5}
                  strokeDasharray="6,4"
                  opacity={0.45}
                />
              )}
            </svg>

            {/* Nodes */}
            {nodes.map(node => (
              <div
                key={node.id}
                className="canvas-node"
                style={{
                  left: node.x,
                  top: node.y,
                  borderColor: selectedNode === node.id ? node.color : node.color + '50',
                  boxShadow: selectedNode === node.id ? `0 8px 28px ${node.color}25` : `0 3px 12px rgba(0,0,0,0.05)`,
                  zIndex: movingNode.current === node.id ? 20 : 2,
                }}
                onPointerDown={e => handleNodePointerDown(e, node)}
              >
                <div className="topline" style={{ background: node.color, left: 14, right: 14, height: 3, borderRadius: '0 0 3px 3px' }} />
                <button
                  type="button"
                  className="del-btn"
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                >
                  ✕
                </button>
                <span style={{ fontSize: 20, lineHeight: 1 }}>{node.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#212121', textAlign: 'center', lineHeight: 1.15, maxWidth: 96, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.label}
                </span>

                <div
                  className="conn-port"
                  onPointerDown={e => {
                    e.stopPropagation();
                    startConnect(e, node);
                  }}
                  onClick={e => {
                    /* pointerdown で接続開始後、click がキャンバスへバブルすると connecting が解除される */
                    e.stopPropagation();
                  }}
                  style={connecting?.id === node.id ? { background: '#f48fb1', transform: 'translateX(-50%) scale(1.3)' } : {}}
                />
              </div>
            ))}

            {celebrateAnim &&
              Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    fontSize: 18 + (i % 3) * 10,
                    left: `${8 + (i * 6.5) % 82}%`,
                    top: `${5 + (i * 11) % 78}%`,
                    animation: `sparkle ${0.5 + (i % 4) * 0.15}s ease ${i * 0.04}s both`,
                    pointerEvents: 'none',
                    zIndex: 30,
                  }}
                >
                  {['✨', '🎉', '⭐', '🎊', '💫', '🌟', '🎀'][i % 7]}
                </span>
              ))}
            </div>
        </div>


      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          alignItems: compact ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: compact ? 8 : 0,
          padding: compact ? '8px 12px' : '10px 20px',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          borderBottom: '2px solid rgba(244,143,177,0.08)',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 8 : 10, minWidth: 0 }}>
          <span style={{ fontSize: compact ? 22 : 26, flexShrink: 0 }}>☁️</span>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: compact ? 15 : 18,
                color: '#880e4f',
                fontFamily: "'Hachi Maru Pop', cursive",
                fontWeight: 700,
                letterSpacing: '0.02em',
                lineHeight: 1.25,
              }}
            >
              クラウドアーキテクチャパズル
            </h1>
            {!compact && (
              <p style={{ fontSize: 13, color: '#6a1b9a', fontWeight: 600, marginTop: 2 }}>
                {ALL_COMPONENTS.length}種のコンポーネントで本格システム設計！
              </p>
            )}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: compact ? 'flex-end' : 'flex-start',
          }}
        >
          <span className="badge" style={compact ? { fontSize: 11, padding: '3px 10px' } : undefined}>
            {challenge.emoji} {challenge.difficulty}
          </span>
          <button
            className="btn"
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'white',
              color: '#ad1457',
              border: '2px solid #f48fb130',
              padding: compact ? '7px 12px' : undefined,
              fontSize: compact ? 12 : 13,
            }}
          >
            {compact ? '📋 チャレンジ' : '📋 チャレンジ選択'}
          </button>
        </div>
      </div>

      {/* Challenge Menu Overlay */}
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            background: 'rgba(252,228,236,0.5)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowMenu(false)}
        >
          <div
            className="white-card"
            style={{
              padding: compact ? 16 : 24,
              width: 'min(560px, calc(100vw - 24px))',
              maxWidth: '100%',
              maxHeight: compact ? '90vh' : '85vh',
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
              animation: 'pop 0.3s ease',
              boxShadow: '0 20px 60px rgba(173,20,87,0.10)',
              borderRadius: compact ? 18 : 24,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="topline" style={{ background: 'linear-gradient(90deg, #f48fb1, #ff8a65)' }} />
            <h2 style={{ fontSize: 20, color: '#880e4f', marginBottom: 6, fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800 }}>🧩 チャレンジを選択</h2>
            <p style={{ fontSize: 14, color: '#4a148c', marginBottom: 16, fontWeight: 500, lineHeight: 1.5 }}>
              全{CHALLENGES.length}問！難易度別にアーキテクチャ設計に挑戦しよう
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CHALLENGES.map(ch => (
                <div
                  key={ch.id}
                  className="challenge-card"
                  style={ch.id === challenge.id ? { borderColor: ch.diffColor, background: ch.diffColor + '0c' } : {}}
                  onClick={() => {
                    resetBoard(ch);
                    setShowMenu(false);
                  }}
                >
                  <div className="topline" style={{ background: ch.diffColor }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#263238' }}>
                      {ch.emoji} {ch.title}
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#546e7a' }}>
                        {ch.required.length}個 / {ch.connections.length}本
                      </span>
                      <span className="badge" style={{ background: `linear-gradient(135deg, ${ch.diffColor}, ${ch.diffColor}bb)` }}>
                        {ch.difficulty}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: '#455a64', lineHeight: 1.6 }}>{ch.description}</p>
                  <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                    {ch.required.map(r => (
                      <span
                        key={r}
                        style={{
                          fontSize: 11,
                          padding: '3px 9px',
                          borderRadius: 10,
                          background: '#fce4ec',
                          color: '#880e4f',
                          fontWeight: 600,
                        }}
                      >
                        {getLabel(r)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2,
          /* 背面のボード（ドロップ・パン）へイベントを通すため親は透過 */
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            flexDirection: compact ? 'column' : 'row',
            pointerEvents: 'none',
          }}
        >
        {/* Sidebar - Components (categorized with search) */}
        <div
          style={{
            order: compact ? 2 : 0,
            width: compact ? '100%' : 220,
            maxHeight: compact ? 'min(38vh, 260px)' : undefined,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.42)',
            backdropFilter: 'blur(12px)',
            borderRight: compact ? 'none' : '2px solid rgba(244,143,177,0.06)',
            borderTop: compact ? '2px solid rgba(244,143,177,0.08)' : 'none',
            minHeight: compact ? 0 : undefined,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ padding: '12px 12px 8px' }}>
            <h3 style={{ fontSize: 15, color: '#880e4f', fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800, marginBottom: 8 }}>🧱 コンポーネント</h3>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.4 }}>🔍</span>
              <input className="search-input" placeholder="検索..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '2px 10px 10px',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {filteredCats.map(cat => (
              <div key={cat.name} style={{ marginBottom: 2 }}>
                <div className="cat-header" onClick={() => toggleCat(cat.name)}>
                  <span
                    style={{
                      fontSize: 11,
                      color: '#7b1fa2',
                      transition: 'transform 0.2s',
                      transform: expandedCats[cat.name] ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▶
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#4a148c' }}>
                    {cat.icon} {cat.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#8e24aa', marginLeft: 'auto', fontWeight: 600 }}>{cat.items.length}</span>
                </div>
                {expandedCats[cat.name] && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '2px 0 4px 6px' }}>
                    {cat.items.map(comp => (
                      <div
                        key={comp.type}
                        className="comp-card"
                        draggable={!compact}
                        onDragStart={compact ? undefined : e => handleDragStart(e, comp)}
                        onClick={compact ? () => addComponentFromCatalog(comp) : undefined}
                        role={compact ? 'button' : undefined}
                        tabIndex={compact ? 0 : undefined}
                        onKeyDown={
                          compact
                            ? e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  addComponentFromCatalog(comp);
                                }
                              }
                            : undefined
                        }
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: 9,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: comp.color + '15',
                            flexShrink: 0,
                            fontSize: 15,
                          }}
                        >
                          {comp.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#263238',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {comp.label}
                          </div>
                          <div style={{ fontSize: 11, color: '#546e7a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {comp.desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid rgba(244,143,177,0.06)',
              fontSize: 12,
              color: '#6a1b9a',
              textAlign: 'center',
              fontWeight: 600,
            }}
          >
            この問題 {catalogItemCount}種 / {filteredCats.length}カテゴリ
          </div>
        </div>

        {/* Main Canvas Area — UIオーバーレイ（pointer-events で下のボードへ透過） */}
        <div
          style={{
            order: compact ? 1 : 0,
            flex: 1,
            minWidth: 0,
            minHeight: compact ? 200 : 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            position: 'relative',
            pointerEvents: 'none',
          }}
        >
          {/* Challenge Info Bar */}
          <div
            style={{
              padding: compact ? '8px 12px' : '8px 18px',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(8px)',
              borderBottom: '2px solid rgba(244,143,177,0.05)',
              display: 'flex',
              flexDirection: compact ? 'column' : 'row',
              alignItems: compact ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: compact ? 10 : 0,
              flexShrink: 0,
              pointerEvents: 'auto',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: compact ? 14 : 16,
                  color: '#263238',
                  marginBottom: 2,
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  fontWeight: 800,
                  lineHeight: 1.3,
                }}
              >
                {challenge.emoji} {challenge.title}
              </h2>
              <p style={{ fontSize: compact ? 12 : 13, color: '#455a64', lineHeight: 1.5 }}>{challenge.description}</p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginLeft: compact ? 0 : 12,
                flexShrink: 0,
                flexWrap: 'wrap',
                justifyContent: compact ? 'stretch' : 'flex-end',
              }}
            >
              <button
                className="btn"
                onClick={() => setShowSolution(!showSolution)}
                style={{
                  background: showSolution ? '#fff3e0' : 'white',
                  color: '#f4a261',
                  border: '1.5px solid ' + (showSolution ? '#f4a261' : '#f4a26120'),
                  fontSize: compact ? 12 : 13,
                  padding: compact ? '7px 10px' : undefined,
                  flex: compact ? 1 : undefined,
                  minWidth: compact ? 0 : undefined,
                }}
              >
                💡 {compact ? '解答' : '解答例'}
              </button>
              <button
                className="btn"
                onClick={() => resetBoard()}
                style={{
                  background: 'white',
                  color: '#e57373',
                  border: '1.5px solid #e5737320',
                  fontSize: compact ? 12 : 13,
                  padding: compact ? '7px 10px' : undefined,
                  flex: compact ? 1 : undefined,
                  minWidth: compact ? 0 : undefined,
                }}
              >
                🗑️ {compact ? '消去' : 'リセット'}
              </button>
              <button
                className="btn"
                onClick={checkAnswer}
                style={{
                  background: 'linear-gradient(135deg, #f48fb1, #ff8a65)',
                  color: 'white',
                  border: 'none',
                  fontSize: compact ? 12 : 13,
                  padding: compact ? '7px 10px' : undefined,
                  flex: compact ? 1 : undefined,
                  minWidth: compact ? 0 : undefined,
                }}
              >
                ✅ {compact ? '採点' : '採点する！'}
              </button>
            </div>
          </div>

          {showSolution && (
            <div
              style={{
                padding: '10px 18px',
                background: 'rgba(255,243,224,0.85)',
                borderBottom: '1.5px solid #ffe0b220',
                fontSize: 14,
                color: '#bf360c',
                animation: 'fadeUp 0.2s ease',
                flexShrink: 0,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                maxHeight: 220,
                overflowY: 'auto',
                whiteSpace: 'pre-line',
                lineHeight: 1.55,
                pointerEvents: 'auto',
              }}
            >
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 2 }}>💡</span>
              <span>{formatSolutionExample(challenge)}</span>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: compact ? '6px 10px' : '5px 20px',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          borderTop: '1.5px solid rgba(244,143,177,0.05)',
          display: 'flex',
          flexDirection: compact ? 'column' : 'row',
          gap: compact ? 4 : 0,
          justifyContent: 'space-between',
          alignItems: compact ? 'flex-start' : 'center',
          fontSize: compact ? 11 : 12,
          color: '#4a148c',
          flexShrink: 0,
          fontWeight: 600,
          pointerEvents: 'none',
        }}
      >
        <span style={{ lineHeight: 1.35 }}>
          📦 {nodes.length} ・ 🔗 {connections.length} ・ 🎯 {challenge.required.length}個 {challenge.connections.length}本
        </span>
        <span style={{ lineHeight: 1.35, opacity: compact ? 0.92 : 1 }}>
          {connecting
            ? '🔗 接続先の●をタップ'
            : compact
              ? '🔍 右上の±か2指ピンチで拡大 · ●で接続'
              : '🔍 ホイールで拡大縮小 · ホイールクリックで移動 · 2指ピンチでも拡大 · ●で接続'}
        </span>
      </div>

      {result &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100000,
              background: 'rgba(252,228,236,0.45)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 18,
              overflow: 'hidden',
              animation: 'fadeUp 0.2s ease',
              pointerEvents: 'auto',
            }}
            onClick={() => {
              setResult(null);
              setCelebrateAnim(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              style={{
                width: 'min(900px, 96vw)',
                maxHeight: '86vh',
                background: 'rgba(255,255,255,0.78)',
                border: '2px solid rgba(244,143,177,0.10)',
                borderRadius: 24,
                boxShadow: '0 30px 80px rgba(173,20,87,0.18)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'pop 0.3s ease',
                pointerEvents: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: '16px 16px 12px', borderBottom: '1.5px solid rgba(244,143,177,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, color: '#880e4f', fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800 }}>📊 採点結果</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setResult(null);
                      setCelebrateAnim(false);
                    }}
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      background: '#fce4ec',
                      border: 'none',
                      color: '#e57373',
                      cursor: 'pointer',
                      fontSize: 12,
                      width: 26,
                      height: 26,
                      borderRadius: 9,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      padding: 4,
                      background: `conic-gradient(${
                        result.score >= 80 ? '#81c784' : result.score >= 50 ? '#ffb74d' : '#e57373'
                      } ${result.score * 3.6}deg, #f5f5f5 0deg)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 4px 18px ${result.score >= 80 ? 'rgba(129,199,132,0.2)' : 'rgba(255,183,77,0.2)'}`,
                    }}
                  >
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <span style={{ fontSize: 28, fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800, color: result.score >= 80 ? '#2e7d32' : result.score >= 50 ? '#e65100' : '#c62828' }}>
                        {result.score}
                      </span>
                      <span style={{ fontSize: 12, color: '#546e7a', fontWeight: 700 }}>てん</span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 14,
                    textAlign: 'center',
                    background: result.score === 100 ? '#e8f5e9' : result.score >= 70 ? '#fff3e0' : '#fce4ec',
                    border: `1.5px solid ${
                      result.score === 100 ? '#81c78430' : result.score >= 70 ? '#ffb74d30' : '#e5737330'
                    }`,
                  }}
                >
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: result.score === 100 ? '#1b5e20' : result.score >= 70 ? '#bf360c' : '#b71c1c',
                    }}
                  >
                    {result.score === 100 ? '🎉 パーフェクト！すごい！' : result.score >= 70 ? '👍 おしい！あと少し！' : '💪 がんばろう！'}
                  </span>
                </div>

                {rank ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 14, color: '#6a1b9a', fontWeight: 800, marginBottom: 4 }}>
                      ランク：<span style={{ color: '#c2185b' }}>{rank}</span>
                    </div>
                    {learning?.rankDescriptions?.[rank] ? (
                      <div style={{ fontSize: 13, color: '#37474f', lineHeight: 1.65 }}>{learning.rankDescriptions[rank]}</div>
                    ) : (
                      <div style={{ fontSize: 13, color: '#78909c', lineHeight: 1.65 }}>ランク解説を読み込み中...</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div style={{ padding: '14px 16px 18px', flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {rank && youtubeForChallenge ? <YoutubeEntryPoint content={youtubeForChallenge} rank={rank} /> : null}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

