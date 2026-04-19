import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AUTH_LEVELS,
  BODY_PRESENCE,
  CHALLENGES,
  HEADER_PARTS,
  METHODS,
  sortHeaderParts,
  type AuthLevel,
  type BodyPresence,
  type EndpointAnswer,
  type EndpointDef,
  type HeaderPart,
  type HttpMethod,
  type ScenarioChallenge,
} from './workshopData';

type UserAnswer = {
  method: HttpMethod | '';
  path: string[];
  status: string;
  auth: AuthLevel | '';
  requestBody: BodyPresence | '';
  responseBody: BodyPresence | '';
  headers: HeaderPart[];
};

const EMPTY_USER_ANSWER: UserAnswer = {
  method: '',
  path: [],
  status: '',
  auth: '',
  requestBody: '',
  responseBody: '',
  headers: [],
};

function arraysEqual(a: string[] | undefined, b: string[] | undefined) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

const STATUS_CODES = [
  { code: '200', label: '200 OK', desc: '成功' },
  { code: '201', label: '201 Created', desc: '作成成功' },
  { code: '204', label: '204 No Content', desc: '成功（本文なし）' },
  { code: '400', label: '400 Bad Request', desc: 'リクエスト不正' },
  { code: '404', label: '404 Not Found', desc: '見つからない' },
] as const;

const AUTH_LABEL: Record<AuthLevel, string> = {
  public: '認証不要（公開）',
  bearer: '要認証（Bearer 等）',
};

const BODY_LABEL: Record<BodyPresence, string> = {
  none: 'なし',
  json: 'JSON',
};

const HEADER_BTN: Record<HeaderPart, { title: string; sub: string }> = {
  accept: { title: 'Accept', sub: '望む表現（例: application/json）' },
  contentType: { title: 'Content-Type', sub: '送るボディの形式（例: application/json）' },
  authorization: { title: 'Authorization', sub: 'トークン等（例: Bearer …）' },
};

function toggleHeader(parts: HeaderPart[], part: HeaderPart): HeaderPart[] {
  const next = new Set(parts);
  if (next.has(part)) next.delete(part);
  else next.add(part);
  return sortHeaderParts([...next]);
}

function formatHeaderSummary(parts: HeaderPart[]): string {
  if (parts.length === 0) return '—';
  return sortHeaderParts([...parts])
    .map((p) => HEADER_BTN[p].title)
    .join('、');
}

function headersEqual(a: HeaderPart[], b: HeaderPart[]): boolean {
  return sortHeaderParts([...a]).join(',') === sortHeaderParts([...b]).join(',');
}

const DIFF_STY = {
  legend: { fontSize: 10, color: '#64748B', lineHeight: 1.5, marginBottom: 8 } as const,
  tableHead: {
    display: 'grid',
    gridTemplateColumns: 'minmax(72px, 88px) 1fr 1fr',
    gap: 8,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottom: '1px solid #E2E8F0',
    fontSize: 10,
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  row: { display: 'grid', gridTemplateColumns: 'minmax(72px, 88px) 1fr 1fr', gap: 8, alignItems: 'start' as const },
  label: { color: '#64748B', fontWeight: 700, fontSize: 11, paddingTop: 6 },
  userCell: (match: boolean) => ({
    padding: '7px 9px',
    borderRadius: 8,
    border: `2px solid ${match ? '#86EFAC' : '#FCA5A5'}`,
    background: match ? '#F0FDF4' : '#FEF2F2',
    fontFamily: "'Fira Code', monospace",
    fontSize: 11,
    color: match ? '#166534' : '#991B1B',
    wordBreak: 'break-all' as const,
    minHeight: 32,
    boxSizing: 'border-box' as const,
  }),
  modelCell: {
    padding: '7px 9px',
    borderRadius: 8,
    border: '2px solid #A7F3D0',
    background: '#ECFDF5',
    fontFamily: "'Fira Code', monospace",
    fontSize: 11,
    color: '#14532D',
    wordBreak: 'break-all' as const,
    minHeight: 32,
    boxSizing: 'border-box' as const,
  },
};

function AnswerComparisonBlock({
  user,
  model,
  compact,
  showLegend,
}: {
  user: UserAnswer;
  model: EndpointAnswer;
  compact?: boolean;
  showLegend?: boolean;
}) {
  const uMethod = user.method || '—';
  const uPath = user.path.length > 0 ? `/${user.path.join('/')}` : '—';
  const uStatus = user.status || '—';
  const uAuth = user.auth ? AUTH_LABEL[user.auth] : '—';
  const uHdr = formatHeaderSummary(user.headers);
  const uReq = user.requestBody ? BODY_LABEL[user.requestBody] : '—';
  const uRes = user.responseBody ? BODY_LABEL[user.responseBody] : '—';

  const rows: { key: string; label: string; u: string; m: string; match: boolean }[] = [
    { key: 'm', label: 'メソッド', u: uMethod, m: model.method, match: user.method === model.method },
    {
      key: 'p',
      label: 'パス',
      u: uPath,
      m: `/${model.path.join('/')}`,
      match: arraysEqual(user.path, model.path),
    },
    { key: 's', label: 'ステータス', u: uStatus, m: model.status, match: user.status === model.status },
    { key: 'a', label: '認証', u: uAuth, m: AUTH_LABEL[model.auth], match: user.auth === model.auth },
    {
      key: 'h',
      label: 'ヘッダー',
      u: uHdr,
      m: formatHeaderSummary(model.headers),
      match: headersEqual(user.headers, model.headers),
    },
    {
      key: 'req',
      label: 'リクエスト本文',
      u: uReq,
      m: BODY_LABEL[model.requestBody],
      match: user.requestBody === model.requestBody,
    },
    {
      key: 'res',
      label: 'レスポンス本文',
      u: uRes,
      m: BODY_LABEL[model.responseBody],
      match: user.responseBody === model.responseBody,
    },
  ];

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: compact ? 10 : 12,
        border: '1px solid #E2E8F0',
        padding: compact ? '10px 10px 8px' : '12px 12px 10px',
        marginTop: compact ? 0 : 2,
      }}
    >
      {showLegend !== false && (
        <p style={DIFF_STY.legend}>
          <span style={{ color: '#15803D' }}>■</span> 一致{' '}
          <span style={{ color: '#DC2626', marginLeft: 8 }}>■</span> 差分あり（左があなた・右が模範）
        </p>
      )}
      <div style={{ ...DIFF_STY.tableHead, fontSize: compact ? 9 : 10 }}>
        <span>項目</span>
        <span>あなたの回答</span>
        <span>模範（代表例）</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} style={{ ...DIFF_STY.row, marginBottom: compact ? 6 : 7 }}>
          <div style={{ ...DIFF_STY.label, fontSize: compact ? 10 : 11 }}>{r.label}</div>
          <div style={DIFF_STY.userCell(r.match)}>{r.u}</div>
          <div style={DIFF_STY.modelCell}>{r.m}</div>
        </div>
      ))}
    </div>
  );
}

