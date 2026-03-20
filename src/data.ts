import { SkillApp } from './types';

export const appsData: SkillApp[] = [
  {
    id: 'cloud-arch-puzzle',
    title: 'クラウドアーキテクチャパズル',
    description: 'AWS/Azure/GCPのサービスを5つの層に配置してアーキテクチャ構成図を完成させよう！',
    category: 'クラウド',
    difficulty: 2,
    status: 'available',
    tags: ['AWS', 'Azure', 'GCP', 'アーキテクチャ'],
    icon: '☁️'
  },
  {
    id: 'sql-dojo',
    title: 'SQL道場',
    description: 'テーブルと期待結果から正しいSQLクエリを構築する対戦パズル。',
    category: 'データベース',
    difficulty: 2,
    status: 'designing',
    tags: ['SQL', 'RDB', 'チューニング'],
    icon: '🗄️'
  },
  {
    id: 'git-branch-quest',
    title: 'Gitブランチクエスト',
    description: 'ブランチ操作をビジュアルに表現。冒険を進めながらmerge, rebaseを体験しよう。',
    category: 'DevOps',
    difficulty: 1,
    status: 'designing',
    tags: ['Git', 'バージョン管理', 'チーム開発'],
    icon: '🌿'
  },
  {
    id: 'docker-container-lab',
    title: 'Dockerコンテナラボ',
    description: 'Dockerfileの命令をブロック形式で組み立て、最適化されたコンテナイメージを構築！',
    category: 'DevOps',
    difficulty: 2,
    status: 'designing',
    tags: ['Docker', 'コンテナ', 'インフラ'],
    icon: '🐳'
  },
  {
    id: 'api-design-workshop',
    title: 'API設計ワークショップ',
    description: 'REST/GraphQLのエンドポイントを設計し、リクエスト/レスポンスをプレビュー。',
    category: 'バックエンド',
    difficulty: 2,
    status: 'designing',
    tags: ['API', 'REST', 'GraphQL', '設計'],
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
    id: 'algo-visualizer',
    title: 'アルゴリズムビジュアライザー',
    description: 'ソート・探索・グラフアルゴリズムの動作を1ステップずつ可視化して理解を深めよう。',
    category: 'CS基礎',
    difficulty: 1,
    status: 'designing',
    tags: ['アルゴリズム', 'データ構造', '可視化'],
    icon: '📊'
  },
  {
    id: 'regex-battle',
    title: '正規表現バトル',
    description: '制限時間内に正規表現パターンを構築してマッチングさせるタイムアタック対戦！',
    category: 'CS基礎',
    difficulty: 1,
    status: 'designing',
    tags: ['正規表現', 'テキスト処理', 'パズル'],
    icon: '🔤'
  },
  {
    id: 'linux-command-quest',
    title: 'Linuxコマンドクエスト',
    description: '仮想ターミナルで実際のコマンドを打って冒険を進行するRPG。',
    category: 'インフラ',
    difficulty: 1,
    status: 'designing',
    tags: ['Linux', 'コマンド', 'ターミナル'],
    icon: '🐧'
  },
  {
    id: 'cicd-pipeline-builder',
    title: 'CI/CDパイプラインビルダー',
    description: 'ビルド→テスト→デプロイのブロックを接続して自動化パイプラインを構築。',
    category: 'DevOps',
    difficulty: 2,
    status: 'designing',
    tags: ['CI/CD', 'GitHub Actions', '自動化'],
    icon: '🚀'
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
    id: 'terraform-craft',
    title: 'Terraformクラフト',
    description: 'HCLのリソースブロックを組み合わせてインフラを宣言的に構築するシミュレーター。',
    category: 'クラウド',
    difficulty: 2,
    status: 'planning',
    tags: ['Terraform', 'IaC', 'インフラ自動化'],
    icon: '🏗️'
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
