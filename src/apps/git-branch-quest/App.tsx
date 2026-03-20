import { useEffect, useMemo, useState } from 'react';
import { loadJson } from '../../utils/loadJson';
import YoutubeEntryPoint from './youtube-entrypoint';

type StepId = 'create' | 'merge' | 'conflict' | 'cherry-pick' | 'gitflow' | 'rebase' | 'done';

type Scenario = {
  steps: Array<{
    id: Exclude<StepId, 'done'>;
    title: string;
    description: string;
    correctAction: string;
  }>;
};

type Learning = {
  commonHint: string;
  steps: Record<string, { hint: string }>;
  result: { title: string; description: string };
};

type Youtube = {
  default?: {
    videoId: string;
    url?: string;
    chapters?: Array<{ start: string; title: string }>;
  };
};

type BranchFlags = {
  createdFeature: boolean;
  mergedFeature: boolean;
  conflictResolved: boolean;
  cherryPicked: boolean;
  gitflowApplied: boolean;
  rebased: boolean;
};

export default function GitBranchQuestApp() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [learning, setLearning] = useState<Learning | null>(null);
  const [youtube, setYoutube] = useState<Youtube | null>(null);

  const [step, setStep] = useState<StepId>('create');
  const [message, setMessage] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  const [flags, setFlags] = useState<BranchFlags>({
    createdFeature: false,
    mergedFeature: false,
    conflictResolved: false,
    cherryPicked: false,
    gitflowApplied: false,
    rebased: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const scenarioUrl = new URL('./content/scenario.json', import.meta.url).href;
      const learningUrl = new URL('./content/learning.json', import.meta.url).href;
      const youtubeUrl = new URL('./content/youtube.json', import.meta.url).href;

      const [s, l, y] = await Promise.all([
        loadJson<Scenario>(scenarioUrl),
        loadJson<Learning>(learningUrl),
        loadJson<Youtube>(youtubeUrl),
      ]);

      if (!cancelled) {
        setScenario(s);
        setLearning(l);
        setYoutube(y);
      }
    }
    load().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const currentStepMeta = useMemo(() => {
    if (!scenario) return null;
    if (step === 'done') return null;
    return scenario.steps.find(s => s.id === step) ?? null;
  }, [scenario, step]);

  const isDone = step === 'done';

  function addLog(text: string) {
    setLog(prev => [text, ...prev].slice(0, 8));
  }

  function wrong(text: string) {
    setMessage(text);
  }

  function advance(next: StepId) {
    setStep(next);
    setMessage('');
  }

  function reset() {
    setStep('create');
    setMessage('');
    setLog([]);
    setFlags({
      createdFeature: false,
      mergedFeature: false,
      conflictResolved: false,
      cherryPicked: false,
      gitflowApplied: false,
      rebased: false,
    });
  }

  const nodeMain = { id: 'main', label: 'main', x: 40, y: 140 };
  const nodeFeature = { id: 'feature', label: 'feature', x: 260, y: 40 };
  const nodeHotfix = { id: 'hotfix', label: 'hotfix', x: 260, y: 240 };
  const nodeRelease = { id: 'release', label: 'release', x: 520, y: 140 };
  const nodeRebased = { id: 'feature-rebased', label: 'feature(rebased)', x: 740, y: 140 };

  function renderEdge(from: { x: number; y: number }, to: { x: number; y: number }, label?: string) {
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    return (
      <g>
        <path d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`} fill="none" stroke="#6b7280" strokeWidth={2} />
        {label ? (
          <text x={midX} y={midY - 10} fontSize="12" fill="#374151" textAnchor="middle">
            {label}
          </text>
        ) : null}
      </g>
    );
  }

  if (!scenario || !learning || !youtube) {
    return <div className="text-gray-600">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Gitブランチクエスト（Phase1 完成デモ）</h2>
        <p className="text-gray-600 mt-1">{learning.commonHint}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            {!isDone && currentStepMeta ? (
              <>
                <div className="text-sm text-gray-500 mb-2">現在のステップ</div>
                <div className="text-lg font-bold text-gray-800">{currentStepMeta.title}</div>
                <div className="text-gray-600 mt-1">{currentStepMeta.description}</div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm text-gray-600">
                    ヒント：{learning.steps[step]?.hint ?? '—'}
                  </div>
                  {message ? (
                    <div className="text-sm text-pink-800 bg-pink-50 border border-pink-200 rounded-xl px-3 py-2">
                      {message}
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {step === 'create' && (
                    <>
                      <button
                        onClick={() => {
                          addLog('feature ブランチを作成');
                          setFlags(prev => ({ ...prev, createdFeature: true }));
                          advance('merge');
                        }}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                      >
                        `git checkout -b feature`
                      </button>
                      <button
                        onClick={() => wrong('まずは分離！mainに直叩きはリスクが高いです。')}
                        className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                      >
                        mainで直接編集
                      </button>
                    </>
                  )}

                  {step === 'merge' && (
                    <>
                      <button
                        onClick={() => {
                          addLog('feature を main にマージ');
                          setFlags(prev => ({ ...prev, mergedFeature: true }));
                          advance('conflict');
                        }}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                      >
                        `git merge feature`
                      </button>
                      <button
                        onClick={() => wrong('統合がまだです。まずはマージしましょう。')}
                        className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                      >
                        マージせず終了
                      </button>
                    </>
                  )}

                  {step === 'conflict' && (
                    <>
                      <button
                        onClick={() => {
                          addLog('コンフリクト解決（ours）');
                          setFlags(prev => ({ ...prev, conflictResolved: true }));
                          advance('cherry-pick');
                        }}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                      >
                        ours を採用
                      </button>
                      <button
                        onClick={() => wrong('今回は ours が正解です（デモ）。')}
                        className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                      >
                        theirs を採用
                      </button>
                    </>
                  )}

                  {step === 'cherry-pick' && (
                    <>
                      <button
                        onClick={() => {
                          addLog('cherry-pick を実行');
                          setFlags(prev => ({ ...prev, cherryPicked: true }));
                          advance('gitflow');
                        }}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                      >
                        git cherry-pick &lt;commit&gt;
                      </button>
                      <button
                        onClick={() => wrong('cherry-pickは「必要なものだけ」を取り込む手段です。')}
                        className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                      >
                        merge で全部取り込む
                      </button>
                    </>
                  )}

                  {step === 'gitflow' && (
                    <>
                      <button
                        onClick={() => {
                          addLog('Git Flow（feature→release→main）を適用');
                          setFlags(prev => ({ ...prev, gitflowApplied: true }));
                          advance('rebase');
                        }}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                      >
                        Git Flow を適用
                      </button>
                      <button
                        onClick={() => wrong('releaseへまとめてからmainへ統合しましょう。')}
                        className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                      >
                        mainへ直結
                      </button>
                    </>
                  )}

                  {step === 'rebase' && (
                    <>
                      <button
                        onClick={() => {
                          addLog('rebase で履歴を整え統合');
                          setFlags(prev => ({ ...prev, rebased: true }));
                          advance('done');
                        }}
                        className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
                      >
                        `git rebase main`
                      </button>
                      <button
                        onClick={() => wrong('rebaseで履歴を整えるとレビューが楽になります。')}
                        className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
                      >
                        マージで解決
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-800">{learning.result.title}</div>
                <div className="text-gray-600 mt-1">{learning.result.description}</div>

                <div className="mt-4">
                  <YoutubeEntryPoint content={youtube} />
                </div>

                <div className="mt-4">
                  <button
                    onClick={reset}
                    className="px-6 py-3 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
                  >
                    やり直す
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="font-bold text-gray-800 mb-2">行動ログ</div>
            {log.length === 0 ? (
              <div className="text-sm text-gray-600">まだ何も実行していません。</div>
            ) : (
              <div className="space-y-2">
                {log.map((l, idx) => (
                  <div key={idx} className="text-sm text-gray-800">
                    ・{l}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="font-bold text-gray-800 mb-2">ブランチツリー（リアルタイム表示）</div>
            <div className="text-sm text-gray-600 mb-3">
              現在の操作に応じてツリーが更新されます。
            </div>
            <div className="w-full overflow-x-auto">
              <svg width={820} height={300} className="w-full">
                {/* Nodes */}
                {flags.createdFeature ? (
                  <g>
                    <rect x={nodeFeature.x - 70} y={nodeFeature.y - 18} width={140} height={36} rx={12} fill="#fff7ed" stroke="#fb7185" />
                    <text x={nodeFeature.x} y={nodeFeature.y + 5} fontSize="14" fill="#9f1239" textAnchor="middle" fontWeight="bold">
                      {nodeFeature.label}
                    </text>
                  </g>
                ) : null}

                {flags.cherryPicked ? (
                  <g>
                    <rect x={nodeHotfix.x - 70} y={nodeHotfix.y - 18} width={140} height={36} rx={12} fill="#ecfeff" stroke="#22c55e" />
                    <text x={nodeHotfix.x} y={nodeHotfix.y + 5} fontSize="14" fill="#166534" textAnchor="middle" fontWeight="bold">
                      {nodeHotfix.label}
                    </text>
                  </g>
                ) : null}

                {flags.gitflowApplied ? (
                  <g>
                    <rect x={nodeRelease.x - 70} y={nodeRelease.y - 18} width={140} height={36} rx={12} fill="#f5f3ff" stroke="#a78bfa" />
                    <text x={nodeRelease.x} y={nodeRelease.y + 5} fontSize="14" fill="#5b21b6" textAnchor="middle" fontWeight="bold">
                      {nodeRelease.label}
                    </text>
                  </g>
                ) : null}

                {flags.rebased ? (
                  <g>
                    <rect x={nodeRebased.x - 80} y={nodeRebased.y - 18} width={160} height={36} rx={12} fill="#f0fdf4" stroke="#34d399" />
                    <text x={nodeRebased.x} y={nodeRebased.y + 5} fontSize="14" fill="#065f46" textAnchor="middle" fontWeight="bold">
                      {nodeRebased.label}
                    </text>
                  </g>
                ) : null}

                {/* main always */}
                <g>
                  <rect x={nodeMain.x - 70} y={nodeMain.y - 18} width={140} height={36} rx={12} fill="#f8fafc" stroke="#94a3b8" />
                  <text x={nodeMain.x} y={nodeMain.y + 5} fontSize="14" fill="#334155" textAnchor="middle" fontWeight="bold">
                    {nodeMain.label}
                  </text>
                </g>

                {/* Edges */}
                {flags.createdFeature ? renderEdge(nodeMain, nodeFeature, 'spawn') : null}
                {flags.mergedFeature ? renderEdge(nodeFeature, nodeMain, 'merge') : null}
                {flags.cherryPicked ? renderEdge(nodeFeature, nodeHotfix, 'cherry') : null}
                {flags.cherryPicked ? renderEdge(nodeHotfix, nodeMain, 'apply') : null}
                {flags.gitflowApplied ? renderEdge(nodeMain, nodeRelease, 'release') : null}
                {flags.gitflowApplied ? renderEdge(nodeFeature, nodeRelease, 'まとめ') : null}
                {flags.gitflowApplied ? renderEdge(nodeRelease, nodeMain, 'integrate') : null}
                {flags.rebased ? renderEdge(nodeMain, nodeRebased, 'rebase') : null}
              </svg>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <div className="font-bold text-gray-800 mb-2">操作ガイド</div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>・各ステップで「正しいアクション」を選んで進めます</div>
              <div>・選んだ結果がツリーに反映されます</div>
              <div>・最後に YouTube 導線（スタブ）を表示します</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

