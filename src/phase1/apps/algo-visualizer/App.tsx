import { useMemo, useState } from 'react';

type BubbleState = {
  arr: number[];
  i: number; // outer pass
  j: number; // inner index
  done: boolean;
};

function parseNumberList(input: string) {
  const cleaned = input.replace(/[\[\]\s]/g, '');
  if (!cleaned) return [];
  const parts = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  const nums = parts.map(p => Number(p)).filter(n => Number.isFinite(n));
  return nums;
}

export default function AlgoVisualizerApp() {
  const [input, setInput] = useState('5,1,4,2,8');
  const [bubble, setBubble] = useState<BubbleState>({ arr: [], i: 0, j: 0, done: true });

  const n = bubble.arr.length;
  const compare = n >= 2 ? [bubble.j, bubble.j + 1] as const : null;
  const sortedStart = n >= 1 ? n - bubble.i : 0; // after i passes, last i elements are sorted

  const summary = useMemo(() => {
    if (bubble.done) {
      return bubble.arr.length > 0 ? '完了（最小デモ）' : '開始待ち';
    }
    if (bubble.arr.length < 2) return '要素を2つ以上にしてください。';
    return `ステップ進行中：i=${bubble.i}, j=${bubble.j}`;
  }, [bubble.done, bubble.arr.length, bubble.i, bubble.j]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">アルゴリズムビジュアライザー（Phase1デモ）</h2>
        <p className="text-gray-600 mt-1">バブルソートを「1ステップずつ」進める最小デモです。</p>
      </div>

      <div className="bg-white/80 border border-gray-100 rounded-2xl p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-1">配列（カンマ区切り）</div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const arr = parseNumberList(input);
                setBubble({ arr, i: 0, j: 0, done: arr.length < 2 });
              }}
              className="px-5 py-2 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
            >
              開始
            </button>
            <button
              onClick={() => setBubble({ arr: [], i: 0, j: 0, done: true })}
              className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
            >
              リセット
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 mt-3">{summary}</div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4">
        {bubble.arr.length === 0 ? (
          <div className="text-gray-600">配列を開始してください。</div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm text-gray-600">
                現在：[{bubble.arr.join(', ')}]
              </div>
              <div className="flex gap-2">
                <button
                  disabled={bubble.done || bubble.arr.length < 2}
                  onClick={() => {
                    setBubble(prev => {
                      if (prev.done) return prev;
                      const arr = [...prev.arr];
                      const nLocal = arr.length;
                      if (nLocal < 2) return { ...prev, done: true };

                      const i = prev.i;
                      const j = prev.j;

                      // compare arr[j] and arr[j+1] when j is in range
                      if (j < nLocal - i - 1) {
                        if (arr[j] > arr[j + 1]) {
                          const tmp = arr[j];
                          arr[j] = arr[j + 1];
                          arr[j + 1] = tmp;
                        }
                      }

                      const nextJ = j + 1;
                      if (nextJ >= nLocal - i - 1) {
                        const nextI = i + 1;
                        if (nextI >= nLocal - 1) {
                          return { arr, i: nextI, j: 0, done: true };
                        }
                        return { arr, i: nextI, j: 0, done: false };
                      }

                      return { arr, i, j: nextJ, done: false };
                    });
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:shadow transition-shadow"
                >
                  ステップ
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {bubble.arr.map((v, idx) => {
                const isCompare = compare ? idx === compare[0] || idx === compare[1] : false;
                const isSorted = idx >= sortedStart;
                return (
                  <div
                    key={`${idx}-${v}`}
                    className={[
                      'w-12 h-12 rounded-xl border flex items-center justify-center font-bold',
                      isCompare ? 'border-pink-300 bg-pink-50 text-pink-900' : '',
                      !isCompare && isSorted ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : '',
                      !isCompare && !isSorted ? 'border-gray-200 bg-white text-gray-800' : '',
                    ].join(' ')}
                    title={isSorted ? 'sorted' : isCompare ? 'compare' : ''}
                  >
                    {v}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