const METHOD_META: Record<
  HttpMethod,
  { color: string; bg: string; desc: string; icon: string }
> = {
  GET: { color: '#2563EB', bg: '#DBEAFE', desc: '取得', icon: '📥' },
  POST: { color: '#059669', bg: '#D1FAE5', desc: '作成', icon: '📤' },
  PUT: { color: '#D97706', bg: '#FEF3C7', desc: '全更新', icon: '✏️' },
  PATCH: { color: '#EA580C', bg: '#FFEDD5', desc: '部分更新', icon: '🩹' },
  DELETE: { color: '#DC2626', bg: '#FEE2E2', desc: '削除', icon: '🗑️' },
};

const RANK_THRESHOLDS = [
  { min: 95, rank: 'S', label: 'APIアーキテクト', emoji: '👑', color: '#CA8A04', msg: '設計の一貫性と REST の勘所が抜群です。' },
  { min: 80, rank: 'A', label: 'APIスペシャリスト', emoji: '⭐', color: '#7C3AED', msg: 'リソース指向の考え方がしっかり身についています。' },
  { min: 60, rank: 'B', label: 'APIビルダー', emoji: '🔧', color: '#2563EB', msg: 'あと一歩。ヒントと模範解答で復習すると伸びます。' },
  { min: 40, rank: 'C', label: 'API見習い', emoji: '📘', color: '#64748B', msg: 'GET/POST とパスの階層から慣れていきましょう。' },
  { min: 0, rank: 'D', label: 'はじめの一歩', emoji: '🌱', color: '#94A3B8', msg: 'メソッドとステータスの対応を表にまとめると早いです。' },
] as const;

function getRank(score: number) {
  return RANK_THRESHOLDS.find((r) => score >= r.min) ?? RANK_THRESHOLDS[RANK_THRESHOLDS.length - 1];
}

function headerSetScore(user: HeaderPart[], correct: HeaderPart[]): number {
  const u = new Set(user);
  const c = new Set(correct);
  if (c.size === 0 && u.size === 0) return 12;
  let inter = 0;
  for (const x of c) {
    if (u.has(x)) inter += 1;
  }
  const union = new Set([...u, ...c]).size;
  return Math.round((inter / union) * 12);
}

function scoreEndpoint(userAnswer: UserAnswer, ep: EndpointDef): number {
  const allAnswers = [ep.answer, ...(ep.altAnswers ?? [])];
  let best = 0;
  for (const ans of allAnswers) {
    let s = 0;
    if (userAnswer.method === ans.method) s += 22;
    if (arraysEqual(userAnswer.path, ans.path)) s += 22;
    else {
      const uPath = userAnswer.path ?? [];
      const aPath = ans.path;
      if (uPath.length > 0) {
        const match = uPath.filter((seg, i) => aPath[i] === seg).length;
        s += Math.round((match / Math.max(aPath.length, 1)) * 15);
      }
    }
    if (userAnswer.status === ans.status) s += 11;
    if (userAnswer.auth === ans.auth) s += 11;
    if (userAnswer.requestBody === ans.requestBody) s += 11;
    if (userAnswer.responseBody === ans.responseBody) s += 11;
    s += headerSetScore(userAnswer.headers, ans.headers);
    best = Math.max(best, s);
  }
  return best;
}

