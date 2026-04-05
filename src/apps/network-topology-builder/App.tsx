import { useState, useRef, useCallback, useEffect, useMemo } from 'react';

type DeviceType =
  | 'router'
  | 'switch'
  | 'firewall'
  | 'server'
  | 'client'
  | 'loadbalancer'
  | 'wap'
  | 'dns'
  | 'internet';

type DeviceCatalogItem = {
  type: DeviceType;
  label: string;
  emoji: string;
  desc: string;
  category: string;
};

type Device = {
  id: string;
  type: DeviceType;
  label: string;
  emoji: string;
  x: number;
  y: number;
};

type Connection = {
  from: string;
  to: string;
};

type Challenge = {
  id: string;
  title: string;
  desc: string;
  difficulty: 1 | 2 | 3;
  required: Partial<Record<DeviceType, number>>;
  requiredConnections: Array<[DeviceType, DeviceType]>;
  hint: string;
  timeLimit: number;
};

type ChallengeResult = {
  total: number;
  rank: 'S' | 'A' | 'B' | 'C' | 'D';
  devicePct: number;
  connPct: number;
};

const DEVICE_CATALOG: DeviceCatalogItem[] = [
  { type: 'router', label: 'ルーター', emoji: '🔀', desc: 'パケットを最適経路で転送', category: 'L3' },
  { type: 'switch', label: 'スイッチ', emoji: '🔌', desc: 'MACアドレスでフレーム転送', category: 'L2' },
  { type: 'firewall', label: 'ファイアウォール', emoji: '🛡️', desc: '不正アクセスを遮断', category: 'セキュリティ' },
  { type: 'server', label: 'サーバー', emoji: '🖥️', desc: 'サービスを提供するホスト', category: 'ホスト' },
  { type: 'client', label: 'クライアント', emoji: '💻', desc: 'サービスを利用する端末', category: 'ホスト' },
  { type: 'loadbalancer', label: 'ロードバランサー', emoji: '⚖️', desc: 'トラフィックを分散', category: 'L4-7' },
  { type: 'wap', label: 'アクセスポイント', emoji: '📡', desc: '無線LANの接続点', category: 'L2' },
  { type: 'dns', label: 'DNSサーバー', emoji: '📖', desc: '名前解決を担当', category: 'サービス' },
  { type: 'internet', label: 'インターネット', emoji: '🌐', desc: '外部ネットワーク', category: 'WAN' },
];

const CHALLENGES: Challenge[] = [
  {
    id: 'basic-lan',
    title: '🏠 基本LAN構築',
    desc: 'スイッチを中心に3台のクライアントを接続し、ルーターでインターネットに出よう！',
    difficulty: 1,
    required: { router: 1, switch: 1, client: 3, internet: 1 },
    requiredConnections: [
      ['router', 'internet'],
      ['router', 'switch'],
      ['switch', 'client'],
      ['switch', 'client'],
      ['switch', 'client'],
    ],
    hint: 'スター型トポロジー：スイッチを中央に配置し、各端末を接続しましょう',
    timeLimit: 120,
  },
  {
    id: 'secure-web',
    title: '🔒 セキュアWeb環境',
    desc: 'ファイアウォールの内側にWebサーバーとDNSを配置し、安全なアクセス環境を構築！',
    difficulty: 2,
    required: { router: 1, firewall: 1, switch: 1, server: 1, dns: 1, internet: 1 },
    requiredConnections: [
      ['internet', 'router'],
      ['router', 'firewall'],
      ['firewall', 'switch'],
      ['switch', 'server'],
      ['switch', 'dns'],
    ],
    hint: 'インターネット → ルーター → ファイアウォール → スイッチ → サーバー群',
    timeLimit: 150,
  },
  {
    id: 'load-balanced',
    title: '⚖️ 負荷分散アーキテクチャ',
    desc: 'ロードバランサーで2台のサーバーにトラフィックを分散させよう！',
    difficulty: 2,
    required: { router: 1, firewall: 1, loadbalancer: 1, server: 2, internet: 1 },
    requiredConnections: [
      ['internet', 'router'],
      ['router', 'firewall'],
      ['firewall', 'loadbalancer'],
      ['loadbalancer', 'server'],
      ['loadbalancer', 'server'],
    ],
    hint: 'FW → LB → 複数サーバーの直列構成を作りましょう',
    timeLimit: 150,
  },
  {
    id: 'campus-network',
    title: '🏫 キャンパスネットワーク',
    desc: '有線・無線を統合したキャンパスネットワーク。複数スイッチをルーターで束ねよう！',
    difficulty: 3,
    required: { router: 1, switch: 2, wap: 1, client: 2, server: 1, internet: 1, firewall: 1 },
    requiredConnections: [
      ['internet', 'router'],
      ['router', 'firewall'],
      ['firewall', 'switch'],
      ['switch', 'switch'],
      ['switch', 'client'],
      ['switch', 'client'],
      ['switch', 'wap'],
      ['switch', 'server'],
    ],
    hint: 'コアスイッチとアクセススイッチの2層構成。WAPはアクセス層に接続',
    timeLimit: 200,
  },
  {
    id: 'dmz-architecture',
    title: '🏰 DMZアーキテクチャ',
    desc: 'DMZに公開サーバーを置き、内部ネットワークと分離するセキュアな構成を実現！',
    difficulty: 3,
    required: { router: 1, firewall: 2, switch: 2, server: 2, dns: 1, client: 2, internet: 1 },
    requiredConnections: [
      ['internet', 'router'],
      ['router', 'firewall'],
      ['firewall', 'switch'],
      ['switch', 'server'],
      ['switch', 'dns'],
      ['firewall', 'firewall'],
      ['firewall', 'switch'],
      ['switch', 'client'],
      ['switch', 'client'],
    ],
    hint: '外部FW → DMZ(公開サーバー) → 内部FW → 内部LAN の多段構成',
    timeLimit: 240,
  },
];

