import { useEffect, useMemo, useState } from 'react';
import { loadJson } from '../../utils/loadJson';
import { YoutubeEntryPoint } from './youtube-entrypoint';
import type { Rank, YoutubeContent } from './youtubeTypes';

type Layer = '入口' | 'アプリ' | 'ネットワーク' | '計算' | 'データ';

type ScenarioServiceOption = { id: string; label: string };

type CloudArchScenario = {
  layers: Layer[];
  clouds: { id: string; label: string }[];
  questions: { id: string; label: string }[];
  patterns: Array<{
    id: string;
    questionId: string;
    cloudId: string;
    title: string;
    options: ScenarioServiceOption[];
    solution: Record<Layer, string>;
  }>;
};

type LearningContent = {
  patterns: Record<
    string,
    {
      hint: string;
      explanation: string;
    }
  >;
  rankDescriptions: Record<Rank, string>;
};

const LAYERS: Layer[] = ['入口', 'アプリ', 'ネットワーク', '計算', 'データ'];

function getRankByScore(score: number): Rank {
  if (score >= 100) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

export default function CloudArchPuzzleApp() {
  const [scenario, setScenario] = useState<CloudArchScenario | null>(null);
  const [learning, setLearning] = useState<LearningContent | null>(null);
  const [youtube, setYoutube] = useState<YoutubeContent | null>(null);

  const [patternIndex, setPatternIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<Layer, string | null>>({
    入口: null,
    アプリ: null,
    ネットワーク: null,
    計算: null,
    データ: null,
  });
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundResults, setRoundResults] = useState<Array<Record<Layer, boolean>>>([]);

  const [showHint, setShowHint] = useState(false);

  const appContentLoaded = !!scenario && !!learning && !!youtube;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const scenarioUrl = new URL('./content/scenario.json', import.meta.url).href;
      const learningUrl = new URL('./content/learning.json', import.meta.url).href;
      const youtubeUrl = new URL('./content/youtube.json', import.meta.url).href;

      const [s, l, y] = await Promise.all([
        loadJson<CloudArchScenario>(scenarioUrl),
        loadJson<LearningContent>(learningUrl),
        loadJson<YoutubeContent>(youtubeUrl),
      ]);

      if (!cancelled) {
        setScenario(s);
        setLearning(l);
        setYoutube(y);
      }
    }

    load().catch(() => {
      // In case of failure (e.g. offline), keep loading spinner UI.
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const patterns = scenario?.patterns ?? [];
  const currentPattern = patterns[patternIndex];

  useEffect(() => {
    // Reset per-round state when the active pattern changes.
    if (!scenario) return;
    setAssignments({ 入口: null, アプリ: null, ネットワーク: null, 計算: null, データ: null });
    setSelectedServiceId(null);
    setChecked(false);
    setShowHint(false);
  }, [patternIndex, scenario]);

  const usedServiceIds = useMemo(() => {
    const ids = Object.values(assignments).filter((v): v is string => typeof v === 'string');
    return new Set(ids);
  }, [assignments]);

  const allFilled = useMemo(() => {
    return LAYERS.every(layer => assignments[layer] !== null);
  }, [assignments]);

  const scoreState = useMemo(() => {
    if (!roundResults.length) return null;

    const totalCorrectLayers = roundResults.reduce((acc, r) => {
      return (
        acc +
        LAYERS.reduce((layerAcc, layer) => {
          return layerAcc + (r[layer] ? 1 : 0);
        }, 0)
      );
    }, 0);

    const maxCorrectLayers = LAYERS.length * patterns.length; // 5 * 9
    const score = Math.round((totalCorrectLayers * 110) / maxCorrectLayers);
    const rank = getRankByScore(score);

    const layerScores = LAYERS.map(layer => {
      const correctCount = roundResults.reduce((acc, r) => acc + (r[layer] ? 1 : 0), 0);
      const maxPerLayer = patterns.length; // each layer appears once per pattern
      const layerScore = Math.round((correctCount * 22) / maxPerLayer);
      return { layer, correctCount, layerScore };
    });

    return { totalCorrectLayers, score, rank, layerScores };
  }, [roundResults, patterns.length]);

  function handleAssignToLayer(layer: Layer, serviceId: string) {
    if (!scenario) return;
    setAssignments(prev => {
      const next: Record<Layer, string | null> = { ...prev };
      // Remove serviceId from wherever it currently is.
      for (const l of LAYERS) {
        if (next[l] === serviceId && l !== layer) {
          next[l] = null;
        }
      }
      next[layer] = serviceId;
      return next;
    });
    setSelectedServiceId(null);
  }

  function handleDrop(layer: Layer, serviceId: string) {
    handleAssignToLayer(layer, serviceId);
  }

  const isResult = patternIndex >= patterns.length && appContentLoaded;

  const resultRank = scoreState?.rank;

  if (!appContentLoaded) {
    return (
      <div className="space-y-4">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    );
  }

  if (isResult && scoreState && learning && youtube && currentPattern === undefined) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">クラウドアーキテクチャパズル（Phase1 完成デモ）</h2>
          <p className="text-gray-600 mt-1">全9パターンを解きました。結果を確認してください。</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm text-gray-500">110点満点</div>
              <div className="text-4xl font-display font-bold text-gray-900">{scoreState.score}</div>
              <div className="text-lg font-bold mt-1">
                ランク：<span className="text-pink-600">{scoreState.rank}</span>
              </div>
            </div>
            <div className="text-sm text-gray-600 max-w-xl">
              {learning.rankDescriptions[scoreState.rank]}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600 mb-2">層別スコア</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scoreState.layerScores.map(ls => (
                <div key={ls.layer} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="text-sm font-bold text-gray-800">{ls.layer}</div>
                  <div className="text-sm text-gray-600">
                    {ls.correctCount}/{patterns.length} correct
                  </div>
                  <div className="text-lg font-display font-bold text-gray-900">{ls.layerScore}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="font-bold text-gray-800 mb-2">パターン別結果</div>
            <div className="space-y-2">
              {roundResults.map((r, idx) => {
                const p = patterns[idx];
                const correct = LAYERS.reduce((acc, layer) => acc + (r[layer] ? 1 : 0), 0);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">{p.title}（{p.id}）</div>
                    <div className="text-sm font-bold text-gray-900">
                      {correct}/{LAYERS.length}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {resultRank && youtube ? (
            <YoutubeEntryPoint content={youtube} rank={resultRank} />
          ) : null}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => {
              setPatternIndex(0);
              setAssignments({ 入口: null, アプリ: null, ネットワーク: null, 計算: null, データ: null });
              setSelectedServiceId(null);
              setChecked(false);
              setRoundResults([]);
            }}
            className="px-6 py-3 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
          >
            最初からやり直す
          </button>
        </div>
      </div>
    );
  }

  const cloudLabel = currentPattern
    ? scenario.clouds.find(c => c.id === currentPattern.cloudId)?.label ?? currentPattern.cloudId
    : '';

  const currentHint = currentPattern ? learning.patterns[currentPattern.id]?.hint : null;
  const currentExplanation = currentPattern ? learning.patterns[currentPattern.id]?.explanation : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">クラウドアーキテクチャパズル（Phase1 完成デモ）</h2>
        <p className="text-gray-600 mt-1">
          AWS/Azure/GCPのサービスを5つの層に配置して構成図を完成させよう（全9パターン）。
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-sm text-gray-500">進行状況</div>
            <div className="text-lg font-bold text-gray-900">
              {patternIndex + 1}/{patterns.length}：{cloudLabel} / {currentPattern?.title ?? ''}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setShowHint(v => !v)}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors text-sm"
            >
              {showHint ? 'ヒントを閉じる' : 'ヒントを見る'}
            </button>

            {showHint ? (
              <div className="text-sm text-gray-600 max-w-xl">
                {currentHint ?? 'ヒントはありません。'}
                {currentExplanation ? <div className="mt-1 text-gray-500">解説：{currentExplanation}</div> : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="font-bold text-gray-800">サービスを層に配置</div>
              <div className="text-sm text-gray-600">
                ドラッグ & ドロップ または クリックで配置
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYERS.map(layer => {
                const placedId = assignments[layer];
                const placed = currentPattern?.options.find(o => o.id === placedId);
                const correctId = currentPattern?.solution[layer];
                const isLayerCorrect = checked ? placedId === correctId : null;

                return (
                  <div
                    key={layer}
                    className={[
                      'rounded-2xl border p-3 min-h-[86px] flex flex-col justify-between',
                      checked
                        ? isLayerCorrect
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-pink-200 bg-pink-50'
                        : selectedServiceId
                          ? 'border-pink-300'
                          : 'border-gray-200 bg-white',
                    ].join(' ')}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const serviceId = e.dataTransfer.getData('text/plain');
                      if (serviceId) handleDrop(layer, serviceId);
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-gray-800 text-sm">{layer}</div>
                      {placedId ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (checked) return;
                            setAssignments(prev => ({ ...prev, [layer]: null }));
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          クリア
                        </button>
                      ) : null}
                    </div>

                    <div
                      className="mt-2 text-sm font-mono text-gray-800 flex items-center justify-between gap-2"
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (checked) return;
                        if (!selectedServiceId) return;
                        handleAssignToLayer(layer, selectedServiceId);
                      }}
                    >
                      {placed ? (
                        <span>
                          {placed.label}
                          {checked && correctId !== placedId ? <span className="text-pink-500">（違い）</span> : null}
                        </span>
                      ) : (
                        <span className="text-gray-400">ここに配置</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {checked ? (
              <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="font-bold text-gray-800 mb-2">このパターンの判定</div>
                <div className="text-sm text-gray-600">
                  正解数：{LAYERS.reduce((acc, layer) => acc + (assignments[layer] === currentPattern.solution[layer] ? 1 : 0), 0)}/5
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="font-bold text-gray-800">候補サービス</div>
              <div className="text-sm text-gray-600">
                未配置：{LAYERS.filter(l => !assignments[l]).length}/5
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentPattern.options.map(opt => {
                // If placed, still allow dragging but it will move it.
                const isDisabled = checked;

                const isSelected = selectedServiceId === opt.id;

                return (
                  <div
                    key={opt.id}
                    draggable={!checked}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', opt.id);
                      setSelectedServiceId(opt.id);
                    }}
                    onClick={() => {
                      if (checked) return;
                      setSelectedServiceId(prev => (prev === opt.id ? null : opt.id));
                    }}
                    className={[
                      'px-3 py-2 rounded-xl border text-sm font-bold cursor-pointer select-none transition-colors',
                      isDisabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : '',
                      isSelected ? 'border-pink-300 bg-pink-50' : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50',
                    ].join(' ')}
                    title={opt.id}
                  >
                    {opt.label}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">
                {checked ? '判定済み：次へ進めます' : allFilled ? '全層を埋めると判定できます' : '未配置の層があります'}
              </div>

              <div className="flex gap-2">
                {!checked ? (
                  <button
                    type="button"
                    disabled={!allFilled}
                    onClick={() => {
                      if (!currentPattern) return;
                      if (!allFilled) return;
                      const correct: Record<Layer, boolean> = LAYERS.reduce((acc, layer) => {
                        acc[layer] = assignments[layer] === currentPattern.solution[layer];
                        return acc;
                      }, {} as Record<Layer, boolean>);

                      setRoundResults(prev => {
                        const next = [...prev];
                        next[patternIndex] = correct;
                        return next;
                      });
                      setChecked(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:shadow transition-shadow"
                  >
                    判定する
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (patternIndex >= patterns.length - 1) {
                        setPatternIndex(patterns.length);
                        return;
                      }
                      setPatternIndex(i => i + 1);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                  >
                    {patternIndex >= patterns.length - 1 ? '結果へ' : '次のパターンへ'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (checked) return;
                    setAssignments({ 入口: null, アプリ: null, ネットワーク: null, 計算: null, データ: null });
                    setSelectedServiceId(null);
                  }}
                  disabled={checked}
                  className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  リセット
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="font-bold text-gray-800 mb-2">進捗スナップショット</div>
            {roundResults.length ? (
              <div className="space-y-2">
                {scoreState ? (
                  <>
                    <div className="text-sm text-gray-600">暫定スコア：{scoreState.score}/110</div>
                    <div className="text-sm text-gray-600">暫定ランク：{scoreState.rank}</div>
                  </>
                ) : (
                  <div className="text-sm text-gray-600">判定待ちです。</div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">まずは「判定する」を押してください。</div>
            )}
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-4">
            <div className="font-bold text-gray-800 mb-2">配点（仕様）</div>
            <div className="text-sm text-gray-600 space-y-2">
              <div>・110点満点（9パターン×5層の正解数を換算）</div>
              <div>・S〜Dランク判定（暫定ではなく最終結果で確定）</div>
              <div>・層別スコア（入口/アプリ/ネットワーク/計算/データ）</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