function getDisplayAnswer(userAnswer: UserAnswer, ep: EndpointDef) {
  const allAnswers = [ep.answer, ...(ep.altAnswers ?? [])];
  let best = ep.answer;
  let bestScore = -1;
  for (const ans of allAnswers) {
    const sc = scoreEndpoint(userAnswer, { ...ep, answer: ans, altAnswers: undefined });
    if (sc > bestScore) {
      bestScore = sc;
      best = ans;
    }
  }
  return best;
}

function Decorations() {
  const items = useMemo(
    () =>
      ['⚡', '🔗', '📡', '🧩', '💡', '🚀', '✨', '🎯', '{ }', '</>'].map((e, i) => ({
        emoji: e,
        left: 5 + ((i * 31) % 88),
        delay: i * 1.7,
        dur: 8 + (i % 4) * 2.5,
        size: 16 + (i % 3) * 5,
      })),
    []
  );
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }} aria-hidden>
      {items.map((d, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            bottom: '-30px',
            fontSize: d.size,
            opacity: 0.12,
            animation: `apiWsFloatUp ${d.dur}s ease-in-out ${d.delay}s infinite`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  );
}

function PathBuilder({
  segments,
  selected,
  onChange,
  disabled,
  showHint,
  hint,
  onClear,
}: {
  segments: string[];
  selected: string[];
  onChange: (p: string[]) => void;
  disabled: boolean;
  showHint: boolean;
  hint: string;
  onClear: () => void;
}) {
  const toggleSegment = (seg: string) => {
    if (disabled) return;
    const idx = selected.indexOf(seg);
    if (idx >= 0 && seg !== '{id}') {
      onChange(selected.filter((_, i) => i !== idx));
    } else {
      onChange([...selected, seg]);
    }
  };

  const removeAt = (idx: number) => {
    if (disabled) return;
    onChange(selected.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>エンドポイントパス（タップで組み立て）</span>
        {!disabled && selected.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '3px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            クリア
          </button>
        )}
      </div>
      <div
        style={{
          background: '#0F172A',
          borderRadius: 10,
          padding: '8px 14px',
          fontFamily: "'Fira Code', monospace",
          fontSize: 14,
          color: '#7DD3FC',
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexWrap: 'wrap',
          marginBottom: 8,
          border: '2px solid #334155',
        }}
      >
        <span style={{ color: '#64748B' }}>/</span>
        {selected.length === 0 && (
          <span style={{ color: '#475569', fontStyle: 'italic', fontSize: 12 }}>↓ パーツをタップ</span>
        )}
        {selected.map((seg, i) => (
          <span key={`${seg}-${i}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {i > 0 && <span style={{ color: '#64748B' }}>/</span>}
            <button
              type="button"
              onClick={() => removeAt(i)}
              disabled={disabled}
              style={{
                background: seg === '{id}' ? '#6D28D933' : '#2563EB33',
                color: seg === '{id}' ? '#C4B5FD' : '#93C5FD',
                border: 'none',
                borderRadius: 6,
                padding: '2px 8px',
                fontFamily: "'Fira Code', monospace",
                fontSize: 13,
                cursor: disabled ? 'default' : 'pointer',
                transition: 'all .15s',
              }}
            >
              {seg}
              {!disabled && (
                <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }} aria-hidden>
                  ✕
                </span>
              )}
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {segments.map((seg) => {
          const isUsed = selected.includes(seg) && seg !== '{id}';
          return (
            <button
              type="button"
              key={seg}
              onClick={() => toggleSegment(seg)}
              disabled={disabled}
              style={{
                padding: '5px 12px',
                borderRadius: 18,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Fira Code', monospace",
                border: `2px solid ${seg === '{id}' ? '#A78BFA' : '#60A5FA'}`,
                background: isUsed ? '#E0E7FF' : '#fff',
                color: seg === '{id}' ? '#6D28D9' : '#1D4ED8',
                cursor: disabled ? 'default' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all .15s',
              }}
            >
              {seg === '{id}' ? '{ id }' : seg}
            </button>
          );
        })}
      </div>
      {showHint && selected.length === 0 && (
        <div style={{ fontSize: 11, color: '#D97706', marginTop: 5 }}>💡 {hint}</div>
      )}
    </div>
  );
}

function EndpointCard({
  ep,
  index,
  value,
  onChange,
  submitted,
  showHints,
  challenge,
}: {
  ep: EndpointDef;
  index: number;
  value: UserAnswer;
  onChange: (v: UserAnswer) => void;
  submitted: boolean;
  showHints: boolean;
  challenge: ScenarioChallenge;
}) {
  const score = submitted ? scoreEndpoint(value, ep) : null;
  const modelAns = useMemo(() => getDisplayAnswer(value, ep), [value, ep]);
  const isComplete = Boolean(
    value.method &&
      value.path.length > 0 &&
      value.status &&
      value.auth &&
      value.requestBody &&
      value.responseBody &&
      value.headers.length > 0
  );
  const clearPath = () => onChange({ ...value, path: [] });
  const borderColor =
    submitted && score != null
      ? score >= 80
        ? '#16A34A'
        : score >= 40
          ? '#D97706'
          : '#DC2626'
      : null;

  return (
    <article
      style={{
        background: '#fff',
        borderRadius: 18,
        padding: '18px 20px',
        marginBottom: 14,
        border: borderColor ? `2.5px solid ${borderColor}` : isComplete ? '2px solid #A78BFA' : '2px solid #E5E7EB',
        boxShadow: submitted && score != null && score >= 80 ? '0 4px 20px rgba(22,163,74,0.12)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all .3s',
        animation: 'apiWsFadeUp .4s ease both',
        animationDelay: `${index * 0.06}s`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span
          style={{
            background: 'linear-gradient(135deg, #6366F1, #DB2777)',
            color: '#fff',
            borderRadius: 10,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
          }}
        >
          Q{index + 1}
        </span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1F2937', flex: 1 }}>{ep.description}</span>
        {!submitted && isComplete && (
          <span style={{ fontSize: 16 }} aria-hidden>
            ✅
          </span>
        )}
        {submitted && score !== null && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: score >= 80 ? '#F0FDF4' : score >= 40 ? '#FFFBEB' : '#FEF2F2',
              padding: '3px 10px',
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 14 }} aria-hidden>
              {score >= 80 ? '🎉' : score >= 40 ? '🤔' : '😅'}
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: score >= 80 ? '#15803D' : score >= 40 ? '#B45309' : '#B91C1C',
              }}
            >
              {score}pt
            </span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 5 }}>HTTPメソッド</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {METHODS.map((m) => {
            const meta = METHOD_META[m];
            const active = value.method === m;
            return (
              <button
                type="button"
                key={m}
                onClick={() => !submitted && onChange({ ...value, method: m })}
                disabled={submitted}
                style={{
                  padding: '7px 14px',
                  borderRadius: 22,
                  border: `2px solid ${active ? meta.color : '#E5E7EB'}`,
                  background: active ? meta.color : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: submitted ? 'default' : 'pointer',
                  transition: 'all .2s',
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                  boxShadow: active ? `0 3px 12px ${meta.color}33` : 'none',
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 13 }} aria-hidden>
                  {meta.icon}
                </span>
                {m}
              </button>
            );
          })}
        </div>
        {showHints && !value.method && (
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>💡 {ep.hints.method}</div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <PathBuilder
          segments={challenge.segments}
          selected={value.path}
          onChange={(p) => onChange({ ...value, path: p })}
          disabled={submitted}
          showHint={showHints}
          hint={ep.hints.path}
          onClear={clearPath}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 5 }}>認証の想定</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {AUTH_LEVELS.map((a) => {
            const active = value.auth === a;
            return (
              <button
                type="button"
                key={a}
                onClick={() => !submitted && onChange({ ...value, auth: a })}
                disabled={submitted}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: `2px solid ${active ? '#7C3AED' : '#E5E7EB'}`,
                  background: active ? '#7C3AED' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: submitted ? 'default' : 'pointer',
                  transition: 'all .2s',
                }}
              >
                {AUTH_LABEL[a]}
              </button>
            );
          })}
        </div>
        {showHints && !value.auth && (
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>💡 {ep.hints.auth}</div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 5 }}>
          代表的なヘッダー（該当するものをすべて選択）
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {HEADER_PARTS.map((h) => {
            const active = value.headers.includes(h);
            const meta = HEADER_BTN[h];
            return (
              <button
                type="button"
                key={h}
                onClick={() => !submitted && onChange({ ...value, headers: toggleHeader(value.headers, h) })}
                disabled={submitted}
                style={{
                  padding: '8px 12px',
                  borderRadius: 12,
                  border: `2px solid ${active ? '#0D9488' : '#E5E7EB'}`,
                  background: active ? '#CCFBF1' : '#fff',
                  color: active ? '#0F766E' : '#6B7280',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: submitted ? 'default' : 'pointer',
                  transition: 'all .2s',
                  textAlign: 'left' as const,
                }}
              >
                <span style={{ fontFamily: "'Fira Code', monospace" }}>{meta.title}</span>
                <span style={{ fontSize: 10, fontWeight: 500, color: '#64748B', marginLeft: 8 }}>{meta.sub}</span>
              </button>
            );
          })}
        </div>
        {showHints && value.headers.length === 0 && (
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>💡 {ep.hints.headers}</div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 5 }}>リクエストボディ</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {BODY_PRESENCE.map((b) => {
            const active = value.requestBody === b;
            return (
              <button
                type="button"
                key={`req-${b}`}
                onClick={() => !submitted && onChange({ ...value, requestBody: b })}
                disabled={submitted}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: `2px solid ${active ? '#059669' : '#E5E7EB'}`,
                  background: active ? '#059669' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: submitted ? 'default' : 'pointer',
                  transition: 'all .2s',
                }}
              >
                {BODY_LABEL[b]}
              </button>
            );
          })}
        </div>
        {showHints && !value.requestBody && (
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>💡 {ep.hints.requestBody}</div>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 5 }}>レスポンス本文</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {BODY_PRESENCE.map((b) => {
            const active = value.responseBody === b;
            return (
              <button
                type="button"
                key={`res-${b}`}
                onClick={() => !submitted && onChange({ ...value, responseBody: b })}
                disabled={submitted}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: `2px solid ${active ? '#DB2777' : '#E5E7EB'}`,
                  background: active ? '#DB2777' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: submitted ? 'default' : 'pointer',
                  transition: 'all .2s',
                }}
              >
                {BODY_LABEL[b]}
              </button>
            );
          })}
        </div>
        {showHints && !value.responseBody && (
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>💡 {ep.hints.responseBody}</div>
        )}
      </div>

      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600, marginBottom: 5 }}>ステータスコード</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STATUS_CODES.map((sc) => {
            const active = value.status === sc.code;
            return (
              <button
                type="button"
                key={sc.code}
                onClick={() => !submitted && onChange({ ...value, status: sc.code })}
                disabled={submitted}
                style={{
                  padding: '6px 12px',
                  borderRadius: 16,
                  border: `2px solid ${active ? '#4F46E5' : '#E5E7EB'}`,
                  background: active ? '#4F46E5' : '#fff',
                  color: active ? '#fff' : '#6B7280',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: submitted ? 'default' : 'pointer',
                  transition: 'all .2s',
                  fontFamily: "'M PLUS Rounded 1c', sans-serif",
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 800 }}>{sc.code}</span>
                <span style={{ fontSize: 9, opacity: 0.8, marginTop: 1 }}>{sc.desc}</span>
              </button>
            );
          })}
        </div>
        {showHints && !value.status && (
          <div style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>💡 {ep.hints.status}</div>
        )}
      </div>

      {submitted && score !== null && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
            {score >= 100 ? '✅ 全項目一致' : '📊 あなたの回答と模範の比較'}
          </div>
          <AnswerComparisonBlock
            user={value}
            model={modelAns}
            compact
            showLegend={index === 0}
          />
          {(ep.altAnswers?.length ?? 0) > 0 && (
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 8, lineHeight: 1.5 }}>
              別解として {ep.altAnswers!.length} パターンも採点の対象に含めています（表の模範は、その中であなたの回答に最も近い代表例です）。
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Confetti({ active }: { active: boolean }) {
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => ({
        x: 50 + (Math.random() - 0.5) * 60,
        delay: Math.random() * 0.4,
        dur: 1.2 + Math.random() * 0.8,
        color: ['#CA8A04', '#DB2777', '#7C3AED', '#2563EB', '#059669', '#DC2626'][i % 6],
        size: 4 + Math.random() * 6,
      })),
    []
  );
  if (!active) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 100, overflow: 'hidden' }} aria-hidden>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: '40%',
            width: p.size,
            height: p.size,
            borderRadius: p.size > 7 ? 2 : '50%',
            background: p.color,
            animation: `apiWsConfettiFall ${p.dur}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

type Screen = 'menu' | 'play' | 'result';

export default function ApiDesignWorkshopApp() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, UserAnswer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [completedScores, setCompletedScores] = useState<Record<number, number>>({});
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const [animate, setAnimate] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, [screen]);

  const challenge = CHALLENGES[challengeIdx];

  const initAnswers = useCallback((ch: ScenarioChallenge) => {
    const a: Record<number, UserAnswer> = {};
    ch.endpoints.forEach((_, i) => {
      a[i] = { method: '', path: [], status: '', auth: '', requestBody: '', responseBody: '', headers: [] };
    });
    return a;
  }, []);

  const startChallenge = (idx: number) => {
    setChallengeIdx(idx);
    setAnswers(initAnswers(CHALLENGES[idx]));
    setSubmitted(false);
    setShowHints(false);
    setTotalScore(null);
    setShowConfetti(false);
    setAnimate(false);
    setTimeout(() => {
      setScreen('play');
      setAnimate(true);
    }, 50);
  };

  const handleSubmit = () => {
    let total = 0;
    challenge.endpoints.forEach((ep, i) => {
      total += scoreEndpoint(answers[i] ?? EMPTY_USER_ANSWER, ep);
    });
    const avg = Math.round(total / challenge.endpoints.length);
    setTotalScore(avg);
    setSubmitted(true);
    setCompletedScores((prev) => ({
      ...prev,
      [challenge.id]: Math.max(prev[challenge.id] ?? 0, avg),
    }));
    if (avg >= 80) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    }
  };

  const goResult = () => {
    setAnimate(false);
    setTimeout(() => {
      setScreen('result');
      setAnimate(true);
    }, 50);
  };

  const goMenu = () => {
    setAnimate(false);
    setTimeout(() => {
      setScreen('menu');
      setAnimate(true);
    }, 50);
  };

  const isAnswerComplete = (a: UserAnswer | undefined) =>
    Boolean(
      a?.method &&
        a.path.length > 0 &&
        a.status &&
        a.auth &&
        a.requestBody &&
        a.responseBody &&
        a.headers.length > 0
    );

  const allAnswered = challenge.endpoints.every((_, i) => isAnswerComplete(answers[i]));
  const answeredCount = challenge.endpoints.filter((_, i) => isAnswerComplete(answers[i])).length;
  const rank = totalScore !== null ? getRank(totalScore) : null;

  if (screen === 'menu') {
    const totalBest = Object.values(completedScores);
    const overallAvg =
      totalBest.length > 0 ? Math.round(totalBest.reduce((x, y) => x + y, 0) / totalBest.length) : null;

    return (
      <div style={S.root} className="api-design-workshop-root">
        <Decorations />
        <link
          href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Fira+Code:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{globalCSS}</style>
        <div
          style={{
            ...S.container,
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all .5s ease',
          }}
        >
          <header style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 4, animation: 'apiWsPopIn .6s ease' }} aria-hidden>
              ⚙️
            </div>
            <h1 style={S.title}>API設計ワークショップ</h1>
            <p style={S.subtitle}>
              メソッド・URL・ステータスに加え、認証・ヘッダー・リクエスト／レスポンスの本文まで含めて REST らしく設計しよう
            </p>
          </header>

          {totalBest.length > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 20,
                marginBottom: 20,
                background: '#fff',
                borderRadius: 14,
                padding: '10px 20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#6366F1' }}>
                  {totalBest.length}/{CHALLENGES.length}
                </div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>クリア</div>
              </div>
              <div style={{ width: 1, background: '#E5E7EB' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#CA8A04' }}>{overallAvg}pt</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>平均スコア</div>
              </div>
              <div style={{ width: 1, background: '#E5E7EB' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22 }}>{overallAvg != null ? getRank(overallAvg).emoji : '—'}</div>
                <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600 }}>ランク</div>
              </div>
            </div>
          )}

          <section style={S.howTo}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#5B21B6' }}>🎯 遊び方</div>
            <div style={{ fontSize: 13, lineHeight: 1.9, color: '#4B5563' }}>
              ① シナリオを読み、「誰が使う API か（公開／ログイン）」とリソースの関係を決める
              <br />
              ② <strong>HTTPメソッド</strong> と <strong>パス</strong>のあと、<strong>認証</strong>→<strong>ヘッダー</strong>→<strong>リクエスト本文</strong>→<strong>レスポンス本文</strong>→<strong>ステータス</strong>
              の流れで整理する（例: 204 はレスポンス本文「なし」とセット）
              <br />
              ③ 全項目を埋めたら提出。結果画面のミニノートで HTTP 全体を復習
            </div>
          </section>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CHALLENGES.map((ch, i) => {
              const bestScore = completedScores[ch.id];
              const bestRank = bestScore != null ? getRank(bestScore) : null;
              const diffColor = ch.difficulty === 1 ? '#2563EB' : ch.difficulty === 2 ? '#D97706' : '#DC2626';
              return (
                <button
                  type="button"
                  key={ch.id}
                  onClick={() => startChallenge(i)}
                  style={{
                    ...S.challengeCard,
                    animationDelay: `${i * 0.07}s`,
                    borderLeft: `5px solid ${bestRank ? bestRank.color : diffColor}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 28 }} aria-hidden>
                      {ch.icon}
                    </span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#1F2937', marginBottom: 2 }}>{ch.title}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span>{ch.endpoints.length} 問</span>
                        <span style={{ color: diffColor, fontWeight: 700 }}>
                          {'★'.repeat(ch.difficulty)}
                          {'☆'.repeat(3 - ch.difficulty)}
                        </span>
                      </div>
                    </div>
                    {bestRank ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 20 }} aria-hidden>
                          {bestRank.emoji}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: bestRank.color }}>{bestScore}pt</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 22, color: '#D1D5DB' }} aria-hidden>
                        →
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'play') {
    const progress = answeredCount / challenge.endpoints.length;
    return (
      <div style={S.root} className="api-design-workshop-root">
        <Decorations />
        <Confetti active={showConfetti} />
        <link
          href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Fira+Code:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{globalCSS}</style>
        <div
          style={{
            ...S.container,
            maxWidth: 640,
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all .5s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <button type="button" onClick={goMenu} style={S.backBtn}>
              ← 戻る
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 17, color: '#1F2937', fontFamily: "'Hachi Maru Pop', cursive" }}>
                {challenge.icon} {challenge.title}
              </h2>
            </div>
            {!submitted && (
              <button
                type="button"
                onClick={() => setShowHints((h) => !h)}
                style={{
                  ...S.hintBtn,
                  background: showHints ? '#FEF3C7' : '#fff',
                  borderColor: showHints ? '#D97706' : '#E5E7EB',
                }}
              >
                💡 {showHints ? 'ON' : 'ヒント'}
              </button>
            )}
          </div>

          <div style={{ background: '#E5E7EB', borderRadius: 6, height: 8, marginBottom: 14, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 6,
                background: submitted
                  ? (totalScore ?? 0) >= 80
                    ? 'linear-gradient(90deg,#16A34A,#15803D)'
                    : (totalScore ?? 0) >= 40
                      ? 'linear-gradient(90deg,#FBBF24,#D97706)'
                      : 'linear-gradient(90deg,#F87171,#DC2626)'
                  : 'linear-gradient(90deg, #6366F1, #DB2777)',
                width: submitted ? '100%' : `${progress * 100}%`,
                transition: 'width .4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 8, marginTop: -8 }}>
            {submitted ? `スコア: ${totalScore}pt` : `${answeredCount} / ${challenge.endpoints.length} 完了`}
          </div>

          <section style={S.scenario}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#5B21B6', marginBottom: 4 }}>📋 シナリオ</div>
            <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.8 }}>{challenge.scenario}</div>
          </section>

          {challenge.endpoints.map((ep, i) => (
            <EndpointCard
              key={i}
              ep={ep}
              index={i}
              value={answers[i] ?? EMPTY_USER_ANSWER}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [i]: v }))}
              submitted={submitted}
              showHints={showHints}
              challenge={challenge}
            />
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allAnswered}
                style={{
                  ...S.primaryBtn,
                  opacity: allAnswered ? 1 : 0.5,
                  cursor: allAnswered ? 'pointer' : 'not-allowed',
                }}
              >
                🚀 提出する（{answeredCount}/{challenge.endpoints.length}）
              </button>
            ) : (
              <>
                <button type="button" onClick={goResult} style={S.primaryBtn}>
                  📊 結果を見る
                </button>
                <button type="button" onClick={goMenu} style={S.secondaryBtn}>
                  🏠 メニュー
                </button>
              </>
            )}
          </div>

          {submitted && rank && (
            <div
              style={{
                textAlign: 'center',
                marginTop: 16,
                padding: '12px',
                background: `${rank.color}11`,
                borderRadius: 14,
                border: `2px solid ${rank.color}44`,
                animation: 'apiWsPopIn .5s ease',
              }}
            >
              <span style={{ fontSize: 32 }} aria-hidden>
                {rank.emoji}
              </span>
              <div style={{ fontSize: 20, fontWeight: 900, color: rank.color }}>
                {rank.rank}ランク — {totalScore}pt
              </div>
              <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>{rank.msg}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'result' && totalScore !== null) {
    const r = getRank(totalScore);
    return (
      <div style={S.root} className="api-design-workshop-root">
        <Decorations />
        <Confetti active={showConfetti} />
        <link
          href="https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=M+PLUS+Rounded+1c:wght@400;700;900&family=Fira+Code:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <style>{globalCSS}</style>
        <div
          style={{
            ...S.container,
            textAlign: 'center',
            opacity: animate ? 1 : 0,
            transform: animate ? 'translateY(0)' : 'translateY(20px)',
            transition: 'all .5s ease',
          }}
        >
          <div style={{ fontSize: 64, marginBottom: 6, animation: 'apiWsPopIn .6s ease' }} aria-hidden>
            {r.emoji}
          </div>
          <h1 style={{ ...S.title, fontSize: 30, marginBottom: 2 }}>{r.rank}ランク</h1>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 0 4px' }}>{r.label}</p>
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: '0 0 20px' }}>
            {challenge.icon} {challenge.title}
          </p>

          <div
            style={{
              width: 150,
              height: 150,
              borderRadius: '50%',
              border: `7px solid ${r.color}`,
              margin: '0 auto 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${r.color}11`,
              boxShadow: `0 0 40px ${r.color}22`,
              animation: 'apiWsPopIn .6s ease .2s both',
            }}
          >
            <div style={{ fontSize: 44, fontWeight: 900, color: r.color, lineHeight: 1 }}>{totalScore}</div>
            <div style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>/ 100</div>
          </div>
          <p style={{ fontSize: 14, color: '#64748B', marginBottom: 20 }}>{r.msg}</p>

          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: '#4B5563' }}>
              📝 エンドポイント別スコアと比較
            </div>
            <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.65, margin: '0 0 14px' }}>
              各設問で<strong>左があなたの回答</strong>、<strong>右が採点に使った模範（代表例）</strong>です。左のセルが緑枠ならその項目は一致、赤枠なら模範と異なります。
            </p>
            {challenge.endpoints.map((ep, i) => {
              const row = answers[i] ?? EMPTY_USER_ANSWER;
              const sc = scoreEndpoint(row, ep);
              const display = getDisplayAnswer(row, ep);
              return (
                <div
                  key={i}
                  style={{
                    background: '#F1F5F9',
                    borderRadius: 14,
                    padding: '12px 14px 14px',
                    marginBottom: 12,
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }} aria-hidden>
                      {sc >= 80 ? '🎉' : sc >= 40 ? '🤔' : '😅'}
                    </span>
                    <span style={{ flex: 1, fontSize: 13, color: '#374151', fontWeight: 600 }}>{ep.description}</span>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: sc >= 80 ? '#15803D' : sc >= 40 ? '#B45309' : '#B91C1C',
                      }}
                    >
                      {sc}pt
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: '#E2E8F0', overflow: 'hidden', marginBottom: 10 }}>
                    <div
                      style={{
                        width: `${sc}%`,
                        height: '100%',
                        borderRadius: 3,
                        background: sc >= 80 ? '#16A34A' : sc >= 40 ? '#FBBF24' : '#EF4444',
                        transition: 'width .8s ease',
                      }}
                    />
                  </div>
                  <AnswerComparisonBlock user={row} model={display} showLegend={false} />
                  {(ep.altAnswers?.length ?? 0) > 0 && (
                    <div style={{ fontSize: 10, color: '#64748B', marginTop: 8, lineHeight: 1.5 }}>
                      ※ この設問は別解 {ep.altAnswers!.length} 件も採点対象です。表の模範は、あなたの回答に最も近い代表例です。
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <section style={S.howTo}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#5B21B6', marginBottom: 6 }}>📚 REST と HTTP のつながり</div>
            <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.9, textAlign: 'left' }}>
              • リソースは<strong>名詞の複数形</strong>（/notes /shipments）で表す
              <br />
              • <strong>GET</strong> 取得、<strong>POST</strong> 新規、<strong>PUT/PATCH</strong> 更新、<strong>DELETE</strong>{' '}
              削除
              <br />
              • 子リソースはパスで階層化（/videos/{'{id}'}/comments）
              <br />
              • 作成は <strong>201</strong>、本文なし削除は <strong>204</strong>、その他の成功は多くが <strong>200</strong>（レスポンス本文の有無とセットで覚える）
              <br />
              • <strong>認証</strong>が要るときは <code style={{ fontSize: 11 }}>Authorization</code>、JSON
              本文を送るときは <code style={{ fontSize: 11 }}>Content-Type: application/json</code>、JSON
              を受け取りたいときは <code style={{ fontSize: 11 }}>Accept: application/json</code> を意識する
            </div>
          </section>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => startChallenge(challengeIdx)} style={S.secondaryBtn}>
              🔄 もう一度
            </button>
            {challengeIdx < CHALLENGES.length - 1 && (
              <button type="button" onClick={() => startChallenge(challengeIdx + 1)} style={S.primaryBtn}>
                ▶ 次のシナリオ
              </button>
            )}
            <button type="button" onClick={goMenu} style={S.secondaryBtn}>
              🏠 メニュー
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