function scoreChallenge(challenge: Challenge, devices: Device[], connections: Connection[]): ChallengeResult {
  const reqDevices = challenge.required;
  const reqConns = challenge.requiredConnections;

  let deviceScore = 0;
  let deviceTotal = 0;
  const placedCounts: Partial<Record<DeviceType, number>> = {};
  devices.forEach(d => {
    placedCounts[d.type] = (placedCounts[d.type] || 0) + 1;
  });
  for (const [type, count] of Object.entries(reqDevices)) {
    const typed = type as DeviceType;
    const reqCount = count || 0;
    deviceTotal += reqCount;
    deviceScore += Math.min(placedCounts[typed] || 0, reqCount);
  }
  const devicePct = deviceTotal > 0 ? deviceScore / deviceTotal : 0;

  const connSet = connections
    .map(c => {
      const a = devices.find(d => d.id === c.from);
      const b = devices.find(d => d.id === c.to);
      return a && b ? [a.type, b.type].sort().join('-') : null;
    })
    .filter(Boolean) as string[];

  let connScore = 0;
  const usedConns = [...connSet];
  for (const [a, b] of reqConns) {
    const key = [a, b].sort().join('-');
    const idx = usedConns.indexOf(key);
    if (idx >= 0) {
      connScore++;
      usedConns.splice(idx, 1);
    }
  }
  const connPct = reqConns.length > 0 ? connScore / reqConns.length : 0;

  const total = Math.round(devicePct * 40 + connPct * 60);
  let rank: ChallengeResult['rank'] = 'D';
  if (total >= 95) rank = 'S';
  else if (total >= 80) rank = 'A';
  else if (total >= 60) rank = 'B';
  else if (total >= 40) rank = 'C';

  return {
    total,
    rank,
    devicePct: Math.round(devicePct * 100),
    connPct: Math.round(connPct * 100),
  };
}

let idCounter = 0;
const uid = () => `dev-${++idCounter}-${Date.now()}`;

