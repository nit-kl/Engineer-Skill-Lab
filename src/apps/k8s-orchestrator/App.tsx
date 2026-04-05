import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

type K8sResourceType = 'pod' | 'deployment' | 'service' | 'ingress';

type PodPhase = 'running' | 'crashloop' | 'pending';

type CatalogItem = {
  type: K8sResourceType;
  label: string;
  emoji: string;
  desc: string;
};

type PlacedResource = {
  id: string;
  type: K8sResourceType;
  label: string;
  emoji: string;
  x: number;
  y: number;
  podPhase?: PodPhase;
};

type Connection = { from: string; to: string };

type SeedResource = {
  type: K8sResourceType;
  x: number;
  y: number;
  podPhase?: PodPhase;
};

type Challenge = {
  id: string;
  title: string;
  /** 一覧用の一行サマリー */
  desc: string;
  /** 障害前に成立していた「完成形」の説明 */
  premise: string;
  /** 起きたインシデント */
  incident: string;
  /** プレイヤーがキャンバス上で目指す是正後のアーキテクチャ */
  mission: string;
  difficulty: 1 | 2 | 3;
  required: Partial<Record<K8sResourceType, number>>;
  requiredConnections: Array<[K8sResourceType, K8sResourceType]>;
  hint: string;
  timeLimit: number;
  /** 完成形のノード（インデックス 0..n-1）。障害表現は phase や欠けた接続で表す */
  seedResources: SeedResource[];
  /** seedResources のインデックス同士の初期接続 */
  seedConnections?: Array<[number, number]>;
};

type ChallengeResult = {
  total: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  resourcePct: number;
  connPct: number;
};

const ACCENT = '#326CE5';
const ACCENT_DARK = '#1e40af';

const RESOURCE_CATALOG: CatalogItem[] = [
  { type: 'pod', label: 'Pod', emoji: '📦', desc: 'コンテナの最小実行単位' },
  { type: 'deployment', label: 'Deployment', emoji: '🎯', desc: 'Replica管理・ローリング更新' },
  { type: 'service', label: 'Service', emoji: '🔌', desc: '安定したエンドポイント・セレクタ' },
  { type: 'ingress', label: 'Ingress', emoji: '🚪', desc: 'HTTP/HTTPS ルーティング' },
];

