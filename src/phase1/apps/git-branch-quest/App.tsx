import { useMemo, useState } from 'react';

type StepId = 'create' | 'merge' | 'conflict' | 'gitflow' | 'rebase' | 'done';

const STEPS: Array<{ id: Exclude<StepId, 'done'>; title: string; description: string }> = [
  {
    id: 'create',
    title: 'ブランチ作成',
    description: 'まずは feature ブランチを切って作業を分離します。',
  },
  {
    id: 'merge',
    title: 'マージ',
    description: '開発ブランチを main にマージします。',
  },
  {
    id: 'conflict',
    title: 'コンフリクト解決（簡易）',
    description: '衝突したら「どっちを採用するか」を選びます。',
  },
  {
    id: 'gitflow',
    title: 'Git Flow',
    description: 'リリースや feature の役割を整理します（最小デモ）。',
  },
  {
    id: 'rebase',
    title: 'リベース戦略',
    description: '履歴を整えてから統合します。',
  },
];

function nextStep(step: StepId): StepId {
  if (step === 'create') return 'merge';
  if (step === 'merge') return 'conflict';
  if (step === 'conflict') return 'gitflow';
  if (step === 'gitflow') return 'rebase';
  if (step === 'rebase') return 'done';
  return 'done';
}

export default function GitBranchQuestApp() {
  const [step, setStep] = useState<StepId>('create');
  const [message, setMessage] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  const current = useMemo(() => STEPS.find(s => s.id === step) ?? null, [step]);

  function addLog(text: string) {
    setLog(prev => [text, ...prev].slice(0, 8));
  }

  function fail(text: string) {
    setMessage(text);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Gitブランチクエスト（Phase1デモ）</h2>
        <p className="text-gray-600 mt-1">手順に沿って正しいアクションを選択しよう（最小RPG）。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
          {step !== 'done' && current ? (
            <>
              <div className="mb-3">
                <div className="text-sm text-gray-500">現在のステップ</div>
                <div className="text-lg font-bold text-gray-800">{current.title}</div>
                <div className="text-gray-600 mt-1">{current.description}</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {step === 'create' && (
                  <>
                    <button
                      onClick={() => {
                        addLog('feature ブランチを作成しました');
                        setMessage('');
                        setStep(nextStep('create'));
                      }}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow"
                    >
                      `git checkout -b feature`
                    </button>
                    <button
                      onClick={() => fail('main に直接コミットすると後で痛みます。まずはブランチ！')}
                      className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50"
                    >
                      mainで直接編集
                    </button>
                  </>
                )}

                {step === 'merge' && (
                  <>
                    <button
                      onClick={() => {
                        addLog('feature を main にマージしました');
                        setMessage('');
                        setStep(nextStep('merge'));
                      }}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow"
                    >
                      `git merge feature`
                    </button>
                    <button
                      onClick={() => fail('マージしないと統合されません。次へ進もう！')}
                      className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50"
                    >
                      マージせず終了
                    </button>
                  </>
                )}

                {step === 'conflict' && (
                  <>
                    <button
                      onClick={() => {
                        addLog('コンフリクトを解決して統合しました（ours）');
                        setMessage('');
                        setStep(nextStep('conflict'));
                      }}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow"
                    >
                      ours を採用
                    </button>
                    <button
                      onClick={() => fail('今回は「ours」を採用するのが正解です（デモ）。')}
                      className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50"
                    >
                      theirs を採用
                    </button>
                  </>
                )}

                {step === 'gitflow' && (
                  <>
                    <button
                      onClick={() => {
                        addLog('feature で開発し、準備ができたら release へ（デモ）');
                        setMessage('');
                        setStep(nextStep('gitflow'));
                      }}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow"
                    >
                      feature→release の流れ
                    </button>
                    <button
                      onClick={() => fail('Git Flow の基本からやり直そう！まずは feature から。')}
                      className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50"
                    >
                      main 直行で全て
                    </button>
                  </>
                )}

                {step === 'rebase' && (
                  <>
                    <button
                      onClick={() => {
                        addLog('rebase で履歴を整えて統合しました');
                        setMessage('');
                        setStep(nextStep('rebase'));
                      }}
                      className="px-5 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow"
                    >
                      `git rebase main`
                    </button>
                    <button
                      onClick={() => fail('履歴を整えるとレビューが楽になります。')}
                      className="px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50"
                    >
                      rebase せずマージ
                    </button>
                  </>
                )}
              </div>

              {message && (
                <div className="mt-4 rounded-xl border border-pink-100 bg-pink-50 p-3 text-sm text-pink-900">
                  {message}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-gray-800 mb-2">クリア！</div>
              <div className="text-gray-600 mb-4">ブランチ操作の流れが一通り体験できました。</div>
              <button
                onClick={() => {
                  setStep('create');
                  setMessage('');
                  setLog([]);
                }}
                className="px-5 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700"
              >
                やり直す
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-sm text-gray-500 mb-2">行動ログ</div>
          {log.length === 0 ? (
            <div className="text-gray-600 text-sm">まだ何も実行していません。</div>
          ) : (
            <div className="space-y-2">
              {log.map((l, idx) => (
                <div key={idx} className="text-gray-800 text-sm">
                  ・{l}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

