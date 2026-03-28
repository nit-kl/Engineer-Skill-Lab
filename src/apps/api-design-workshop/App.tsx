import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HttpMethod } from './workshopData';
import {
  CHALLENGES,
  CHAPTERS,
  METHODS,
  METHOD_COLORS,
  STATUS_CODES,
  getRank,
  type Challenge,
  type MethodPathChallenge,
  type MultiChoiceChallenge,
  type NamingFixChallenge,
  type StatusCodeChallenge,
} from './workshopData';

const METHOD_ROW: { m: HttpMethod; desc: string; idem: string; safe: string }[] = [
  { m: 'GET', desc: 'リソース取得', idem: '冪等', safe: '安全' },
  { m: 'POST', desc: 'リソース作成', idem: '非冪等', safe: '非安全' },
  { m: 'PUT', desc: '全体置換', idem: '冪等', safe: '非安全' },
  { m: 'PATCH', desc: '部分更新', idem: '非冪等', safe: '非安全' },
  { m: 'DELETE', desc: 'リソース削除', idem: '冪等', safe: '非安全' },
];

function diffStars(d: number) {
  return ['', '⭐', '⭐⭐', '⭐⭐⭐'][d] ?? '';
}

function MethodBadge({
  method,
  selected,
  onClick,
}: {
  method: HttpMethod;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 16px',
        borderRadius: 10,
        border: `2.5px solid ${selected ? METHOD_COLORS[method] : '#E0E0E0'}`,
        background: selected ? `${METHOD_COLORS[method]}18` : '#FFF',
        color: selected ? METHOD_COLORS[method] : '#999',
        fontWeight: 800,
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: "'Fira Code','SF Mono',monospace",
        transition: 'all 0.15s',
        boxShadow: selected ? `0 2px 8px ${METHOD_COLORS[method]}30` : 'none',
      }}
    >
      {method}
    </button>
  );
}

function PathOption({
  path,
  note,
  selected,
  onClick,
  idx,
}: {
  path: string;
  note?: string;
  selected: boolean;
  onClick: () => void;
  idx: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        textAlign: 'left',
        border: `2.5px solid ${selected ? '#E65100' : '#E8E8E8'}`,
        background: selected ? '#FFF3E0' : '#FAFAFA',
        cursor: 'pointer',
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        transition: 'all 0.15s',
      }}
    >
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 900,
          flexShrink: 0,
          background: selected ? '#E65100' : '#DDD',
          color: '#FFF',
        }}
      >
        {String.fromCharCode(65 + idx)}
      </span>
      <div>
        <span
          style={{
            fontFamily: "'Fira Code','SF Mono',monospace",
            fontSize: 13,
            color: selected ? '#BF360C' : '#555',
            fontWeight: 600,
          }}
        >
          {path}
        </span>
        {note ? (
          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{note}</div>
        ) : null}
      </div>
    </button>
  );
}

function StatusBadge({
  code,
  selected,
  onClick,
}: {
  code: number;
  selected: boolean;
  onClick: () => void;
}) {
  const cat = Math.floor(code / 100);
  const colors: Record<number, string> = {
    2: '#43A047',
    3: '#F9A825',
    4: '#E65100',
    5: '#D32F2F',
  };
  const c = colors[cat] ?? '#888';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '10px 16px',
        borderRadius: 12,
        border: `2.5px solid ${selected ? c : '#E0E0E0'}`,
        background: selected ? `${c}15` : '#FFF',
        color: selected ? c : '#666',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        transition: 'all 0.15s',
        minWidth: 170,
        boxShadow: selected ? `0 2px 8px ${c}25` : 'none',
      }}
    >
      <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16 }}>{code}</span>
      <span style={{ fontSize: 11, opacity: 0.8 }}>{STATUS_CODES[code]}</span>
    </button>
  );
}