export default function NetworkTopologyBuilderApp() {
  const [screen, setScreen] = useState<'menu' | 'challenge' | 'result'>('menu');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connecting, setConnecting] = useState<{ fromId: string } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showHint, setShowHint] = useState(false);
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(true);
  const [hoveredDevice, setHoveredDevice] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === 'challenge' && selectedChallenge) {
      setTimer(selectedChallenge.timeLimit);
      timerRef.current = window.setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              window.clearInterval(timerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
        }
      };
    }
    return undefined;
  }, [screen, selectedChallenge]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnecting(null);
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const startChallenge = (ch: Challenge) => {
    setSelectedChallenge(ch);
    setDevices([]);
    setConnections([]);
    setConnecting(null);
    setShowHint(false);
    setResult(null);
    setScreen('challenge');
  };

  const handleSubmit = () => {
    if (!selectedChallenge) return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    const res = scoreChallenge(selectedChallenge, devices, connections);
    setResult(res);
    setScreen('result');
  };

  const addDevice = (catalogItem: DeviceCatalogItem) => {
    const cx = 300 + Math.random() * 300;
    const cy = 150 + Math.random() * 250;
    setDevices(prev => [
      ...prev,
      {
        id: uid(),
        type: catalogItem.type,
        label: catalogItem.label,
        emoji: catalogItem.emoji,
        x: cx,
        y: cy,
      },
    ]);
  };

  const removeDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
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

  const onPointerDownDevice = (e: React.PointerEvent<HTMLDivElement>, dev: Device) => {
    if (e.button === 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragging(dev.id);
    setDragOffset({
      x: e.clientX - rect.left - dev.x,
      y: e.clientY - rect.top - dev.y,
    });
    e.preventDefault();
  };

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(30, Math.min(rect.width - 30, e.clientX - rect.left - dragOffset.x));
      const y = Math.max(30, Math.min(rect.height - 30, e.clientY - rect.top - dragOffset.y));
      setDevices(prev => prev.map(d => (d.id === dragging ? { ...d, x, y } : d)));
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
    const placed: Partial<Record<DeviceType, number>> = {};
    devices.forEach(d => {
      placed[d.type] = (placed[d.type] || 0) + 1;
    });
    return Object.entries(selectedChallenge.required).map(([type, need]) => {
      const deviceType = type as DeviceType;
      const cat = DEVICE_CATALOG.find(c => c.type === deviceType);
      return {
        type: deviceType,
        label: cat?.label || type,
        emoji: cat?.emoji || '?',
        need: need || 0,
        have: placed[deviceType] || 0,
      };
    });
  }, [selectedChallenge, devices]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const diffLabel = (difficulty: 1 | 2 | 3) =>
    difficulty === 1 ? '★ やさしい' : difficulty === 2 ? '★★ ふつう' : '★★★ むずかしい';
  const diffColor = (difficulty: 1 | 2 | 3) =>
    difficulty === 1 ? '#43A047' : difficulty === 2 ? '#F9A825' : '#E53935';

  const rankColors: Record<ChallengeResult['rank'], string> = {
    S: '#FFD700',
    A: '#FF6B9D',
    B: '#64B5F6',
    C: '#81C784',
    D: '#BDBDBD',
  };
  const rankEmoji: Record<ChallengeResult['rank'], string> = {
    S: '👑',
    A: '🌟',
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
            🌐
          </div>
          <h1
            style={{
              fontFamily: "'Hachi Maru Pop', cursive",
              fontSize: '28px',
              background: 'linear-gradient(90deg, #C62828, #E53935, #FF5252)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: '0 0 8px',
            }}
          >
            ネットワークトポロジービルダー
          </h1>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            ドラッグ＆ドロップでネットワーク機器を配置し、ケーブルで接続しよう！
          </p>
        </div>

        <div style={{ maxWidth: '760px', margin: '0 auto', padding: '10px 20px 40px' }}>
          {CHALLENGES.map((ch, i) => (
            <div
              key={ch.id}
              onClick={() => startChallenge(ch)}
              style={{
                background: 'rgba(255,255,255,0.92)',
                borderRadius: '18px',
                padding: '20px 24px',
                marginBottom: '14px',
                cursor: 'pointer',
                border: '2px solid transparent',
                boxShadow: '0 4px 20px rgba(198,40,40,0.08)',
                transition: 'all 0.2s ease',
                borderImage: 'linear-gradient(135deg, #C6282833, #E5393533) 1',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(198,40,40,0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(198,40,40,0.08)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      background: 'linear-gradient(135deg, #C62828, #E53935)',
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
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#555', lineHeight: 1.6 }}>{ch.desc}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#888' }}>
                <span>⏱️ {formatTime(ch.timeLimit)}</span>
                <span>📦 {Object.values(ch.required).reduce((a, b) => a + (b || 0), 0)}台</span>
                <span>🔗 {ch.requiredConnections.length}本</span>
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
            boxShadow: '0 8px 40px rgba(198,40,40,0.12)',
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
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#C62828' }}>{result.total}</div>
              <div style={{ fontSize: '11px', color: '#999' }}>総合スコア</div>
            </div>
            <div style={{ width: 1, background: '#eee' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#1E88E5' }}>{result.devicePct}%</div>
              <div style={{ fontSize: '11px', color: '#999' }}>機器配置</div>
            </div>
            <div style={{ width: 1, background: '#eee' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#43A047' }}>{result.connPct}%</div>
              <div style={{ fontSize: '11px', color: '#999' }}>接続正解率</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={() => selectedChallenge && startChallenge(selectedChallenge)}
              style={{
                padding: '12px 28px',
                borderRadius: '14px',
                border: 'none',
                cursor: 'pointer',
                background: 'linear-gradient(135deg, #C62828, #E53935)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            >
              🔄 もう一度
            </button>
            <button
              onClick={() => setScreen('menu')}
              style={{
                padding: '12px 28px',
                borderRadius: '14px',
                border: '2px solid #C62828',
                cursor: 'pointer',
                background: '#fff',
                color: '#C62828',
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
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedChallenge?.title}</div>
            <div style={{ fontSize: '11px', color: '#999' }}>{selectedChallenge?.desc}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={() => setShowHint(h => !h)}
            style={{
              background: showHint ? '#FFF3E0' : '#f5f5f5',
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
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, #C62828, #E53935)',
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
            background: '#FFF8E1',
            padding: '8px 20px',
            fontSize: '13px',
            color: '#E65100',
            borderBottom: '1px solid #FFE082',
            flexShrink: 0,
          }}
        >
          💡 {selectedChallenge?.hint}
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: catalogOpen ? '220px' : '48px',
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
            {catalogOpen && <span style={{ fontWeight: 700, fontSize: '13px' }}>📦 機器カタログ</span>}
            <button
              onClick={() => setCatalogOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '2px' }}
            >
              {catalogOpen ? '◀' : '▶'}
            </button>
          </div>

          {catalogOpen && (
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }}>
              {DEVICE_CATALOG.map(item => (
                <div
                  key={item.type}
                  onClick={() => addDevice(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '4px',
                    transition: 'background 0.15s',
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f8f8ff';
                    e.currentTarget.style.borderColor = '#e0e0ff';
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
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#888', marginBottom: '6px' }}>📋 必要な機器</div>
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
              <pattern id="network-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(198,40,40,0.06)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#network-grid)" />
          </svg>

          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {connections.map((conn, idx) => {
              const a = devices.find(d => d.id === conn.from);
              const b = devices.find(d => d.id === conn.to);
              if (!a || !b) return null;
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              return (
                <g key={idx}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#C62828" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#E53935" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="8,4" />
                  <circle
                    cx={mx}
                    cy={my}
                    r="10"
                    fill="white"
                    stroke="#E53935"
                    strokeWidth="1.5"
                    style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                    onClick={() => removeConnection(idx)}
                  />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize="11" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    ✕
                  </text>
                </g>
              );
            })}
          </svg>

          {devices.map(dev => {
            const isConnecting = connecting?.fromId === dev.id;
            const isHovered = hoveredDevice === dev.id;
            return (
              <div
                key={dev.id}
                onPointerDown={e => onPointerDownDevice(e, dev)}
                onMouseEnter={() => setHoveredDevice(dev.id)}
                onMouseLeave={() => setHoveredDevice(null)}
                style={{
                  position: 'absolute',
                  left: dev.x - 32,
                  top: dev.y - 32,
                  width: '64px',
                  height: '64px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '16px',
                  cursor: dragging === dev.id ? 'grabbing' : 'grab',
                  background: isConnecting ? '#FFEBEE' : 'rgba(255,255,255,0.95)',
                  border: isConnecting ? '2px solid #E53935' : '2px solid #e0e0e0',
                  boxShadow: isHovered ? '0 6px 20px rgba(198,40,40,0.2)' : '0 2px 10px rgba(0,0,0,0.08)',
                  transition: 'box-shadow 0.15s, border 0.15s',
                  userSelect: 'none',
                  zIndex: dragging === dev.id ? 100 : 1,
                  touchAction: 'none',
                }}
              >
                <span style={{ fontSize: '24px', lineHeight: 1 }}>{dev.emoji}</span>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#555', marginTop: '2px' }}>{dev.label}</span>

                <div
                  onClick={e => {
                    e.stopPropagation();
                    startConnection(dev.id);
                  }}
                  style={{
                    position: 'absolute',
                    right: '-8px',
                    top: '-8px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isConnecting ? '#E53935' : '#C62828',
                    color: '#fff',
                    fontSize: '12px',
                    lineHeight: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                >
                  🔗
                </div>

                <div
                  onClick={e => {
                    e.stopPropagation();
                    removeDevice(dev.id);
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
                background: '#E53935',
                color: '#fff',
                borderRadius: '12px',
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 4px 16px rgba(229,57,53,0.3)',
                animation: 'pulse 1.2s infinite',
              }}
            >
              🔗 接続先の機器をクリックしてください（ESCでキャンセル）
            </div>
          )}

          {devices.length === 0 && (
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
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>左のカタログから機器を追加しよう！</div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>クリックで配置 → ドラッグで移動 → 🔗で接続</div>
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
        ::-webkit-scrollbar-thumb { background: #E5393566; border-radius: 3px; }
      `}</style>
    </div>
  );
}
