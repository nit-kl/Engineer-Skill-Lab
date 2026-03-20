import { FormEvent, useMemo, useRef, useState } from 'react';

type Line = { kind: 'user' | 'system'; text: string };

type Stage = 0 | 1 | 2 | 3; // 3 = cleared

function promptText(stage: Stage) {
  if (stage === 0) return 'home $';
  if (stage === 1) return 'docs $';
  if (stage === 2) return 'hint $';
  return 'clear $';
}

export default function LinuxCommandQuestApp() {
  const [stage, setStage] = useState<Stage>(0);
  const [lines, setLines] = useState<Line[]>([
    {
      kind: 'system',
      text:
        'Linuxコマンドクエストへようこそ！まずは `help` か `ls` を試してみよう。',
    },
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isCleared = stage === 3;

  const quickCommands = useMemo(() => {
    if (isCleared) return [];
    if (stage === 0) return ['help', 'ls', 'cd docs'];
    if (stage === 1) return ['ls', 'cat PORTAL_PROPOSAL.md'];
    if (stage === 2) return ['start'];
    return [];
  }, [isCleared, stage]);

  function pushSystem(text: string) {
    setLines(prev => [...prev, { kind: 'system', text }]);
  }

  function runCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    setLines(prev => [...prev, { kind: 'user', text: cmd }]);

    const lower = cmd.toLowerCase();

    if (lower === 'clear') {
      setLines([{ kind: 'system', text: '画面をクリアしました。' }]);
      return;
    }

    if (isCleared) {
      pushSystem('クリア済みです。戻るボタンでポータルへ戻れます。');
      return;
    }

    // Stage machine (minimal demo)
    if (stage === 0) {
      if (lower === 'help') {
        pushSystem('使えるコマンド：`ls`, `cd docs`, `help`');
        return;
      }
      if (lower === 'ls') {
        pushSystem('docs  run.sh  README.txt（簡易）');
        return;
      }
      if (lower === 'cd docs') {
        setStage(1);
        pushSystem('docs に移動しました。`cat PORTAL_PROPOSAL.md` を試してみよう。');
        return;
      }

      pushSystem('そのコマンドは見つかりません。`help` を試してください。');
      return;
    }

    if (stage === 1) {
      if (lower === 'ls') {
        pushSystem('PORTAL_PROPOSAL.md  notes.txt（簡易）');
        return;
      }
      if (lower === 'cat portal_proposal.md' || lower === 'cat portal_proposal.md'.toLowerCase()) {
        // accept variants like PORTAL_PROPOSAL.md (case-insensitive)
        setStage(2);
        pushSystem('ヒントを入手！答え合わせは `start` です。');
        return;
      }
      if (lower === 'cd ..' || lower === 'cd ..'.toLowerCase()) {
        setStage(0);
        pushSystem('home に戻りました。`ls` や `cd docs` を試してね。');
        return;
      }

      // Accept the exact filename variant
      if (lower === 'cat portal_proposal.md' || lower === 'cat portal_proposal.md') {
        setStage(2);
        pushSystem('ヒントを入手！答え合わせは `start` です。');
        return;
      }

      // Best-effort: check if it includes the expected file name
      if (lower.includes('cat') && lower.includes('portal_proposal.md')) {
        setStage(2);
        pushSystem('ヒントを入手！答え合わせは `start` です。');
        return;
      }

      pushSystem('docs 内では `ls` か `cat PORTAL_PROPOSAL.md` を試してみよう。');
      return;
    }

    if (stage === 2) {
      if (lower === 'start') {
        setStage(3);
        pushSystem('クリア！Phase1の遷移デモが完了です。');
        return;
      }
      pushSystem('次は `start` です。');
      return;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    runCommand(input);
    setInput('');
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Linuxコマンドクエスト（Phase1デモ）</h2>
        <p className="text-gray-600 mt-1">入力してストーリーを進める簡易ターミナルです。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-black/5 rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="text-sm text-gray-600">ターミナル</div>
          </div>

          <div className="p-4 max-h-[420px] overflow-y-auto space-y-2">
            {lines.map((l, idx) => (
              <div
                key={idx}
                className={l.kind === 'user' ? 'text-gray-900' : 'text-gray-700'}
              >
                {l.kind === 'user' ? (
                  <span className="font-mono text-sm">
                    {promptText(stage)} {l.text}
                  </span>
                ) : (
                  <span className="font-mono text-sm">{l.text}</span>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={onSubmit} className="p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-600">{promptText(stage)}</span>
              <input
                ref={inputRef}
                disabled={isCleared}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 font-mono text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={isCleared ? 'クリア済み' : 'コマンドを入力'}
              />
              <button
                disabled={isCleared}
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:shadow transition-shadow"
              >
                実行
              </button>
            </div>

            {quickCommands.length > 0 && !isCleared && (
              <div className="mt-3 flex flex-wrap gap-2">
                {quickCommands.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setInput(c);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-800 text-sm hover:bg-gray-50"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-4">
          <div className="text-sm text-gray-600">ミッション</div>
          <div className="mt-2 font-bold text-gray-800">
            {stage === 0 && 'home でファイルを見つけよう'}
            {stage === 1 && 'docs の資料を読もう'}
            {stage === 2 && 'start で答え合わせ'}
            {stage === 3 && 'クリア！'}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {stage === 0 && 'まず `help` または `ls`。'}
            {stage === 1 && '`cat PORTAL_PROPOSAL.md` を試そう。'}
            {stage === 2 && '`start` と入力。'}
            {stage === 3 && 'おつかれさま！'}
          </div>

          <div className="mt-4">
            <button
              className="w-full px-4 py-3 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
              type="button"
              onClick={() => {
                setStage(0);
                setLines([
                  {
                    kind: 'system',
                    text:
                      'Linuxコマンドクエストへようこそ！まずは `help` か `ls` を試してみよう。',
                  },
                ]);
                setInput('');
                inputRef.current?.focus();
              }}
            >
              最初からやり直す
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