const CHALLENGES: Challenge[] = [
  {
    id: 'ha-single-replica',
    title: '☸️ 単一レプリカの壁',
    desc: '1 Pod だけの「完成形」が障害で露呈。レプリカを増やす。',
    premise:
      'Deployment・Service・Running Pod が1つ。社内向けAPIとして「とりあえず動いている」構成まで組み上がっている。',
    incident:
      'アクセス集中とノード負荷で唯一の Pod が落ち、アプリが長時間止まった。「1つしか無いとそこが単一障害点になる」と反省している。',
    mission:
      '本来こうしておくべきだった: Pod を合計3つに増やし、Deployment と Service からそれぞれ3本ずつ線が出て、すべての Running Pod に届くようにしろ。',
    difficulty: 1,
    required: { deployment: 1, service: 1, pod: 3 },
    requiredConnections: [
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: 'カタログから Pod を2つ追加し、新しい Pod とも Deployment・Service を結ぶ。既存の線を活かして足りない分だけ足そう',
    timeLimit: 200,
    seedResources: [
      { type: 'deployment', x: 400, y: 110 },
      { type: 'service', x: 400, y: 260 },
      { type: 'pod', x: 400, y: 400, podPhase: 'running' },
    ],
    seedConnections: [
      [0, 2],
      [1, 2],
    ],
  },
  {
    id: 'ingress-missing',
    title: '🌐 外部公開ルートが無い',
    desc: 'クラスタ内は完成しているが、Ingress が無く URL から届かない。',
    premise:
      'Deployment・Service・Running Pod×2 まで揃い、クラスタ内のトラフィック経路（Deployment→Pod、Service→Pod）は完成している。',
    incident:
      'ドメインで HTTPS 公開したいが、ブラウザから到達できない。L7 の入口（Ingress）がマニフェストに無かった。',
    mission:
      '本来こうしておくべきだった: Ingress を1つ追加し、Ingress から Service へ線を引いて「外部→Ingress→Service→Pod」の経路を完成させろ。',
    difficulty: 2,
    required: { ingress: 1, deployment: 1, service: 1, pod: 2 },
    requiredConnections: [
      ['ingress', 'service'],
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: 'Ingress をカタログから置き、🔗で Service とつなぐ。既存の Deployment/Service/Pod の配置はそのまま活かせるよ',
    timeLimit: 200,
    seedResources: [
      { type: 'deployment', x: 400, y: 120 },
      { type: 'service', x: 400, y: 260 },
      { type: 'pod', x: 240, y: 400, podPhase: 'running' },
      { type: 'pod', x: 560, y: 400, podPhase: 'running' },
    ],
    seedConnections: [
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
    ],
  },
  {
    id: 'service-no-endpoints',
    title: '🔌 Service に Endpoints が無い',
    desc: 'Deployment と Pod は繋がっているのに、Service から Pod に線が無い。',
    premise:
      'Deployment が Pod×2 を管理している「完成形」。Service リソースも存在し、マニフェスト上は問題なさそうに見える。',
    incident:
      'kubectl get endpoints が空に近く、トラフィックが Pod に届かない。selector と Service→Pod の意図が図に落ちていなかった（設計レビューで見落とした）。',
    mission:
      '本来こうしておくべきだった: Service から両方の Running Pod に線を引き、負荷分散できる状態にしろ。',
    difficulty: 2,
    required: { deployment: 1, service: 1, pod: 2 },
    requiredConnections: [
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: '足りないのは Service から Pod への2本だけ。🔗を使おう',
    timeLimit: 150,
    seedResources: [
      { type: 'deployment', x: 400, y: 120 },
      { type: 'service', x: 400, y: 280 },
      { type: 'pod', x: 240, y: 420, podPhase: 'running' },
      { type: 'pod', x: 560, y: 420, podPhase: 'running' },
    ],
    seedConnections: [
      [0, 2],
      [0, 3],
    ],
  },
  {
    id: 'deployment-orphan-pods',
    title: '🎯 Deployment が Pod を追えていない',
    desc: 'Service は Pod に届いているが、Deployment からの管理線が無い。',
    premise:
      'Service と Running Pod×2 がつながり、トラフィックは流れていた「完成形」に見えた構成。',
    incident:
      'ローリングアップデートや replicas の変更が反映されない。Deployment と Pod の親子関係（ReplicaSet 経由の管理）が図示・設定ともに抜け落ちていた。',
    mission:
      '本来こうしておくべきだった: Deployment から両方の Pod に線を引き、宣言的にレプリカを管理できる状態にしろ。',
    difficulty: 2,
    required: { deployment: 1, service: 1, pod: 2 },
    requiredConnections: [
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: 'Deployment の 🔗 から各 Pod へ線を足すだけだよ',
    timeLimit: 150,
    seedResources: [
      { type: 'deployment', x: 400, y: 120 },
      { type: 'service', x: 400, y: 280 },
      { type: 'pod', x: 240, y: 420, podPhase: 'running' },
      { type: 'pod', x: 560, y: 420, podPhase: 'running' },
    ],
    seedConnections: [
      [1, 2],
      [1, 3],
    ],
  },
  {
    id: 'rollout-crashloop',
    title: '💥 ロールアウトで CrashLoop が混ざった',
    desc: 'Ingress 付きの完成形に不良レプリカが混入し、トラフィック先が足りない。',
    premise:
      'Ingress→Service→Pod、Deployment→Pod まで含めた「完成形」。本番相当の経路がキャンバス上に揃っている。',
    incident:
      '新しい Replica の Pod が CrashLoopBackOff。Service は全レプリカに振り分けるため、Running のバックエンドが2つ以上ないと読み取りが不安定になる。',
    mission:
      '本来こうしておくべきだった: Running の Pod をもう1つ追加し、Deployment は3つの Pod すべてに、Service は Running の Pod 2つに線が届くようにしろ。Ingress→Service は維持。',
    difficulty: 3,
    required: { ingress: 1, deployment: 1, service: 1, pod: 3 },
    requiredConnections: [
      ['ingress', 'service'],
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: 'CrashLoop の Pod へも Deployment の「管理」線は引ける。Service からは Running Pod にだけ有効な線が採点に入るよ',
    timeLimit: 260,
    seedResources: [
      { type: 'ingress', x: 400, y: 70 },
      { type: 'service', x: 400, y: 200 },
      { type: 'deployment', x: 400, y: 320 },
      { type: 'pod', x: 220, y: 440, podPhase: 'running' },
      { type: 'pod', x: 580, y: 440, podPhase: 'crashloop' },
    ],
    seedConnections: [
      [0, 1],
      [2, 3],
      [2, 4],
      [1, 3],
      [1, 4],
    ],
  },
  {
    id: 'image-pull-pending',
    title: '⏳ イメージ取得で Pending のまま',
    desc: '完成形に見えるが、実体は Pending Pod だけでトラフィックが流れない。',
    premise:
      'Deployment・Service・Pod まで一見そろった「完成形」。まだ起動完了していない Pod が1つある状態からスタートする。',
    incident:
      'イメージの typo やレジストリ認証の問題で Pod が Pending のまま。Service の背後に Running の Pod が存在しないと外部からは何も返らない。',
    mission:
      '本来こうしておくべきだった: Running の Pod を2つ追加し（合計 Pod は3つ）、Deployment は3つすべてに、Service は Running の Pod 2つに線を引け。',
    difficulty: 3,
    required: { deployment: 1, service: 1, pod: 3 },
    requiredConnections: [
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: 'Pending の Pod に Service を繋いでも採点には入らない。動いている Pod を増やそう',
    timeLimit: 260,
    seedResources: [
      { type: 'deployment', x: 400, y: 120 },
      { type: 'service', x: 400, y: 280 },
      { type: 'pod', x: 400, y: 440, podPhase: 'pending' },
    ],
    seedConnections: [
      [0, 2],
      [1, 2],
    ],
  },
  {
    id: 'ingress-orphan',
    title: '🚪 Ingress だけ浮いている',
    desc: 'L7 リソースはあるが Service と結ばれておらず 503。',
    premise:
      'Ingress・Service・Deployment・Running Pod×2 まで揃い、クラスタ内部（Deployment/Service→Pod）は完成している。',
    incident:
      'Ingress コントローラは動いているが、Ingress と Service の紐付け（バックエンド定義）だけ漏れており、HTTP ルートが先に進まない。',
    mission:
      '本来こうしておくべきだった: Ingress から Service への1本を追加し、L7 から Service へ到達できるようにしろ。',
    difficulty: 1,
    required: { ingress: 1, deployment: 1, service: 1, pod: 2 },
    requiredConnections: [
      ['ingress', 'service'],
      ['deployment', 'pod'],
      ['deployment', 'pod'],
      ['service', 'pod'],
      ['service', 'pod'],
    ],
    hint: '新しいリソースは不要。Ingress の 🔗 から Service を選ぼう',
    timeLimit: 120,
    seedResources: [
      { type: 'ingress', x: 400, y: 90 },
      { type: 'deployment', x: 400, y: 210 },
      { type: 'service', x: 400, y: 330 },
      { type: 'pod', x: 240, y: 460, podPhase: 'running' },
      { type: 'pod', x: 560, y: 460, podPhase: 'running' },
    ],
    seedConnections: [
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
    ],
  },
];

/**
 * 採点でカウントする辺。
 * Service→Pod は Running の Pod にだけトラフィックが届く扱い（CrashLoop/Pending は無効）。
 * Deployment→Pod は管理関係として、Pod の phase に関わらず有効。
 */
function connectionTypeKey(a: PlacedResource, b: PlacedResource): string | null {
  const ta = a.type;
  const tb = b.type;
  const isSvcPod =
    (ta === 'service' && tb === 'pod') || (ta === 'pod' && tb === 'service');
  if (isSvcPod) {
    const pod = ta === 'pod' ? a : b;
    if (pod.podPhase !== 'running') return null;
  }
  return [ta, tb].sort().join('-');
}

function scoreChallenge(
  challenge: Challenge,
  resources: PlacedResource[],
  connections: Connection[],
): ChallengeResult {
  const reqRes = challenge.required;
  const reqConns = challenge.requiredConnections;

  let resScore = 0;
  let resTotal = 0;
  const placedCounts: Partial<Record<K8sResourceType, number>> = {};
  resources.forEach(r => {
    placedCounts[r.type] = (placedCounts[r.type] || 0) + 1;
  });
  for (const [type, count] of Object.entries(reqRes)) {
    const typed = type as K8sResourceType;
    const reqCount = count || 0;
    resTotal += reqCount;
    resScore += Math.min(placedCounts[typed] || 0, reqCount);
  }
  const resourcePct = resTotal > 0 ? resScore / resTotal : 0;

  const connMultiset = connections
    .map(c => {
      const x = resources.find(r => r.id === c.from);
      const y = resources.find(r => r.id === c.to);
      if (!x || !y) return null;
      return connectionTypeKey(x, y);
    })
    .filter(Boolean) as string[];

  let connScore = 0;
  const used = [...connMultiset];
  for (const [ta, tb] of reqConns) {
    const key = [ta, tb].sort().join('-');
    const idx = used.indexOf(key);
    if (idx >= 0) {
      connScore++;
      used.splice(idx, 1);
    }
  }
  const connPct = reqConns.length > 0 ? connScore / reqConns.length : 0;

  const total = Math.round(resourcePct * 40 + connPct * 60);
  let rank: ChallengeResult['rank'] = 'D';
  if (total >= 95) rank = 'S';
  else if (total >= 80) rank = 'A';
  else if (total >= 60) rank = 'B';
  else if (total >= 40) rank = 'C';

  return {
    total,
    rank,
    resourcePct: Math.round(resourcePct * 100),
    connPct: Math.round(connPct * 100),
  };
}

let idCounter = 0;
const uid = () => `k8s-${++idCounter}-${Date.now()}`;

function phaseBadge(phase: PodPhase): { text: string; bg: string; color: string } {
  switch (phase) {
    case 'running':
      return { text: 'Running', bg: '#E8F5E9', color: '#2E7D32' };
    case 'crashloop':
      return { text: 'CrashLoop', bg: '#FFEBEE', color: '#C62828' };
    case 'pending':
      return { text: 'Pending', bg: '#FFF8E1', color: '#F9A825' };
    default:
      return { text: phase, bg: '#eee', color: '#333' };
  }
}

export default function K8sOrchestratorApp() {
  const [screen, setScreen] = useState<'menu' | 'challenge' | 'result'>('menu');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [resources, setResources] = useState<PlacedResource[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState<{ fromId: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showHint, setShowHint] = useState(false);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === 'challenge' && selectedChallenge) {
      setTimer(selectedChallenge.timeLimit);
      timerRef.current = window.setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current) window.clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) window.clearInterval(timerRef.current);
      };
    }
    return undefined;
  }, [screen, selectedChallenge]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConnecting(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const startChallenge = (ch: Challenge) => {
    setSelectedChallenge(ch);
    setConnecting(null);
    setShowHint(false);
    setResult(null);

    const seeded: PlacedResource[] = ch.seedResources.map(s => {
      const cat = RESOURCE_CATALOG.find(c => c.type === s.type)!;
      return {
        id: uid(),
        type: s.type,
        label: cat.label,
        emoji: cat.emoji,
        x: s.x,
        y: s.y,
        podPhase: s.type === 'pod' ? (s.podPhase ?? 'running') : undefined,
      };
    });

    const seededConns: Connection[] = [];
    for (const [i, j] of ch.seedConnections ?? []) {
      const a = seeded[i];
      const b = seeded[j];
      if (a && b) seededConns.push({ from: a.id, to: b.id });
    }

    setResources(seeded);
    setConnections(seededConns);
    setScreen('challenge');
  };

  const handleSubmit = () => {
    if (!selectedChallenge) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setResult(scoreChallenge(selectedChallenge, resources, connections));
    setScreen('result');
  };

  const addResource = (item: CatalogItem) => {
    const cx = 300 + Math.random() * 280;
    const cy = 160 + Math.random() * 220;
    setResources(prev => [
      ...prev,
      {
        id: uid(),
        type: item.type,
        label: item.label,
        emoji: item.emoji,
        x: cx,
        y: cy,
        podPhase: item.type === 'pod' ? 'running' : undefined,
      },
    ]);
  };

  const removeResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
    setConnections(prev => prev.filter(c => c.from !== id && c.to !== id));
    if (connecting?.fromId === id) setConnecting(null);
  };

  const startConnection = (id: string) => {
    if (connecting) {
      if (
        connecting.fromId !== id &&
        !connections.find(
          c =>
            (c.from === connecting.fromId && c.to === id) || (c.from === id && c.to === connecting.fromId),
        )
      ) {
        setConnections(prev => [...prev, { from: connecting.fromId, to: id }]);
      }
      setConnecting(null);
      return;
    }
    setConnecting({ fromId: id });
  };

  const removeConnection = (idx: number) => {
    setConnections(prev => prev.filter((_, i) => i !== idx));
  };

  const onPointerDownResource = (e: React.PointerEvent<HTMLDivElement>, res: PlacedResource) => {
    if (e.button === 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(res.id);
    setDragOffset({
      x: e.clientX - rect.left - res.x,
      y: e.clientY - rect.top - res.y,
    });
    e.preventDefault();
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(40, Math.min(rect.width - 40, e.clientX - rect.left - dragOffset.x));
      const y = Math.max(48, Math.min(rect.height - 48, e.clientY - rect.top - dragOffset.y));
      setResources(prev => prev.map(r => (r.id === dragging ? { ...r, x, y } : r)));
    },
    [dragging, dragOffset],
  );

  const onPointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [dragging, onPointerMove, onPointerUp]);

  const checklist = useMemo(() => {
    if (!selectedChallenge) return [];
    const placed: Partial<Record<K8sResourceType, number>> = {};
    resources.forEach(r => {
      placed[r.type] = (placed[r.type] || 0) + 1;
    });
    return Object.entries(selectedChallenge.required).map(([type, need]) => {
      const rt = type as K8sResourceType;
      const cat = RESOURCE_CATALOG.find(c => c.type === rt);
      return {
        type: rt,
        label: cat?.label || type,
        emoji: cat?.emoji || '?',
        need: need || 0,
        have: placed[rt] || 0,
      };
    });
  }, [selectedChallenge, resources]);

  const runningPodCount = useMemo(
    () => resources.filter(r => r.type === 'pod' && r.podPhase === 'running').length,
    [resources],
  );

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const diffLabel = (d: 1 | 2 | 3) =>
    d === 1 ? '★ やさしい' : d === 2 ? '★★ ふつう' : '★★★ むずかしい';
  const diffColor = (d: 1 | 2 | 3) =>
    d === 1 ? '#43A047' : d === 2 ? '#F9A825' : '#E53935';

  const rankColors: Record<ChallengeResult['rank'], string> = {
    S: '#FFD700',
    A: '#326CE5',
    B: '#64B5F6',
    C: '#81C784',
    D: '#BDBDBD',
  };
  const rankEmoji: Record<ChallengeResult['rank'], string> = {
    S: '👑',
    A: '⭐',
    B: '✨',
    C: '💪',
    D: '📘',
  };

  if (screen === 'menu') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FFE0EC 0%, #E0F7FA 35%, #FFF9C4 65%, #E8F5E9 100%)',
          fontFamily: "'M PLUS Rounded 1c', 'Nunito', sans-serif",
          padding: '0',
          overflow: 'auto',
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;900&family=Hachi+Maru+Pop&display=swap"
          rel="stylesheet"
        />

        <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
          <div style={{ fontSize: '52px', marginBottom: '8px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
            ☸️
          </div>
          <h1
            style={{
              fontFamily: "'Hachi Maru Pop', cursive",
              fontSize: '28px',
              background: `linear-gradient(90deg, ${ACCENT}, #5B8DEF)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 8px',
            }}
          >
            Kubernetesオーケストレーター
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '0 0 8px', maxWidth: '560px', marginLeft: 'auto', marginRight: 'auto' }}>
            完成形に近いアーキテクチャがキャンバスに置かれた状態からスタートし、起きた障害を読んで「本来どう設計しておくべきだったか」を足し線・追加リソースで表現しよう
          </p>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
            Service→Pod の採点は Running のみ。Deployment→Pod は CrashLoop / Pending でも「管理対象」として線が有効
          </p>
        </div>

        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '10px 20px 40px' }}>
          {CHALLENGES.map((ch, i) => (
            <div
              key={ch.id}
              role="button"
              tabIndex={0}
              onClick={() => startChallenge(ch)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  startChallenge(ch);
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.92)',
                borderRadius: '18px',
                padding: '20px 24px',
                marginBottom: '14px',
                cursor: 'pointer',
                border: '2px solid transparent',
                boxShadow: `0 4px 20px ${ACCENT}14`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = `0 8px 30px ${ACCENT}26`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = `0 4px 20px ${ACCENT}14`;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: `linear-gradient(135deg, ${ACCENT}, #5B8DEF)`,
                      color: '#fff',
                      borderRadius: '10px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                    }}
                  >
                    #{i + 1}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>{ch.title}</h3>
                </div>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '10px',
                    color: diffColor(ch.difficulty),
                    background: ch.difficulty === 1 ? '#E8F5E9' : ch.difficulty === 2 ? '#FFF8E1' : '#FFEBEE',
                  }}
                >
                  {diffLabel(ch.difficulty)}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#333', fontWeight: 700, lineHeight: 1.5 }}>{ch.desc}</p>
              <div
                style={{
                  fontSize: '12px',
                  color: '#444',
                  lineHeight: 1.55,
                  marginBottom: '10px',
                  padding: '10px 12px',
                  background: '#f8faff',
                  borderRadius: '12px',
                  border: `1px solid ${ACCENT}22`,
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: ACCENT }}>完成まで </span>
                  {ch.premise}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#C62828' }}>障害 </span>
                  {ch.incident}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#2E7D32' }}>あなたの仕事 </span>
                  {ch.mission}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#888', flexWrap: 'wrap' }}>
                <span>⏱️ {formatTime(ch.timeLimit)}</span>
                <span>📦 目標 {Object.values(ch.required).reduce((a, b) => a + (b || 0), 0)}リソース</span>
                <span>🔗 目標 {ch.requiredConnections.length}本の線</span>
                <span>📐 設計図からスタート</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FFE0EC 0%, #E0F7FA 35%, #FFF9C4 65%, #E8F5E9 100%)',
          fontFamily: "'M PLUS Rounded 1c', 'Nunito', sans-serif",
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;900&family=Hachi+Maru+Pop&display=swap"
          rel="stylesheet"
        />

        <div
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: `0 8px 40px ${ACCENT}1f`,
          }}
        >
          <div style={{ fontSize: '56px', marginBottom: '4px' }}>{rankEmoji[result.rank]}</div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 900,
              fontFamily: "'Hachi Maru Pop', cursive",
              color: rankColors[result.rank],
              textShadow: `0 4px 20px ${rankColors[result.rank]}44`,
            }}
          >
            {result.rank}
          </div>
          <p style={{ fontSize: '14px', color: '#888', margin: '4px 0 24px' }}>{selectedChallenge?.title}</p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '28px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: ACCENT }}>{result.total}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>総合スコア</div>
            </div>
            <div style={{ width: 1, background: '#eee' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#1E88E5' }}>{result.resourcePct}%</div>
              <div style={{ fontSize: '11px', color: '#999' }}>リソース配置</div>
            </div>
            <div style={{ width: 1, background: '#eee' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#43A047' }}>{result.connPct}%</div>
              <div style={{ fontSize: '11px', color: '#999' }}>接続（有効な線）</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => selectedChallenge && startChallenge(selectedChallenge)}
              style={{
                padding: '12px 28px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                background: `linear-gradient(135deg, ${ACCENT}, #5B8DEF)`,
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            >
              🔄 もう一度
            </button>
            <button
              type="button"
              onClick={() => setScreen('menu')}
              style={{
                padding: '12px 28px',
                borderRadius: '14px',
                border: `2px solid ${ACCENT}`,
                cursor: 'pointer',
                background: '#fff',
                color: ACCENT,
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            >
              📋 チャレンジ一覧
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(135deg, #FFE0EC 0%, #E0F7FA 35%, #FFF9C4 65%, #E8F5E9 100%)',
        fontFamily: "'M PLUS Rounded 1c', 'Nunito', sans-serif",
        overflow: 'hidden',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;900&family=Hachi+Maru+Pop&display=swap"
        rel="stylesheet"
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.9)',
          borderBottom: '2px solid #f0f0f0',
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setScreen('menu')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px',
            }}
          >
            ⬅️
          </button>
          <div style={{ minWidth: 0, maxWidth: 'min(420px, 40vw)' }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: '14px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedChallenge?.title}
            </div>
            <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.35 }}>{selectedChallenge?.desc}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => setShowHint(h => !h)}
            style={{
              background: showHint ? '#E3F2FD' : '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '10px',
              padding: '5px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          >
            💡 ヒント
          </button>
          <div
            style={{
              fontWeight: 900,
              fontSize: '18px',
              fontFamily: "'Hachi Maru Pop', cursive",
              color: timer <= 30 ? '#E53935' : timer <= 60 ? '#F9A825' : '#333',
              minWidth: '56px',
              textAlign: 'center',
            }}
          >
            ⏱️ {formatTime(timer)}
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, #5B8DEF)`,
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 20px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✅ 採点する
          </button>
        </div>
      </div>

      {showHint && (
        <div
          style={{
            background: '#E3F2FD',
            padding: '8px 20px',
            fontSize: '13px',
            color: ACCENT_DARK,
            borderBottom: '1px solid #90CAF9',
            flexShrink: 0,
          }}
        >
          💡 {selectedChallenge?.hint}
        </div>
      )}

      <div
        style={{
          fontSize: '11px',
          color: '#333',
          padding: '8px 16px',
          background: 'rgba(255,255,255,0.88)',
          borderBottom: '1px solid #eee',
          flexShrink: 0,
          maxHeight: '120px',
          overflowY: 'auto',
          lineHeight: 1.45,
        }}
      >
        {selectedChallenge ? (
          <>
            <div>
              <span style={{ fontWeight: 800, color: ACCENT }}>完成まで </span>
              {selectedChallenge.premise}
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontWeight: 800, color: '#C62828' }}>障害 </span>
              {selectedChallenge.incident}
            </div>
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontWeight: 800, color: '#2E7D32' }}>あなたの仕事 </span>
              {selectedChallenge.mission}
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', color: '#666' }}>
              Running Pod 数 <strong>{runningPodCount}</strong>
              {' · '}
              Service→非Running Pod の線はトラフィック無効（採点に入らない）
              {' · '}
              Deployment→Pod は phase に関わらず管理線として採点に入る
            </div>
          </>
        ) : null}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: catalogOpen ? '228px' : '48px',
            flexShrink: 0,
            background: 'rgba(255,255,255,0.92)',
            borderRight: '2px solid #f0f0f0',
            transition: 'width 0.25s ease',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: catalogOpen ? 'space-between' : 'center',
              padding: '10px 12px',
              borderBottom: '1px solid #eee',
              flexShrink: 0,
            }}
          >
            {catalogOpen && <span style={{ fontWeight: 700, fontSize: '13px' }}>📦 リソース</span>}
            <button
              type="button"
              onClick={() => setCatalogOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '2px' }}
            >
              {catalogOpen ? '◀' : '▶'}
            </button>
          </div>

          {catalogOpen && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {RESOURCE_CATALOG.map(item => (
                <div
                  key={item.type}
                  role="button"
                  tabIndex={0}
                  onClick={() => addResource(item)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      addResource(item);
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f3f6ff';
                    e.currentTarget.style.borderColor = '#c5d4fc';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <span style={{ fontSize: '22px' }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '12px' }}>{item.label}</div>
                    <div style={{ fontSize: '10px', color: '#999' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {catalogOpen && (
            <div
              style={{
                borderTop: '1px solid #eee',
                padding: '10px 12px',
                flexShrink: 0,
                background: '#fafafa',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#888', marginBottom: '6px' }}>📋 必要数</div>
              {checklist.map(c => (
                <div
                  key={c.type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    marginBottom: '3px',
                    color: c.have >= c.need ? '#43A047' : '#999',
                  }}
                >
                  <span>{c.have >= c.need ? '✅' : '⬜'}</span>
                  <span>
                    {c.emoji} {c.label}
                  </span>
                  <span style={{ marginLeft: 'auto', fontWeight: 700 }}>
                    {c.have}/{c.need}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          ref={canvasRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'hidden',
            cursor: dragging ? 'grabbing' : 'default',
          }}
        >
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="k8s-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke={`${ACCENT}10`} strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#k8s-grid)" />
          </svg>

          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {connections.map((conn, idx) => {
              const a = resources.find(r => r.id === conn.from);
              const b = resources.find(r => r.id === conn.to);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const valid = connectionTypeKey(a, b) !== null;
              const stroke = valid ? ACCENT : '#BDBDBD';
              const dash = valid ? '8,4' : '4,6';
              return (
                <g key={idx}>
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={stroke}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={valid ? 0.45 : 0.35}
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={stroke}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray={dash}
                  />
                  <circle
                    cx={mx}
                    cy={my}
                    r="10"
                    fill="white"
                    stroke={stroke}
                    strokeWidth="1.5"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => removeConnection(idx)}
                  />
                  <text
                    x={mx}
                    y={my + 4}
                    textAnchor="middle"
                    fontSize="11"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    ✕
                  </text>
                </g>
              );
            })}
          </svg>

          {resources.map(res => {
            const isConnecting = connecting?.fromId === res.id;
            const isHovered = hoveredId === res.id;
            const badge = res.type === 'pod' && res.podPhase ? phaseBadge(res.podPhase) : null;
            const nodeH = badge ? 88 : 64;
            return (
              <div
                key={res.id}
                onPointerDown={e => onPointerDownResource(e, res)}
                onMouseEnter={() => setHoveredId(res.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  position: 'absolute',
                  left: res.x - 36,
                  top: res.y - (badge ? 40 : 32),
                  width: '72px',
                  minHeight: `${nodeH}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  paddingTop: '4px',
                  paddingBottom: badge ? '6px' : '4px',
                  borderRadius: '16px',
                  cursor: dragging === res.id ? 'grabbing' : 'grab',
                  background: isConnecting ? '#E3F2FD' : 'rgba(255,255,255,0.95)',
                  border: isConnecting ? `2px solid ${ACCENT}` : '2px solid #e0e0e0',
                  boxShadow: isHovered ? `0 6px 20px ${ACCENT}33` : '0 2px 10px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.15s, border 0.15s',
                  userSelect: 'none',
                  zIndex: dragging === res.id ? 100 : 1,
                  touchAction: 'none',
                }}
              >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>{res.emoji}</span>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#555', marginTop: '2px', textAlign: 'center' }}>
                  {res.label}
                </span>
                {badge ? (
                  <span
                    title={
                      res.podPhase === 'running'
                        ? '正常稼働中'
                        : res.podPhase === 'crashloop'
                          ? 'コンテナが繰り返し失敗。トラフィックは届かない扱い'
                          : 'スケジュール待ち・イメージ取得など。トラフィックは届かない扱い'
                    }
                    style={{
                      marginTop: '4px',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '2px 5px',
                      borderRadius: '6px',
                      background: badge.bg,
                      color: badge.color,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {badge.text}
                  </span>
                ) : null}

                <div
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    startConnection(res.id);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      startConnection(res.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    top: '-8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isConnecting ? ACCENT : ACCENT_DARK,
                    color: '#fff',
                    fontSize: '11px',
                    lineHeight: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  🔗
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    removeResource(res.id);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      removeResource(res.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    left: '-8px',
                    top: '-8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#757575',
                    color: '#fff',
                    fontSize: '11px',
                    lineHeight: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.15s',
                  }}
                >
                  ✕
                </div>
              </div>
            );
          })}

          {connecting && (
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: ACCENT,
                color: '#fff',
                borderRadius: '12px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: `0 4px 16px ${ACCENT}4d`,
              }}
            >
              🔗 接続先をクリック（ESCでキャンセル）
            </div>
          )}

          {resources.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#bbb',
                pointerEvents: 'none',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>☸️</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>設計図が空です</div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>通常はチャレンジ開始時に完成形が載ります。左のカタログから追加もできます</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${ACCENT}66; border-radius: 3px; }
      `}</style>
    </div>
  );
}