function MethodPathChallengeView({
  challenge,
  onSubmit,
}: {
  challenge: MethodPathChallenge;
  onSubmit: (a: { method: HttpMethod; pathIdx: number }) => void;
}) {
  const [method, setMethod] = useState<HttpMethod | ''>('');
  const [pathIdx, setPathIdx] = useState<number | null>(null);
  const canSubmit = Boolean(method) && pathIdx !== null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5A3D6A', marginBottom: 8 }}>
        ① HTTPメソッドを選択:
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {METHODS.map((m) => (
          <MethodBadge key={m} method={m} selected={method === m} onClick={() => setMethod(m)} />
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5A3D6A', marginBottom: 8 }}>② パスを選択:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {challenge.pathOptions.map((opt, i) => (
          <PathOption
            key={opt.path}
            path={opt.path}
            note={opt.note}
            selected={pathIdx === i}
            onClick={() => setPathIdx(i)}
            idx={i}
          />
        ))}
      </div>
      {canSubmit && method ? (
        <div
          style={{
            background: '#F5F5F5',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 14,
            border: '1px solid #E0E0E0',
          }}
        >
          <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>あなたの回答:</div>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: 14,
              padding: '2px 8px',
              background: `${METHOD_COLORS[method]}22`,
              borderRadius: 6,
              color: METHOD_COLORS[method],
              marginRight: 8,
            }}
          >
            {method}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#333' }}>
            {challenge.pathOptions[pathIdx!]?.path}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => canSubmit && method && onSubmit({ method, pathIdx: pathIdx! })}
        disabled={!canSubmit}
        style={{
          background: canSubmit
            ? 'linear-gradient(135deg, #E65100, #FF8A65)'
            : '#E0E0E0',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: 13,
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'default',
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
        }}
      >
        ✅ 回答する
      </button>
    </div>
  );
}

function NamingFixChallengeView({
  challenge,
  onSubmit,
}: {
  challenge: NamingFixChallenge;
  onSubmit: (a: { method: HttpMethod; pathIdx: number }) => void;
}) {
  const [method, setMethod] = useState<HttpMethod | ''>('');
  const [pathIdx, setPathIdx] = useState<number | null>(null);
  const canSubmit = Boolean(method) && pathIdx !== null;
  return (
    <div>
      <div
        style={{
          background: '#FFEBEE',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          border: '2px solid #EF9A9A',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: '#D32F2F', marginBottom: 4 }}>
          ❌ 修正前（これはNGです）:
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#C62828' }}>
          <span
            style={{
              fontWeight: 800,
              marginRight: 8,
              padding: '2px 8px',
              background: '#D32F2F22',
              borderRadius: 6,
            }}
          >
            {challenge.badEndpoint.method}
          </span>
          {challenge.badEndpoint.path}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5A3D6A', marginBottom: 8 }}>
        ① 正しいHTTPメソッドを選択:
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {METHODS.map((m) => (
          <MethodBadge key={m} method={m} selected={method === m} onClick={() => setMethod(m)} />
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5A3D6A', marginBottom: 8 }}>② 正しいパスを選択:</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {challenge.pathOptions.map((opt, i) => (
          <PathOption
            key={opt.path}
            path={opt.path}
            selected={pathIdx === i}
            onClick={() => setPathIdx(i)}
            idx={i}
          />
        ))}
      </div>
      {canSubmit && method ? (
        <div
          style={{
            background: '#F5F5F5',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 14,
            border: '1px solid #E0E0E0',
          }}
        >
          <div style={{ fontSize: 10, color: '#999', marginBottom: 4 }}>修正後:</div>
          <span
            style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: 14,
              padding: '2px 8px',
              background: `${METHOD_COLORS[method]}22`,
              borderRadius: 6,
              color: METHOD_COLORS[method],
              marginRight: 8,
            }}
          >
            {method}
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 14, color: '#333' }}>
            {challenge.pathOptions[pathIdx!]?.path}
          </span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => canSubmit && method && onSubmit({ method, pathIdx: pathIdx! })}
        disabled={!canSubmit}
        style={{
          background: canSubmit
            ? 'linear-gradient(135deg, #F9A825, #FFD54F)'
            : '#E0E0E0',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: 13,
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'default',
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
        }}
      >
        ✅ 回答する
      </button>
    </div>
  );
}

