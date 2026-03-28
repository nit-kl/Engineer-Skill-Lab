import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Play, Trash2 } from 'lucide-react';
import { CATEGORY_COLORS } from '../../types';
import { CHALLENGES, type Challenge } from './challenges';
import { ALL_DBS, CHAPTERS, type ChapterId } from './dojoData';
import { executeSQL, type Row } from './sqlEngine';

function getRank(score: number) {
  if (score >= 90) return { rank: 'S', color: '#FF6B9D', bg: '#FFF0F5', emoji: '🏆' };
  if (score >= 70) return { rank: 'A', color: '#F9A825', bg: '#FFF8E1', emoji: '🌟' };
  if (score >= 50) return { rank: 'B', color: '#43A047', bg: '#E8F5E9', emoji: '👍' };
  if (score >= 30) return { rank: 'C', color: '#0078D4', bg: '#E3F2FD', emoji: '💪' };
  return { rank: 'D', color: '#9E9E9E', bg: '#F5F5F5', emoji: '📝' };
}

function diffStars(d: number) {
  return ['', '⭐', '⭐⭐', '⭐⭐⭐'][d] ?? '';
}

function TableViewer({ name, data }: { name: string; data: Row[] }) {
  const [collapsed, setCollapsed] = useState(data.length > 6);
  if (!data?.length) return null;
  const cols = Object.keys(data[0]);
  const display = collapsed ? data.slice(0, 5) : data;
  const accent = CATEGORY_COLORS['データベース'];
  return (
    <div className="mb-2">
      <div
        className="mb-0.5 text-[11px] font-bold"
        style={{ color: accent }}
      >
        📋 {name} ({data.length}行)
      </div>
      <div className="overflow-x-auto rounded-lg border-2 border-pink-100">
        <table className="w-full border-collapse text-[11px] text-gray-800">
          <thead>
            <tr className="bg-gradient-to-br from-pink-50 to-sky-50">
              {cols.map((c) => (
                <th
                  key={c}
                  className="whitespace-nowrap border-b-2 border-pink-100 px-2 py-1.5 text-left font-bold text-violet-950"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-rose-50/40' : 'bg-pink-50/30'}>
                {cols.map((c) => (
                  <td key={c} className="whitespace-nowrap border-b border-pink-100/80 px-2 py-1">
                    {row[c] === null ? (
                      <span className="italic text-gray-400">NULL</span>
                    ) : (
                      String(row[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 5 && (
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="mt-0.5 cursor-pointer border-0 bg-transparent text-[10px] font-medium text-pink-500 hover:text-pink-600"
        >
          {collapsed ? `▼ 全${data.length}行表示` : '▲ 折りたたむ'}
        </button>
      )}
    </div>
  );
}

function ResultTable({ data, isCorrect }: { data: Row[]; isCorrect: boolean | null }) {
  if (!data?.length) {
    return <div className="p-2 text-[11px] text-gray-400">結果なし</div>;
  }
  const cols = Object.keys(data[0]);
  const border =
    isCorrect === true ? 'border-green-400' : isCorrect === false ? 'border-red-300' : 'border-gray-200';
  const headBg =
    isCorrect === true ? 'bg-green-50' : isCorrect === false ? 'bg-red-50' : 'bg-gray-50';
  return (
    <div className={`overflow-x-auto rounded-lg border-2 ${border}`}>
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className={headBg}>
            {cols.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-2 py-1.5 text-left font-bold text-violet-950"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/80'}>
              {cols.map((c) => (
                <td key={c} className="whitespace-nowrap border-b border-gray-100 px-2 py-1">
                  {row[c] === null ? (
                    <span className="italic text-gray-400">NULL</span>
                  ) : typeof row[c] === 'number' ? (
                    Number.isInteger(row[c]) ? (
                      row[c]
                    ) : (
                      Number(row[c]).toFixed(1)
                    )
                  ) : (
                    String(row[c])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SqlDojoApp() {
  const [idx, setIdx] = useState(0);
  const [sql, setSQL] = useState('');
  const [result, setResult] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [activeCh, setActiveCh] = useState<ChapterId | null>(null);
  const [sideOpen, setSideOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth > 800 : true
  );
  const taRef = useRef<HTMLTextAreaElement>(null);

  const ch: Challenge = CHALLENGES[idx];
  const chap = CHAPTERS.find((c) => c.id === ch.chapter);
  const totalScore = useMemo(() => {
    const vals = Object.values(scores) as number[];
    return vals.length
      ? Math.round(vals.reduce<number>((a, b) => a + b, 0) / CHALLENGES.length)
      : 0;
  }, [scores]);
  const cleared = Object.keys(scores).length;

  useEffect(() => {
    setSQL('');
    setResult(null);
    setError(null);
    setIsCorrect(null);
    setShowHint(false);
    setShowAnswer(false);
    setAttempts(0);
    taRef.current?.focus();
  }, [idx]);

  const handleExec = useCallback(() => {
    if (!sql.trim()) return;
    setError(null);
    setResult(null);
    setIsCorrect(null);
    setShowAnswer(false);
    try {
      const res = executeSQL(sql, ALL_DBS);
      setResult(res);
      const ok = ch.validate(res);
      setIsCorrect(ok);
      setAttempts((a) => a + 1);
      if (ok) {
        const sc = Math.max(100 - (showHint ? 20 : 0) - Math.min(attempts * 10, 40), 20);
        setScores((prev) => {
          const next = { ...prev, [ch.id]: Math.max(prev[ch.id] ?? 0, sc) };
          if (Object.keys(next).length === CHALLENGES.length) {
            setTimeout(() => setShowComplete(true), 1200);
          }
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [sql, ch, showHint, attempts]);

  const handleKey = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExec();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const t = e.currentTarget;
        const s = t.selectionStart;
        const end = t.selectionEnd;
        setSQL((v) => v.substring(0, s) + '  ' + v.substring(end));
        setTimeout(() => {
          t.selectionStart = t.selectionEnd = s + 2;
        }, 0);
      }
    },
    [handleExec]
  );

  const filtered = activeCh ? CHALLENGES.filter((c) => c.chapter === activeCh) : CHALLENGES;
  const dbAccent = CATEGORY_COLORS['データベース'];

  if (showComplete) {
    const ri = getRank(totalScore);
    return (
      <div
        className="flex min-h-[calc(100vh-5rem)] items-center justify-center bg-gradient-to-br from-pink-100 via-sky-100 via-30% to-emerald-100 p-6 font-sans"
      >
        <div className="max-w-lg rounded-3xl border border-pink-100 bg-white/95 p-10 text-center shadow-2xl shadow-pink-200/40">
          <div className="mb-3 text-5xl">{ri.emoji}</div>
          <div className="mb-2 text-2xl font-bold text-violet-950">
            全{CHALLENGES.length}問クリア！
          </div>
          <div
            className="mb-2 bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-6xl font-black text-transparent"
            style={{ WebkitBackgroundClip: 'text' }}
          >
            {ri.rank}ランク
          </div>
          <p className="mb-6 text-gray-500">総合スコア: {totalScore}点</p>
          <div className="mb-6 flex flex-wrap justify-center gap-1">
            {CHALLENGES.map((c) => {
              const s = scores[c.id] ?? 0;
              const r = getRank(s);
              return (
                <div
                  key={c.id}
                  className="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: r.bg, color: r.color }}
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
            className="rounded-2xl bg-gradient-to-r from-pink-500 to-amber-400 px-8 py-3 text-[15px] font-bold text-white shadow-lg transition hover:brightness-105"
          >
            🔄 もう一度挑戦
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-pink-50 via-sky-50 to-amber-50 font-sans">
      <header
        className="sticky top-0 z-50 flex flex-wrap items-center gap-2 border-b-2 border-pink-100 bg-white/90 px-3 py-2 backdrop-blur-md"
      >
        <span className="text-2xl">🗄️</span>
        <div className="min-w-[80px]">
          <div className="text-base font-bold" style={{ color: dbAccent }}>
            SQL道場
          </div>
          <div className="text-[9px] text-gray-400">全{CHALLENGES.length}問のSQL特訓</div>
        </div>
        <div className="flex flex-1 flex-wrap justify-center gap-1">
          <button
            type="button"
            onClick={() => setActiveCh(null)}
            className={`rounded-full border-2 px-2.5 py-1 text-[10px] font-bold transition ${
              !activeCh
                ? 'border-pink-400 bg-rose-50 text-pink-600'
                : 'border-gray-200 bg-white text-gray-500'
            }`}
          >
            全て
          </button>
          {CHAPTERS.map((c) => {
            const active = activeCh === c.id;
            const done = CHALLENGES.filter((x) => x.chapter === c.id).filter((x) => scores[x.id]).length;
            const tot = CHALLENGES.filter((x) => x.chapter === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCh(c.id)}
                className="whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-[10px] font-bold transition"
                style={
                  active
                    ? { borderColor: c.color, background: `${c.color}18`, color: c.color }
                    : { borderColor: '#e5e5e5', background: '#fff', color: '#888' }
                }
              >
                {c.emoji} {c.title}{' '}
                <span className="opacity-70">
                  {done}/{tot}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">
            {cleared}/{CHALLENGES.length}
          </span>
          <span className="rounded-2xl bg-gradient-to-r from-pink-500 to-amber-400 px-2.5 py-0.5 text-[11px] font-bold text-white">
            {totalScore}点
          </span>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-2 p-2 md:gap-3 md:p-3">
        <aside className="shrink-0 transition-[width] duration-200">
          <div className={sideOpen ? 'w-[180px]' : 'w-9'}>
            <button
              type="button"
              onClick={() => setSideOpen(!sideOpen)}
              className="mb-1.5 w-full rounded-lg border-0 bg-white/90 py-1 text-xs text-gray-500 shadow-sm"
            >
              {sideOpen ? '◀' : '▶'}
            </button>
            {sideOpen && (
              <div className="max-h-[calc(100vh-120px)] overflow-y-auto rounded-2xl bg-white/90 p-2 shadow-md shadow-pink-100/50">
                {filtered.map((c) => {
                  const s = scores[c.id];
                  const r = s != null ? getRank(s) : null;
                  const active = CHALLENGES.indexOf(c) === idx;
                  const cp = CHAPTERS.find((x) => x.id === c.chapter);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setIdx(CHALLENGES.indexOf(c))}
                      className={`mb-0.5 flex w-full items-center gap-1 rounded-lg border-2 py-1.5 pl-1.5 text-left text-[10px] transition ${
                        active
                          ? 'border-pink-400 bg-gradient-to-r from-pink-50 to-sky-50'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-black text-white"
                        style={{
                          background: r
                            ? `linear-gradient(135deg, ${r.color}, #FFB347)`
                            : active
                              ? cp?.color || dbAccent
                              : '#e0e0e0',
                        }}
                      >
                        {r ? r.rank : c.id}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="truncate font-bold text-violet-950">{c.title}</div>
                        <div className="text-[8px] text-gray-300">{diffStars(c.difficulty)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-3">
          <section
            className="rounded-2xl border border-pink-100/80 bg-white/90 p-4 shadow-md shadow-pink-100/30"
            style={{ borderTopWidth: 4, borderTopColor: chap?.color ?? dbAccent }}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-2.5 py-0.5 text-[10px] font-bold text-white"
              >
                {chap?.emoji} Q{ch.id}
              </span>
              <span className="text-base font-bold text-violet-950">{ch.title}</span>
              <span className="ml-auto text-[10px] text-gray-400">{diffStars(ch.difficulty)}</span>
            </div>
            <p className="mb-3 rounded-lg border border-pink-100 bg-rose-50/50 px-3 py-2 text-xs leading-relaxed text-gray-700">
              {ch.description}
            </p>
            <div className="flex flex-wrap gap-2">
              {ch.tables.map((t) => (
                <div key={t} className="min-w-[200px] flex-1">
                  <TableViewer name={t} data={ALL_DBS[t] ?? []} />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-pink-100/80 bg-white/90 p-4 shadow-md shadow-pink-100/30">
            <div className="mb-1 text-[11px] font-bold text-violet-950">✏️ SQLを入力</div>
            <textarea
              ref={taRef}
              value={sql}
              onChange={(e) => setSQL(e.target.value)}
              onKeyDown={handleKey}
              placeholder="SELECT ... FROM ..."
              spellCheck={false}
              className="w-full min-h-[80px] resize-y rounded-xl border-2 border-pink-100 bg-rose-50/30 px-3 py-2.5 font-mono text-xs leading-relaxed text-gray-900 outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-200/50"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExec}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-pink-400 px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-300/40 active:scale-[0.98]"
              >
                <Play className="h-4 w-4 fill-current" />
                実行 <span className="text-[9px] opacity-80">(Ctrl+Enter)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                className={`rounded-xl border-2 px-3 py-2 text-[11px] font-semibold ${
                  showHint
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                💡 ヒント
              </button>
              <button
                type="button"
                onClick={() => setShowAnswer(!showAnswer)}
                className={`rounded-xl border-2 px-3 py-2 text-[11px] font-semibold ${
                  showAnswer
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                📝 模範解答
              </button>
              <button
                type="button"
                onClick={() => {
                  setSQL('');
                  setResult(null);
                  setError(null);
                  setIsCorrect(null);
                }}
                className="rounded-xl border-2 border-gray-200 bg-gray-50 px-2 py-2 text-gray-500"
                aria-label="クリア"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {showHint && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                💡 {ch.hint}
              </div>
            )}
            {showAnswer && (
              <div className="mt-2 whitespace-pre-wrap break-all rounded-lg border border-green-200 bg-green-50 px-3 py-2 font-mono text-[11px] text-green-900">
                {ch.answer}
              </div>
            )}
          </section>

          {(result || error) && (
            <section
              className="rounded-2xl border border-pink-100/80 bg-white/90 p-4 shadow-md shadow-pink-100/30"
              style={{
                borderTopWidth: 4,
                borderTopColor:
                  isCorrect === true ? '#81C784' : error ? '#EF9A9A' : '#E0E0E0',
              }}
            >
              {error ? (
                <div className="rounded-lg bg-red-50 px-2 py-3 font-mono text-xs text-red-600">
                  ❌ {error}
                </div>
              ) : (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-xl">{isCorrect ? '🎉' : '🤔'}</span>
                    <span
                      className={`font-bold ${isCorrect ? 'text-green-700' : 'text-red-600'}`}
                    >
                      {isCorrect ? '正解！' : '不正解… もう一度！'}
                    </span>
                    {isCorrect && scores[ch.id] != null && (
                      <span className="ml-auto rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-2.5 py-0.5 text-xs font-black text-white">
                        {getRank(scores[ch.id]).rank} ({scores[ch.id]}点)
                      </span>
                    )}
                  </div>
                  <div className="mb-1 text-[11px] font-semibold text-gray-500">
                    結果 ({result!.length}行):
                  </div>
                  <ResultTable data={result!} isCorrect={isCorrect} />
                  {isCorrect && idx < CHALLENGES.length - 1 && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const ni = activeCh
                            ? CHALLENGES.findIndex((c, i) => i > idx && c.chapter === activeCh)
                            : idx + 1;
                          setIdx(ni >= 0 ? ni : idx + 1);
                        }}
                        className="rounded-xl bg-gradient-to-r from-green-500 to-green-400 px-6 py-2.5 text-sm font-bold text-white shadow-md active:scale-[0.98]"
                      >
                        次の問題へ ➡️
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
