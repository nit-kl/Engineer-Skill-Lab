import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
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

type Challenge = {
  id: number;
  title: string;
  difficulty: string;
  diffColor: string;
  emoji: string;
  description: string;
  hint: string;
  required: string[];
  connections: Array<[string, string]>;
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
      { type: 'dns', label: 'DNS', icon: '🔗', desc: '名前解決 Route53等', color: '#9575CD' },
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
      { type: 'proxy', label: 'リバースプロキシ', icon: '🔀', desc: 'Nginx/HAProxy', color: '#26A69A' },
      { type: 'gateway', label: 'API Gateway', icon: '🚪', desc: 'API管理・ルーティング', color: '#AB47BC' },
      { type: 'web', label: 'Webサーバー', icon: '🌐', desc: 'HTTP/静的配信', color: '#81C784' },
      { type: 'api', label: 'APIサーバー', icon: '⚡', desc: 'ビジネスロジック', color: '#CE93D8' },
      { type: 'grpc', label: 'gRPCサービス', icon: '📡', desc: '内部通信 高速RPC', color: '#7986CB' },
      { type: 'websocket', label: 'WebSocketサーバー', icon: '🔌', desc: 'リアルタイム双方向通信', color: '#4DB6AC' },
      { type: 'ssr', label: 'SSR/BFF', icon: '🖼️', desc: 'サーバーサイドレンダリング', color: '#9CCC65' },
      { type: 'serverless', label: 'サーバーレス', icon: 'λ', desc: 'Lambda/Functions', color: '#FFA726' },
    ],
  },
  {
    name: '認証・セキュリティ',
    icon: '🔐',
    items: [
      { type: 'auth', label: '認証サービス', icon: '🔐', desc: 'OAuth/JWT/OIDC', color: '#F06292' },
      { type: 'secrets', label: 'シークレット管理', icon: '🗝️', desc: 'Vault/KMS', color: '#8D6E63' },
      { type: 'ssl', label: 'SSL/TLS終端', icon: '🔏', desc: '証明書管理', color: '#78909C' },
    ],
  },
  {
    name: 'データストア',
    icon: '🗄️',
    items: [
      { type: 'db', label: 'RDB', icon: '🗄️', desc: 'MySQL/PostgreSQL', color: '#E57373' },
      { type: 'nosql', label: 'NoSQL DB', icon: '🍃', desc: 'MongoDB/DynamoDB', color: '#66BB6A' },
      { type: 'cache', label: 'キャッシュ', icon: '💨', desc: 'Redis/Memcached', color: '#FF8A65' },
      { type: 'storage', label: 'オブジェクトストレージ', icon: '📦', desc: 'S3/GCS/Blob', color: '#90A4AE' },
      { type: 'search', label: '検索エンジン', icon: '🔍', desc: 'Elasticsearch/Algolia', color: '#FFD54F' },
      { type: 'graphdb', label: 'グラフDB', icon: '🕸️', desc: 'Neo4j/Neptune', color: '#A1887F' },
      { type: 'tsdb', label: '時系列DB', icon: '📈', desc: 'InfluxDB/TimescaleDB', color: '#4FC3F7' },
    ],
  },
  {
    name: '非同期・メッセージング',
    icon: '📬',
    items: [
      { type: 'queue', label: 'メッセージキュー', icon: '📬', desc: 'SQS/RabbitMQ', color: '#FFB74D' },
      { type: 'stream', label: 'イベントストリーム', icon: '🌊', desc: 'Kafka/Kinesis', color: '#29B6F6' },
      { type: 'worker', label: 'ワーカー', icon: '⚙️', desc: 'バックグラウンド処理', color: '#A1887F' },
      { type: 'scheduler', label: 'スケジューラー', icon: '⏰', desc: 'Cron/定期実行', color: '#FFAB91' },
    ],
  },
  {
    name: '通知・外部連携',
    icon: '🔔',
    items: [
      { type: 'email', label: 'メールサービス', icon: '📧', desc: 'SES/SendGrid', color: '#4DD0E1' },
      { type: 'push', label: 'プッシュ通知', icon: '🔔', desc: 'FCM/APNs/SNS', color: '#FF8A80' },
      { type: 'sms', label: 'SMS送信', icon: '💬', desc: 'Twilio/SNS', color: '#80CBC4' },
      { type: 'webhook', label: 'Webhook', icon: '🪝', desc: '外部イベント連携', color: '#B39DDB' },
      { type: 'thirdparty', label: '外部API', icon: '🔌', desc: '決済/地図/AI等', color: '#BCAAA4' },
    ],
  },
  {
    name: 'インフラ・運用',
    icon: '🏗️',
    items: [
      { type: 'container', label: 'コンテナ/K8s', icon: '🐳', desc: 'Docker/Kubernetes', color: '#42A5F5' },
      { type: 'cicd', label: 'CI/CDパイプライン', icon: '🔄', desc: 'GitHub Actions等', color: '#66BB6A' },
      { type: 'registry', label: 'コンテナレジストリ', icon: '📋', desc: 'ECR/DockerHub', color: '#7E57C2' },
      { type: 'iac', label: 'IaC', icon: '📐', desc: 'Terraform/CDK', color: '#8D6E63' },
    ],
  },
  {
    name: '監視・分析',
    icon: '📊',
    items: [
      { type: 'monitor', label: '監視/アラート', icon: '📊', desc: 'Datadog/CloudWatch', color: '#7E57C2' },
      { type: 'logging', label: 'ログ管理', icon: '📝', desc: 'ELK/CloudWatch Logs', color: '#8D6E63' },
      { type: 'tracing', label: '分散トレーシング', icon: '🔬', desc: 'Jaeger/X-Ray', color: '#26A69A' },
      { type: 'analytics', label: 'アクセス解析', icon: '📉', desc: 'GA/Mixpanel', color: '#EC407A' },
      { type: 'dwh', label: 'データウェアハウス', icon: '🏛️', desc: 'BigQuery/Redshift', color: '#5C6BC0' },
      { type: 'etl', label: 'ETL/データパイプライン', icon: '🔧', desc: 'Glue/Airflow', color: '#78909C' },
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
    hint: 'DNSで名前解決 → CDNでコンテンツ配信 → Webサーバーで静的ファイルを提供する流れを考えてみてね！',
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
    title: 'ECサイト基本構成',
    difficulty: '中級',
    diffColor: '#F4A261',
    emoji: '🛒',
    description: '商品の閲覧・購入ができるECサイトを構築しよう！負荷分散・ビジネスロジック・データ永続化を実現する構成が必要だよ。',
    hint: 'ロードバランサーで負荷分散し、APIサーバーでロジック処理、RDBとキャッシュで効率的にデータ管理してみよう！',
    required: ['client', 'lb', 'web', 'api', 'db', 'cache'],
    connections: [
      ['client', 'lb'],
      ['lb', 'web'],
      ['web', 'api'],
      ['api', 'db'],
      ['api', 'cache'],
    ],
    explanation:
      'ロードバランサーがトラフィックを分散し、APIがビジネスロジックを処理。キャッシュで頻繁なクエリを高速化し、RDBでデータを永続化します。',
  },
  {
    id: 3,
    title: '動画配信プラットフォーム',
    difficulty: '中級',
    diffColor: '#F4A261',
    emoji: '🎬',
    description: '動画のアップロード・エンコード・配信を行うプラットフォームを構築しよう！大容量の非同期処理と高速配信がポイント。',
    hint: '動画をストレージに保存 → キューでジョブ発行 → ワーカーで非同期エンコード → CDNで配信の流れ！',
    required: ['client', 'lb', 'api', 'queue', 'worker', 'storage', 'cdn'],
    connections: [
      ['client', 'lb'],
      ['lb', 'api'],
      ['api', 'storage'],
      ['api', 'queue'],
      ['queue', 'worker'],
      ['worker', 'storage'],
      ['storage', 'cdn'],
    ],
    explanation:
      'APIが動画をストレージに保存しキューにジョブを投入。ワーカーが非同期エンコードし、CDN経由で高速配信します。',
  },
  {
    id: 4,
    title: 'リアルタイムチャットアプリ',
    difficulty: '中級',
    diffColor: '#F4A261',
    emoji: '💬',
    description: 'リアルタイムのメッセージ送受信ができるチャットアプリ。WebSocketとプッシュ通知で即時性を実現しよう！',
    hint: 'WebSocketサーバーで双方向通信、NoSQLで大量のメッセージ履歴を保存、プッシュ通知でオフライン時もお知らせ！',
    required: ['client', 'lb', 'api', 'websocket', 'auth', 'nosql', 'cache', 'push'],
    connections: [
      ['client', 'lb'],
      ['lb', 'api'],
      ['lb', 'websocket'],
      ['api', 'auth'],
      ['api', 'nosql'],
      ['api', 'cache'],
      ['api', 'push'],
    ],
    explanation:
      'LBがHTTPとWebSocket接続を振り分けます。WebSocketでリアルタイム通信し、認証で安全性を確保。NoSQLでメッセージ履歴、キャッシュでオンライン状態管理、プッシュ通知でオフラインユーザーに配信します。',
  },
  {
    id: 5,
    title: 'EC決済フルスタック',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '💳',
    description: '決済・在庫管理・注文メールまで含む本格ECサイト。外部決済API連携とメール通知も実装しよう！',
    hint: 'API Gatewayで入口管理、外部APIで決済、キューで注文後処理を非同期化、メールで確認通知を送ろう！',
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
      'DNS→CDN→WAF→API Gatewayで安全にルーティング。認証後、APIがRDBで在庫管理し外部決済APIと連携。注文確定後はキューで非同期にワーカーが確認メールを送信します。',
  },
  {
    id: 6,
    title: 'SNSアプリケーション',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '📸',
    description: 'フィード・認証・メディア管理・検索を備えたSNSアプリ。大量の同時アクセスと多様なデータ処理が必要！',
    hint: '認証でユーザー管理、NoSQLでフィード、ストレージでメディア、検索エンジンで投稿検索、プッシュ通知で即時通知！',
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
  },
  {
    id: 7,
    title: 'IoTデータ分析基盤',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '📡',
    description: '大量のIoTセンサーデータを収集・蓄積・分析するプラットフォーム。ストリーム処理とデータウェアハウスがカギ！',
    hint: 'イベントストリームで大量データ受信 → 時系列DBでリアルタイム蓄積 → ETLでDWHに集約 → 監視でアラート！',
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
      'IoTデバイスからAPI Gateway経由でイベントストリームに送信。ワーカーがリアルタイム処理して時系列DBに蓄積。ETLパイプラインでDWHに集約し分析。監視サービスが異常値を検知してアラートを発行します。',
  },
  {
    id: 8,
    title: 'マイクロサービス本番環境',
    difficulty: '上級',
    diffColor: '#E57373',
    emoji: '🏗️',
    description: 'コンテナオーケストレーション・CI/CD・監視まで含む本番運用レベルのマイクロサービス基盤を構築しよう！',
    hint: 'CI/CDでビルド→レジストリに保存→K8sにデプロイ。API Gatewayで入口管理し、監視・ログ・トレーシングで運用！',
    required: ['client', 'firewall', 'gateway', 'container', 'cicd', 'registry', 'api', 'db', 'queue', 'worker', 'monitor', 'logging'],
    connections: [
      ['client', 'firewall'],
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
      'CI/CDがコードをビルドしレジストリに保存、K8sにデプロイ。WAF→API Gatewayで安全にルーティングし、コンテナ内のAPIサービスが処理。監視とログ管理で本番運用の可観測性を確保します。',
  },
];

const FLOAT_EMOJIS = ['☁️', '⭐', '💡', '🚀', '✨', '🎈', '💎', '🌸', '🧩', '🔧'];

let idCounter = 0;
const genId = () => `node-${++idCounter}`;

function getRankByScore(score: number): Rank {
  if (score >= 100) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
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
  const [showHint, setShowHint] = useState(false);
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

  const rank = result ? getRankByScore(result.score) : null;

  const resetBoard = useCallback(
    (ch?: Challenge) => {
      setNodes([]);
      setConnections([]);
      setResult(null);
      setShowHint(false);
      setConnecting(null);
      setSelectedNode(null);
      setCelebrateAnim(false);
      if (ch) setChallenge(ch);
    },
    []
  );

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
    const x = e.clientX - rect.left - 54;
    const y = e.clientY - rect.top - 36;
    setNodes(prev => [
      ...prev,
      {
        id: genId(),
        ...comp,
        x: Math.max(0, Math.min(x, rect.width - 108)),
        y: Math.max(0, Math.min(y, rect.height - 72)),
      },
    ]);
  };

  const handleDragOver = (e: ReactDragEvent<HTMLDivElement>) => e.preventDefault();

  const handleNodeMouseDown = (e: ReactMouseEvent<HTMLDivElement>, node: PlacedNode) => {
    if (e.button === 2 || connecting) return;
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - node.x, y: e.clientY - rect.top - node.y };
    movingNode.current = node.id;
    setSelectedNode(node.id);
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      if (movingNode.current) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset.current.x;
        const y = e.clientY - rect.top - dragOffset.current.y;
        setNodes(prev =>
          prev.map(n =>
            n.id === movingNode.current
              ? { ...n, x: Math.max(0, Math.min(x, rect.width - 108)), y: Math.max(0, Math.min(y, rect.height - 72)) }
              : n
          )
        );
      }

      if (connecting) {
        const rect = canvas.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };

    const handleUp = () => {
      movingNode.current = null;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [connecting]);

  const startConnect = (e: ReactMouseEvent<HTMLDivElement>, node: PlacedNode) => {
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
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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
    const placedTypes = new Set(nodes.map(n => n.type));
    const missingComps = challenge.required.filter(r => !placedTypes.has(r));

    const missingConns = challenge.connections.filter(([a, b]) => {
      return !connections.some(c => {
        const fn = nodes.find(n => n.id === c.from);
        const tn = nodes.find(n => n.id === c.to);
        if (!fn || !tn) return false;
        return (fn.type === a && tn.type === b) || (fn.type === b && tn.type === a);
      });
    });

    const score = Math.round(
      ((challenge.required.length - missingComps.length) / challenge.required.length) * 50 +
        ((challenge.connections.length - missingConns.length) / challenge.connections.length) * 50
    );

    setResult({ score, missingComps, missingConns });
    if (score === 100) setCelebrateAnim(true);
  };

  const getLabel = (type: string) => ALL_COMPONENTS.find(c => c.type === type)?.label ?? type;

  const toggleCat = (name: string) => setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));

  const filteredCats = useMemo(() => {
    return CATEGORIES.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item =>
          !searchText ||
          item.label.includes(searchText) ||
          item.desc.includes(searchText) ||
          item.type.toLowerCase().includes(searchText.toLowerCase())
      ),
    })).filter(cat => cat.items.length > 0);
  }, [searchText]);

  return (
    <div
      style={{
        width: '100%',
        // Phase1AppScreen の上部UI（戻るボタン等）分だけ余白を引いて収まりを良くする
        // 余白が残りやすいので、前回より控えめに引く
        height: 'calc(100vh - 120px)',
        minHeight: 520,
        maxHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #fce4ec 0%, #e1f5fe 30%, #fff9c4 60%, #e8f5e9 100%)',
        fontFamily: "'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif",
        color: '#263238',
        overflow: 'hidden',
        position: 'relative',
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
        }
        .canvas-node:hover { z-index: 10; box-shadow: 0 8px 28px rgba(0,0,0,0.10); }
        .conn-port {
          position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%);
          width: 18px; height: 18px; border-radius: 50%; cursor: crosshair;
          border: 2.5px solid #f48fb1; background: white; transition: all 0.15s; z-index: 5;
          box-shadow: 0 2px 6px rgba(244,143,177,0.2);
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
        .floating-emoji { position: absolute; pointer-events: none; opacity: 0.13; z-index: 0; }
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

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(14px)',
          borderBottom: '2px solid rgba(244,143,177,0.08)',
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 26 }}>☁️</span>
          <div>
            <h1 style={{ fontSize: 18, color: '#880e4f', fontFamily: "'Hachi Maru Pop', cursive", fontWeight: 700, letterSpacing: '0.02em' }}>クラウドアーキテクチャパズル</h1>
            <p style={{ fontSize: 13, color: '#6a1b9a', fontWeight: 600, marginTop: 2 }}>{ALL_COMPONENTS.length}種のコンポーネントで本格システム設計！</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge">
            {challenge.emoji} {challenge.difficulty}
          </span>
          <button
            className="btn"
            onClick={() => setShowMenu(!showMenu)}
            style={{
              background: 'white',
              color: '#ad1457',
              border: '2px solid #f48fb130',
            }}
          >
            📋 チャレンジ選択
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
              padding: 24,
              width: 560,
              maxHeight: '85vh',
              overflow: 'auto',
              animation: 'pop 0.3s ease',
              boxShadow: '0 20px 60px rgba(173,20,87,0.10)',
              borderRadius: 24,
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

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Sidebar - Components (categorized with search) */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px)',
            borderRight: '2px solid rgba(244,143,177,0.06)',
          }}
        >
          <div style={{ padding: '12px 12px 8px' }}>
            <h3 style={{ fontSize: 15, color: '#880e4f', fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800, marginBottom: 8 }}>🧱 コンポーネント</h3>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, opacity: 0.4 }}>🔍</span>
              <input className="search-input" placeholder="検索..." value={searchText} onChange={e => setSearchText(e.target.value)} />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '2px 10px 10px' }}>
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
                        draggable
                        onDragStart={e => handleDragStart(e, comp)}
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
            全{ALL_COMPONENTS.length}種 / {CATEGORIES.length}カテゴリ
          </div>
        </div>

        {/* Main Canvas Area */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Challenge Info Bar */}
          <div
            style={{
              padding: '8px 18px',
              background: 'rgba(255,255,255,0.5)',
              backdropFilter: 'blur(8px)',
              borderBottom: '2px solid rgba(244,143,177,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 16, color: '#263238', marginBottom: 2, fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800 }}>
                {challenge.emoji} {challenge.title}
              </h2>
              <p style={{ fontSize: 13, color: '#455a64', lineHeight: 1.5 }}>{challenge.description}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
              <button
                className="btn"
                onClick={() => setShowHint(!showHint)}
                style={{
                  background: showHint ? '#fff3e0' : 'white',
                  color: '#f4a261',
                  border: '1.5px solid ' + (showHint ? '#f4a261' : '#f4a26120'),
                  fontSize: 13,
                }}
              >
                💡 ヒント
              </button>
              <button
                className="btn"
                onClick={() => resetBoard()}
                style={{
                  background: 'white',
                  color: '#e57373',
                  border: '1.5px solid #e5737320',
                  fontSize: 13,
                }}
              >
                🗑️ リセット
              </button>
              <button
                className="btn"
                onClick={checkAnswer}
                style={{
                  background: 'linear-gradient(135deg, #f48fb1, #ff8a65)',
                  color: 'white',
                  border: 'none',
                  fontSize: 13,
                }}
              >
                ✅ 採点する！
              </button>
            </div>
          </div>

          {showHint && (
            <div
              style={{
                padding: '8px 18px',
                background: 'rgba(255,243,224,0.85)',
                borderBottom: '1.5px solid #ffe0b220',
                fontSize: 14,
                color: '#bf360c',
                animation: 'fadeUp 0.2s ease',
                flexShrink: 0,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>💡</span> {challenge.hint}
            </div>
          )}

          {/* Canvas */}
          <div
            ref={canvasRef}
            style={{
              flex: 1,
              minHeight: 0,
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.2)',
              backgroundImage: `radial-gradient(circle, rgba(244,143,177,0.09) 1.2px, transparent 1.2px)`,
              backgroundSize: '30px 30px',
              ...(celebrateAnim ? { animation: 'celebrate 0.5s ease' } : {}),
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => {
              if (connecting) setConnecting(null);
              setSelectedNode(null);
            }}
          >
            {nodes.length === 0 && !result && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: 52, marginBottom: 10, opacity: 0.3 }}>🧩</div>
                <div style={{ fontSize: 17, color: '#c2185b', opacity: 0.75, fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800 }}>コンポーネントをここにドロップ！</div>
                <div style={{ fontSize: 13, marginTop: 8, color: '#6a1b9a', opacity: 0.85, fontWeight: 600 }}>ノードの下の●ポートをクリックして接続線を引こう</div>
              </div>
            )}

            {/* SVG Connections */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
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
                onMouseDown={e => handleNodeMouseDown(e, node)}
              >
                <div className="topline" style={{ background: node.color, left: 14, right: 14, height: 3, borderRadius: '0 0 3px 3px' }} />
                <button
                  className="del-btn"
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
                  onClick={e => startConnect(e, node)}
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

        {/* Right Panel - Result */}
        {result && (
          <div
            style={{
              width: 260,
              flexShrink: 0,
              height: '100%',
              minHeight: 0,
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(12px)',
              borderLeft: '2px solid rgba(244,143,177,0.06)',
              overflow: 'auto',
              animation: 'pop 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ padding: '16px 16px 12px', borderBottom: '1.5px solid rgba(244,143,177,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, color: '#880e4f', fontFamily: "'M PLUS Rounded 1c', sans-serif", fontWeight: 800 }}>📊 採点結果</h3>
                <button
                  onClick={() => {
                    setResult(null);
                    setCelebrateAnim(false);
                  }}
                  style={{
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

            <div style={{ padding: '12px 14px', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="white-card" style={{ padding: '12px 12px 10px' }}>
                <div className="topline" style={{ background: '#ce93d8' }} />
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#4a148c', marginBottom: 8 }}>🧱 コンポーネント配置</h4>
                {challenge.required.map(r => {
                  const placed = nodes.some(n => n.type === r);
                  return (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', fontSize: 13, color: placed ? '#1b5e20' : '#b71c1c', fontWeight: 600 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: placed ? '#e8f5e9' : '#fce4ec', fontSize: 12, fontWeight: 800 }}>
                        {placed ? '✓' : '✗'}
                      </span>
                      <span>{getLabel(r)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="white-card" style={{ padding: '12px 12px 10px' }}>
                <div className="topline" style={{ background: '#7ec8e3' }} />
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#01579b', marginBottom: 8 }}>🔗 接続チェック</h4>
                {challenge.connections.map(([a, b], i) => {
                  const ok = connections.some(c => {
                    const fn = nodes.find(n => n.id === c.from);
                    const tn = nodes.find(n => n.id === c.to);
                    if (!fn || !tn) return false;
                    return (fn.type === a && tn.type === b) || (fn.type === b && tn.type === a);
                  });
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 0', fontSize: 13, color: ok ? '#1b5e20' : '#b71c1c', fontWeight: 600 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ok ? '#e8f5e9' : '#fce4ec', fontSize: 12, fontWeight: 800 }}>
                        {ok ? '✓' : '✗'}
                      </span>
                      <span>
                        {getLabel(a)} → {getLabel(b)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="white-card" style={{ padding: '12px 12px 10px' }}>
                <div className="topline" style={{ background: 'linear-gradient(90deg, #f48fb1, #ff8a65)' }} />
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#880e4f', marginBottom: 8 }}>📖 解説</h4>
                <p style={{ fontSize: 13, color: '#37474f', lineHeight: 1.75 }}>{challenge.explanation}</p>
              </div>

              {rank && youtube ? <YoutubeEntryPoint content={youtube} rank={rank} /> : null}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        style={{
          padding: '5px 20px',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          borderTop: '1.5px solid rgba(244,143,177,0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#4a148c',
          flexShrink: 0,
          fontWeight: 600,
        }}
      >
        <span>
          📦 {nodes.length} コンポーネント ・ 🔗 {connections.length} 接続 ・ 🎯 必要: {challenge.required.length}個 {challenge.connections.length}本
        </span>
        <span>{connecting ? '🔗 接続先のポートをクリックしてね！' : 'ノード下の●をクリックで接続スタート ✨'}</span>
      </div>
    </div>
  );
}