const S = {
  root: {
    minHeight: '100vh',
    background: 'linear-gradient(145deg, #FDF4FF 0%, #EEF2FF 35%, #ECFEFF 70%, #F0FDF4 100%)',
    fontFamily: "'M PLUS Rounded 1c', sans-serif",
    position: 'relative' as const,
    padding: '16px 12px 40px',
  },
  container: { maxWidth: 580, margin: '0 auto', position: 'relative' as const, zIndex: 1 },
  title: { fontFamily: "'Hachi Maru Pop', cursive", fontSize: 24, color: '#1F2937', margin: '0 0 4px' },
  subtitle: { fontSize: 14, color: '#64748B', margin: 0 },
  howTo: {
    background: '#F5F3FF',
    borderRadius: 14,
    padding: '14px 18px',
    marginBottom: 18,
    border: '1px solid #DDD6FE',
  },
  scenario: {
    background: '#EDE9FE',
    borderRadius: 14,
    padding: '14px 18px',
    marginBottom: 14,
    border: '1px solid #C4B5FD',
  },
  challengeCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '14px 18px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    transition: 'all .2s',
    fontFamily: "'M PLUS Rounded 1c', sans-serif",
    animation: 'apiWsFadeUp .5s ease both',
  },
  primaryBtn: {
    flex: 1,
    padding: '13px 20px',
    borderRadius: 16,
    border: 'none',
    background: 'linear-gradient(135deg, #6366F1, #DB2777)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'M PLUS Rounded 1c', sans-serif",
    boxShadow: '0 4px 16px rgba(99,102,241,0.28)',
    transition: 'transform .15s',
  },
  secondaryBtn: {
    flex: 1,
    padding: '13px 20px',
    borderRadius: 16,
    border: '2px solid #C4B5FD',
    background: '#fff',
    color: '#5B21B6',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'M PLUS Rounded 1c', sans-serif",
    transition: 'transform .15s',
  },
  backBtn: {
    padding: '6px 14px',
    borderRadius: 10,
    border: '2px solid #E5E7EB',
    background: '#fff',
    color: '#64748B',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'M PLUS Rounded 1c', sans-serif",
  },
  hintBtn: {
    padding: '6px 14px',
    borderRadius: 10,
    border: '2px solid #E5E7EB',
    background: '#fff',
    color: '#B45309',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'M PLUS Rounded 1c', sans-serif",
    transition: 'all .2s',
  },
};

const globalCSS = `
  @keyframes apiWsFloatUp { 0% { transform: translateY(0) rotate(0deg); opacity: 0.12; } 50% { opacity: 0.2; } 100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; } }
  @keyframes apiWsFadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes apiWsPopIn { 0% { transform: scale(0); } 70% { transform: scale(1.12); } 100% { transform: scale(1); } }
  @keyframes apiWsConfettiFall { 0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translateY(60vh) rotate(720deg) scale(0); opacity: 0; } }
  .api-design-workshop-root button:hover:not(:disabled) { transform: translateY(-1px) !important; }
  .api-design-workshop-root button:active:not(:disabled) { transform: scale(0.97) !important; }
  .api-design-workshop-root button:disabled { cursor: not-allowed; }
`;
