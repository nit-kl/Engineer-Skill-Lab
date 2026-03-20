import { useMemo, useState } from 'react';

const LAYERS = ['入口', 'アプリ', 'ネットワーク', '計算', 'データ'] as const;
type Layer = (typeof LAYERS)[number];

const SERVICES = [
  { name: 'ALB', label: 'ALB（入口）' },
  { name: 'API Gateway', label: 'API Gateway（アプリ）' },
  { name: 'VPC', label: 'VPC（ネットワーク）' },
  { name: 'EC2', label: 'EC2（計算）' },
  { name: 'S3', label: 'S3（データ）' },
] as const;

const SOLUTION: Record<Layer, string> = {
  '入口': 'ALB',
  'アプリ': 'API Gateway',
  'ネットワーク': 'VPC',
  '計算': 'EC2',
  'データ': 'S3',
};

function getServiceLabel(serviceName: string) {
  return SERVICES.find(s => s.name === serviceName)?.label ?? serviceName;
}

export default function CloudArchPuzzleApp() {
  const [assignments, setAssignments] = useState<Record<Layer, string | null>>({
    '入口': null,
    'アプリ': null,
    'ネットワーク': null,
    '計算': null,
    'データ': null,
  });
  const [checked, setChecked] = useState(false);

  const used = useMemo(() => {
    return new Set(
      Object.values(assignments)
        .filter((v): v is string => typeof v === 'string')
    );
  }, [assignments]);

  const score = useMemo(() => {
    const correct = LAYERS.reduce((acc, layer) => {
      const expected = SOLUTION[layer];
      const actual = assignments[layer];
      return acc + (actual === expected ? 1 : 0);
    }, 0);
    return correct;
  }, [assignments]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">クラウドアーキテクチャパズル（Phase1デモ）</h2>
        <p className="text-gray-600 mt-1">
          各層にサービスを割り当てて、正しい構成を当てよう（最小デモ）。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LAYERS.map(layer => {
          const current = assignments[layer];
          const options = SERVICES.map(s => s.name).filter(name => !used.has(name) || name === current);

          return (
            <div key={layer} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="font-bold text-gray-800 mb-2">{layer}</div>
              <select
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
                value={current ?? ''}
                onChange={(e) => {
                  const value = e.target.value || null;
                  setAssignments(prev => ({ ...prev, [layer]: value }));
                  setChecked(false);
                }}
              >
                <option value="">未設定</option>
                {options.map(name => (
                  <option key={name} value={name}>
                    {getServiceLabel(name)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          進捗：{score}/5 正解
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChecked(true)}
            className="px-5 py-2 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
          >
            判定する
          </button>
          <button
            onClick={() => {
              setAssignments({
                '入口': null,
                'アプリ': null,
                'ネットワーク': null,
                '計算': null,
                'データ': null,
              });
              setChecked(false);
            }}
            className="px-5 py-2 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold hover:bg-gray-50 transition-colors"
          >
            リセット
          </button>
        </div>
      </div>

      {checked && (
        <div
          className="rounded-2xl border border-gray-100 bg-gray-50 p-4"
          role="status"
          aria-live="polite"
        >
          <div className="font-bold text-gray-800 mb-1">
            {score === 5 ? 'Sランク！完全正解です。' : score >= 4 ? 'Aランク！かなり良いです。' : score >= 2 ? 'Bランク！試行錯誤中。' : 'もう一度！'}
          </div>
          <div className="text-gray-600 text-sm">
            期待される割り当て（答え）：
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {LAYERS.map(layer => (
                <div key={layer} className="text-sm">
                  <span className="font-bold">{layer}：</span>
                  <span>{SOLUTION[layer]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

