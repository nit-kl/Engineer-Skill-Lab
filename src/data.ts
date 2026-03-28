import { SkillApp } from './types';

export const appsData: SkillApp[] = [
  {
    id: 'cloud-arch-puzzle',
    title: 'クラウドアーキテクチャパズル',
    description:
      'DNS・ロードバランサー・API・データストアなど、クラウドでよく使われる役割のコンポーネントを配置して線でつなぎ、要件に合うアーキテクチャ構成を組み立てよう！',
    category: 'クラウド',
    difficulty: 2,
    status: 'available',
    tags: ['クラウド', 'インフラ', 'アーキテクチャ'],
    icon: '☁️'
  },
  {
    id: 'sql-dojo',
    title: 'SQL道場',
    description:
      'ミニSQLエンジン上で28問のクエリに挑戦。SELECT・JOIN・集計・CASE式まで、テーブルを見ながら正解SQLを書こう。',
    category: 'データベース',
    difficulty: 2,
    status: 'available',
    tags: ['SQL', 'RDB', 'チューニング'],
    icon: '🗄️'
  },
  {
    id: 'api-design-workshop',
    title: 'API設計ワークショップ',
    description:
      'HTTPメソッド・ステータスコード・RESTfulなURL・JSONの形など、全30問のクイズでAPI設計の基礎をインタラクティブに学べます。',
    category: 'バックエンド',
    difficulty: 2,
    status: 'available',
    tags: ['API', 'REST', 'HTTP', '設計'],
    icon: '🔌'
  },
  {
    id: 'security-vuln-hunter',
    title: 'セキュリティ脆弱性ハンター',
    description: '意図的に脆弱性が埋め込まれたコードから問題箇所を特定するCTF形式ゲーム。',
    category: 'セキュリティ',
    difficulty: 3,
    status: 'designing',
    tags: ['セキュリティ', 'OWASP', '脆弱性診断'],
    icon: '🛡️'
  },
  {
    id: 'network-topology-builder',
    title: 'ネットワークトポロジービルダー',
    description: 'サブネット・ルーター・ファイアウォールを配置してセキュアなネットワークを設計。',
    category: 'ネットワーク',
    difficulty: 3,
    status: 'designing',
    tags: ['ネットワーク', 'TCP/IP', 'インフラ設計'],
    icon: '🌐'
  },
  {
    id: 'k8s-orchestrator',
    title: 'Kubernetesオーケストレーター',
    description: 'Pod, Service, Deploymentをビジュアルに配置してクラスタを構築・運用シミュレーション。',
    category: 'クラウド',
    difficulty: 3,
    status: 'designing',
    tags: ['Kubernetes', 'コンテナオーケストレーション'],
    icon: '☸️'
  },
  {
    id: 'system-design-interview',
    title: 'システムデザイン模擬面接',
    description: 'コンポーネント図を描きながらAIがアーキテクチャ設計のフィードバックを提供。',
    category: 'CS基礎',
    difficulty: 3,
    status: 'planning',
    tags: ['システム設計', 'スケーラビリティ', 'AI対話'],
    icon: '📐'
  },
  {
    id: 'monitoring-dash-sim',
    title: '監視ダッシュボードシミュレーター',
    description: '本番障害を模したシナリオで、メトリクス・ログ・トレースから原因を特定するSRE訓練。',
    category: 'インフラ',
    difficulty: 3,
    status: 'planning',
    tags: ['SRE', '監視', 'トラブルシューティング'],
    icon: '📈'
  }
];