function StatusCodeChallengeView({
  challenge,
  onSubmit,
}: {
  challenge: StatusCodeChallenge;
  onSubmit: (code: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#5A3D6A', marginBottom: 10 }}>
        ステータスコードを選択:
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {challenge.options.map((code) => (
          <StatusBadge
            key={code}
            code={code}
            selected={selected === code}
            onClick={() => setSelected(code)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => selected !== null && onSubmit(selected)}
        disabled={selected === null}
        style={{
          background:
            selected !== null ? 'linear-gradient(135deg, #0078D4, #64B5F6)' : '#E0E0E0',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: 13,
          fontWeight: 700,
          cursor: selected !== null ? 'pointer' : 'default',
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
        }}
      >
        ✅ 回答する
      </button>
    </div>
  );
}

function MultiChoiceChallengeView({
  challenge,
  onSubmit,
}: {
  challenge: MultiChoiceChallenge;
  onSubmit: (idx: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {challenge.options.map((opt, i) => (
          <button
            type="button"
            key={i}
            onClick={() => setSelected(i)}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              textAlign: 'left',
              border: `2.5px solid ${selected === i ? '#E65100' : '#E8E8E8'}`,
              background: selected === i ? '#FFF3E0' : '#FAFAFA',
              cursor: 'pointer',
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
              fontSize: 12,
              lineHeight: 1.6,
              transition: 'all 0.15s',
              color: '#444',
              boxShadow: selected === i ? '0 2px 8px rgba(230,81,0,0.12)' : 'none',
            }}
          >
            <span
              style={{
                fontWeight: 800,
                marginRight: 8,
                color: selected === i ? '#E65100' : '#BBB',
              }}
            >
              {String.fromCharCode(65 + i)}.
            </span>
            <span
              style={{
                fontFamily:
                  opt.label.includes('{') || opt.label.includes('/')
                    ? "'Fira Code','SF Mono',monospace"
                    : 'inherit',
                fontSize: opt.label.includes('{') ? 11 : 12,
              }}
            >
              {opt.label}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => selected !== null && onSubmit(selected)}
        disabled={selected === null}
        style={{
          background:
            selected !== null ? 'linear-gradient(135deg, #E65100, #FF8A65)' : '#E0E0E0',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '10px 24px',
          fontSize: 13,
          fontWeight: 700,
          cursor: selected !== null ? 'pointer' : 'default',
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
        }}
      >
        ✅ 回答する
      </button>
    </div>
  );
}

function evaluateAnswer(ch: Challenge, answer: unknown): boolean {
  if (ch.type === 'method_path' || ch.type === 'naming_fix') {
    const a = answer as { method: HttpMethod; pathIdx: number };
    return a.method === ch.methodAnswer && ch.pathOptions[a.pathIdx]?.correct === true;
  }
  if (ch.type === 'status_code') {
    return answer === ch.answer;
  }
  if (ch.type === 'multi_choice') {
    const i = answer as number;
    return ch.options[i]?.correct === true;
  }
  return false;
}

export default function APIDesignWorkshopApp() {
  const [idx, setIdx] = useState(0);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [activeCh, setActiveCh] = useState<string | null>(null);
  const [sideOpen, setSideOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 800 : true,
  );
  const [showComplete, setShowComplete] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const ch = CHALLENGES[idx];
  const chap = CHAPTERS.find((c) => c.id === ch.chapter);
  const totalScore = useMemo(() => {
    const s = Object.values(scores);
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / CHALLENGES.length) : 0;
  }, [scores]);
  const cleared = Object.keys(scores).length;
  const filtered = activeCh ? CHALLENGES.filter((c) => c.chapter === activeCh) : CHALLENGES;

  useEffect(() => {
    setFeedback(null);
    setAttempts(0);
    setFormKey((k) => k + 1);
  }, [idx]);

  const handleSubmit = useCallback(
    (answer: unknown) => {
      const correct = evaluateAnswer(ch, answer);
      setAttempts((a) => a + 1);
      setFeedback({ correct, explanation: ch.explanation });
      if (correct) {
        const sc = Math.max(100 - Math.min(attempts * 25, 50), 30);
        setScores((prev) => {
          const next = { ...prev, [ch.id]: Math.max(prev[ch.id] ?? 0, sc) };
          if (Object.keys(next).length === CHALLENGES.length) {
            setTimeout(() => setShowComplete(true), 1500);
          }
          return next;
        });
      }
    },
    [ch, attempts],
  );

  const correctPath = 'pathOptions' in ch ? ch.pathOptions.find((p) => p.correct) : undefined;

  if (showComplete) {
    const ri = getRank(totalScore);
    return (
      <div
        style={{
          minHeight: '70vh',
          background:
            'linear-gradient(135deg, #FFE0F0 0%, #E0F0FF 30%, #FFFDE0 60%, #E0FFE8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'M PLUS Rounded 1c', sans-serif",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Fira+Code:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <div
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 24,
            padding: '44px 36px',
            maxWidth: 540,
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(230,81,0,0.15)',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 12 }}>{ri.emoji}</div>
          <div style={{ fontFamily: "'Hachi Maru Pop', cursive", fontSize: 26, color: '#5A3D6A', marginBottom: 8 }}>
            全{CHALLENGES.length}問クリア！
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 900,
              background: `linear-gradient(135deg, ${ri.color}, #E65100)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 6,
            }}
          >
            {ri.rank}ランク
          </div>
          <div style={{ fontSize: 15, color: '#888', marginBottom: 20 }}>総合スコア: {totalScore}点</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', marginBottom: 20 }}>
            {CHALLENGES.map((c) => {
              const s = scores[c.id] ?? 0;
              const r = getRank(s);
              return (
                <div
                  key={c.id}
                  style={{
                    background: r.bg,
                    borderRadius: 8,
                    padding: '3px 8px',
                    fontSize: 10,
                    color: r.color,
                    fontWeight: 700,
                  }}
                >
                  Q{c.id}:{r.rank}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowComplete(false);
              setIdx(0);
              setScores({});
              setActiveCh(null);
            }}
            style={{
              background: 'linear-gradient(135deg, #E65100, #FF8A65)',
              color: '#fff',
              border: 'none',
              borderRadius: 14,
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
            }}
          >
            🔄 もう一度挑戦
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '70vh',
        background: 'linear-gradient(135deg, #FFE0F0 0%, #E0F0FF 30%, #FFFDE0 60%, #E0FFE8 100%)',
        fontFamily: "'M PLUS Rounded 1c', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Fira+Code:wght@400;700&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          borderBottom: '3px solid #FFCC80',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ fontSize: 24 }}>⚙️</div>
        <div style={{ minWidth: 80 }}>
          <div style={{ fontFamily: "'Hachi Maru Pop', cursive", fontSize: 15, color: '#E65100', lineHeight: 1.2 }}>
            API設計ワークショップ
          </div>
          <div style={{ fontSize: 9, color: '#999' }}>RESTful API の設計力を鍛えよう！</div>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1, justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveCh(null)}
            style={{
              padding: '3px 10px',
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
              border: `2px solid ${!activeCh ? '#E65100' : '#E0E0E0'}`,
              background: !activeCh ? '#FFF3E0' : '#FFF',
              color: !activeCh ? '#E65100' : '#888',
              fontFamily: "'M PLUS Rounded 1c', sans-serif",
            }}
          >
            全て
          </button>
          {CHAPTERS.map((c) => {
            const active = activeCh === c.id;
            const done = CHALLENGES.filter((x) => x.chapter === c.id).filter((x) => scores[x.id]).length;
            const tot = CHALLENGES.filter((x) => x.chapter === c.id).length;
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setActiveCh(c.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `2px solid ${active ? c.color : '#E0E0E0'}`,
                  background: active ? `${c.color}18` : '#FFF',
                  color: active ? c.color : '#888',
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  whiteSpace: 'nowrap',
                }}
              >
                {c.emoji} {c.title}{' '}
                <span style={{ fontSize: 9, opacity: 0.7 }}>
                  {done}/{tot}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: '#888' }}>
            {cleared}/{CHALLENGES.length}
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #E65100, #FF8A65)',
              color: '#fff',
              borderRadius: 16,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            {totalScore}点
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', padding: '10px 8px', gap: 10 }}>
        <div style={{ width: sideOpen ? 190 : 36, flexShrink: 0, transition: 'width 0.2s' }}>
          <button
            type="button"
            onClick={() => setSideOpen(!sideOpen)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              borderRadius: 10,
              padding: 4,
              cursor: 'pointer',
              marginBottom: 6,
              fontSize: 12,
              color: '#999',
            }}
          >
            {sideOpen ? '◀' : '▶'}
          </button>
          {sideOpen ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.9)',
                borderRadius: 14,
                padding: 8,
                boxShadow: '0 4px 16px rgba(230,81,0,0.08)',
                maxHeight: 'calc(100vh - 110px)',
                overflowY: 'auto',
              }}
            >
              {filtered.map((c) => {
                const s = scores[c.id];
                const r = s ? getRank(s) : null;
                const active = CHALLENGES.indexOf(c) === idx;
                const cp = CHAPTERS.find((x) => x.id === c.chapter);
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setIdx(CHALLENGES.indexOf(c))}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      width: '100%',
                      padding: '6px 6px',
                      marginBottom: 2,
                      background: active ? 'linear-gradient(135deg, #FFF3E0, #E0F0FF)' : 'transparent',
                      border: active ? '2px solid #E65100' : '2px solid transparent',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: "'M PLUS Rounded 1c', sans-serif",
                      fontSize: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 900,
                        flexShrink: 0,
                        background: r
                          ? `linear-gradient(135deg, ${r.color}, #FF8A65)`
                          : active
                            ? cp?.color ?? '#E65100'
                            : '#E0E0E0',
                        color: '#fff',
                      }}
                    >
                      {r ? r.rank : c.id}
                    </div>
                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#5A3D6A',
                          fontSize: 10,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.title}
                      </div>
                      <div style={{ fontSize: 8, color: '#BBB' }}>{diffStars(c.difficulty)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 10,
              boxShadow: '0 4px 16px rgba(230,81,0,0.06)',
              borderTop: `4px solid ${chap?.color ?? '#E65100'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  background: `linear-gradient(135deg, ${chap?.color ?? '#E65100'}, #FF8A65)`,
                  color: '#fff',
                  borderRadius: 14,
                  padding: '2px 9px',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {chap?.emoji} Q{ch.id}
              </span>
              <span style={{ fontFamily: "'Hachi Maru Pop', cursive", fontSize: 15, color: '#5A3D6A' }}>
                {ch.title}
              </span>
              <span style={{ fontSize: 10, marginLeft: 'auto', color: '#AAA' }}>
                {diffStars(ch.difficulty)}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: '#555',
                lineHeight: 1.7,
                marginBottom: 8,
                background: '#FFF8F5',
                borderRadius: 10,
                padding: '10px 14px',
                border: '1px solid #FFE0CC',
              }}
            >
              {ch.description}
            </div>
            {ch.context ? (
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.6, padding: '0 4px' }}>
                💡 {ch.context}
              </div>
            ) : null}
          </div>

          {!feedback ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 10,
                boxShadow: '0 4px 16px rgba(230,81,0,0.06)',
              }}
              key={formKey}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#5A3D6A', marginBottom: 10 }}>✏️ あなたの回答</div>
              {ch.type === 'method_path' ? (
                <MethodPathChallengeView challenge={ch} onSubmit={handleSubmit} />
              ) : null}
              {ch.type === 'status_code' ? (
                <StatusCodeChallengeView challenge={ch} onSubmit={handleSubmit} />
              ) : null}
              {ch.type === 'naming_fix' ? (
                <NamingFixChallengeView challenge={ch} onSubmit={handleSubmit} />
              ) : null}
              {ch.type === 'multi_choice' ? (
                <MultiChoiceChallengeView challenge={ch} onSubmit={handleSubmit} />
              ) : null}
            </div>
          ) : null}

          {feedback ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 10,
                boxShadow: '0 4px 16px rgba(230,81,0,0.06)',
                borderTop: `4px solid ${feedback.correct ? '#81C784' : '#EF9A9A'}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{feedback.correct ? '🎉' : '🤔'}</span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: feedback.correct ? '#43A047' : '#E53935',
                    fontFamily: "'Hachi Maru Pop', cursive",
                  }}
                >
                  {feedback.correct ? '正解！' : '不正解…'}
                </span>
                {feedback.correct && scores[ch.id] ? (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: `linear-gradient(135deg, ${getRank(scores[ch.id]).color}, #FF8A65)`,
                      color: '#fff',
                      borderRadius: 14,
                      padding: '2px 10px',
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {getRank(scores[ch.id]).rank} ({scores[ch.id]}点)
                  </span>
                ) : null}
              </div>
              {ch.type === 'method_path' || ch.type === 'naming_fix' ? (
                <div
                  style={{
                    background: '#E8F5E9',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 12,
                    border: '1px solid #A5D6A7',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', marginBottom: 4 }}>✅ 正解:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 15, color: '#1B5E20' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        marginRight: 8,
                        padding: '3px 10px',
                        background: `${METHOD_COLORS[ch.methodAnswer]}22`,
                        borderRadius: 6,
                        color: METHOD_COLORS[ch.methodAnswer],
                      }}
                    >
                      {ch.methodAnswer}
                    </span>
                    {correctPath?.path}
                  </div>
                  {correctPath?.note ? (
                    <div style={{ fontSize: 10, color: '#388E3C', marginTop: 4 }}>{correctPath.note}</div>
                  ) : null}
                </div>
              ) : null}
              {ch.type === 'status_code' ? (
                <div
                  style={{
                    background: '#E8F5E9',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 12,
                    border: '1px solid #A5D6A7',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', marginBottom: 4 }}>✅ 正解:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 16, color: '#1B5E20', fontWeight: 800 }}>
                    {ch.answer} {STATUS_CODES[ch.answer]}
                  </div>
                </div>
              ) : null}
              {ch.type === 'multi_choice' ? (
                <div
                  style={{
                    background: '#E8F5E9',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 12,
                    border: '1px solid #A5D6A7',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2E7D32', marginBottom: 4 }}>✅ 正解:</div>
                  <div style={{ fontSize: 12, color: '#1B5E20' }}>
                    {ch.options.find((o) => o.correct)?.label}
                  </div>
                </div>
              ) : null}
              <div
                style={{
                  background: '#F3E5F5',
                  borderRadius: 10,
                  padding: '10px 14px',
                  border: '1px solid #CE93D8',
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6A1B9A', marginBottom: 4 }}>📚 解説:</div>
                <div style={{ fontSize: 12, color: '#4A148C', lineHeight: 1.7 }}>{feedback.explanation}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                {!feedback.correct ? (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setFormKey((k) => k + 1);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #F9A825, #FFD54F)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      padding: '9px 20px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'M PLUS Rounded 1c', sans-serif",
                    }}
                  >
                    🔄 もう一度
                  </button>
                ) : null}
                {idx < CHALLENGES.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const ni = activeCh
                        ? CHALLENGES.findIndex((c, i) => i > idx && c.chapter === activeCh)
                        : idx + 1;
                      setIdx(ni >= 0 ? ni : idx + 1);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #81C784, #66BB6A)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      padding: '9px 20px',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'M PLUS Rounded 1c', sans-serif",
                    }}
                  >
                    次の問題へ ➡️
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div
            style={{
              background: 'rgba(255,255,255,0.85)',
              borderRadius: 14,
              padding: '14px 18px',
              boxShadow: '0 2px 10px rgba(230,81,0,0.04)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#E65100', marginBottom: 8 }}>
              📖 HTTPメソッド早見表
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {METHOD_ROW.map((x) => (
                <div
                  key={x.m}
                  style={{
                    background: `${METHOD_COLORS[x.m]}10`,
                    border: `1px solid ${METHOD_COLORS[x.m]}30`,
                    borderRadius: 10,
                    padding: '6px 10px',
                    minWidth: 95,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      fontSize: 12,
                      color: METHOD_COLORS[x.m],
                    }}
                  >
                    {x.m}
                  </div>
                  <div style={{ fontSize: 10, color: '#666' }}>{x.desc}</div>
                  <div style={{ fontSize: 9, color: '#999' }}>
                    {x.idem} / {x.safe}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
