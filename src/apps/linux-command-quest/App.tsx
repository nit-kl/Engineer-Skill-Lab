import { useEffect, useMemo, useRef, useState } from 'react';
import { loadJson } from '../../utils/loadJson';
import YoutubeEntryPoint from './youtube-entrypoint';

type StageId = 'files' | 'permissions' | 'processes' | 'scripts' | 'network' | 'done';

type Scenario = {
  stages: Array<{ id: Exclude<StageId, 'done'>; label: string }>;
  startCwd: string;
  networkHosts: string[];
  requiredFiles: string[];
};

type Learning = {
  stages: Record<Exclude<StageId, 'done'>, { hint: string }>;
  result: { title: string; description: string };
};

type Youtube = {
  default?: { videoId: string; url?: string; chapters?: Array<{ start: string; title: string }> };
};

type FSItem =
  | {
      kind: 'dir';
      mode: number; // e.g. 755
    }
  | {
      kind: 'file';
      mode: number; // e.g. 644
      content: string;
    };

type Role = 'owner' | 'other';

type Process = { pid: number; name: string; status: 'running' | 'killed' };

type TerminalLine = { kind: 'user' | 'system'; text: string };

function permString(mode: number) {
  // Very small unix-like string. owner/group/other read/write/exec.
  const owner = Math.floor(mode / 100);
  const group = Math.floor((mode % 100) / 10);
  const other = mode % 10;

  const toBits = (d: number) => ({
    r: (d & 4) !== 0,
    w: (d & 2) !== 0,
    x: (d & 1) !== 0,
  });

  const o = toBits(owner);
  const g = toBits(group);
  const ot = toBits(other);

  return `${o.r ? 'r' : '-'}${o.w ? 'w' : '-'}${o.x ? 'x' : '-'}${g.r ? 'r' : '-'}${g.w ? 'w' : '-'}${g.x ? 'x' : '-'}${ot.r ? 'r' : '-'}${ot.w ? 'w' : '-'}${ot.x ? 'x' : '-'}`;
}

function hasRead(item: FSItem, role: Role) {
  const mode = item.mode;
  const ownerDigit = Math.floor(mode / 100);
  const groupDigit = Math.floor((mode % 100) / 10);
  const otherDigit = mode % 10;
  const digit = role === 'owner' ? ownerDigit : otherDigit;
  return (digit & 4) !== 0;
}

function hasExec(item: FSItem, role: Role) {
  const mode = item.mode;
  const ownerDigit = Math.floor(mode / 100);
  const otherDigit = mode % 10;
  const digit = role === 'owner' ? ownerDigit : otherDigit;
  return (digit & 1) !== 0;
}

function resolvePath(rawPath: string, cwd: string) {
  const cleaned = rawPath.trim();
  if (!cleaned) return cwd;
  const abs = cleaned.startsWith('/') ? cleaned : `${cwd}/${cleaned}`;
  const parts = abs.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const p of parts) {
    if (p === '.') continue;
    if (p === '..') stack.pop();
    else stack.push(p);
  }
  return `/${stack.join('/')}`;
}

function basename(path: string) {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function dirname(path: string) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return '/';
  return `/${parts.slice(0, -1).join('/')}`;
}

export default function LinuxCommandQuestApp() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [learning, setLearning] = useState<Learning | null>(null);
  const [youtube, setYoutube] = useState<Youtube | null>(null);

  const [stage, setStage] = useState<StageId>('files');
  const role: Role = 'other'; // guest user to make permissions meaningful
  const [cwd, setCwd] = useState<string>('/');
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [fs, setFs] = useState<Record<string, FSItem>>({});
  const [processes, setProcesses] = useState<Process[]>([]);
  const [nextPid, setNextPid] = useState<number>(1000);

  const [scriptExecuted, setScriptExecuted] = useState(false);
  const [networkPingOk, setNetworkPingOk] = useState(false);
  const [networkCurlOk, setNetworkCurlOk] = useState(false);
  const [resetToken, setResetToken] = useState(0);

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

  useEffect(() => {
    if (!scenario) return;

    // Initialize virtual filesystem for the quest.
    const initialCwd = scenario.startCwd;
    setCwd(initialCwd);
    setScriptExecuted(false);
    setNetworkPingOk(false);
    setNetworkCurlOk(false);
    setStage('files');
    setLines([
      {
        kind: 'system',
        text: 'Linuxコマンドクエストへようこそ！まずは `help` または `ls` から始めよう。',
      },
    ]);

    const newFs: Record<string, FSItem> = {
      '/home': { kind: 'dir', mode: 755 },
      '/home/docs': { kind: 'dir', mode: 755 },
      '/home/run.sh': { kind: 'file', mode: 700, content: 'echo start; touch /home/docs/result.txt; start' },
      '/home/docs/PORTAL_PROPOSAL.md': {
        kind: 'file',
        mode: 644,
        content: 'PORTAL_PROPOSAL.md（簡易ダミー）\nPhase1/Phase2などの内容が入っています。',
      },
      '/home/docs/private.txt': {
        kind: 'file',
        mode: 600, // guest can't read initially
        content: '秘密メモ（private）\nchmodしてから読むんだ。',
      },
      '/home/docs/result.txt': {
        kind: 'file',
        mode: 644,
        content: '（未生成）',
      },
    };

    setFs(newFs);
    setProcesses([]);
    setNextPid(1000);
    setInput('');
  }, [scenario, resetToken]);

  const prompt = useMemo(() => {
    const stageLabel: Record<Exclude<StageId, 'done'>, string> = {
      files: 'files',
      permissions: 'permissions',
      processes: 'processes',
      scripts: 'scripts',
      network: 'network',
    };
    if (stage === 'done') return 'clear $';
    return `${stageLabel[stage as Exclude<StageId, 'done'>]} $`;
  }, [stage]);

  const quickCommands = useMemo(() => {
    if (stage === 'done') return [];
    if (stage === 'files') return ['help', 'ls', 'cd docs', 'cat PORTAL_PROPOSAL.md'];
    if (stage === 'permissions') return ['ls -l docs', 'chmod 644 docs/private.txt', 'cat docs/private.txt'];
    if (stage === 'processes') return ['ps', 'start', 'kill 1000'];
    if (stage === 'scripts') return ['ls', './run.sh'];
    if (stage === 'network') return ['ping portal.engine.skill-lab', 'curl https://portal.engine.skill-lab/'];
    return [];
  }, [stage]);

  function pushLine(line: TerminalLine) {
    setLines(prev => [...prev, line]);
  }

  function pushSystem(text: string) {
    pushLine({ kind: 'system', text });
  }

  function runLs(args: string[]) {
    const isLong = args[0] === 'ls' && args[1] === '-l';
    const pathArg = isLong ? args[2] : args[1];
    const resolved = pathArg ? resolvePath(pathArg, cwd) : cwd;
    const item = fs[resolved];
    if (!item || item.kind !== 'dir') {
      pushSystem(`ls: ${pathArg ?? resolved}: そのようなディレクトリはありません。`);
      return;
    }

    if (isLong) {
      const children = Object.keys(fs)
        .filter(p => dirname(p) === resolved)
        .sort();
      if (children.length === 0) {
        pushSystem('(空)');
        return;
      }
      const linesLong = children.map(p => {
        const name = basename(p);
        const child = fs[p];
        const type = child.kind === 'dir' ? 'd' : '-';
        const perms = permString(child.mode);
        return `${type}${perms} ${name}`;
      });
      pushSystem(linesLong.join('\n'));
    } else {
      const children = Object.keys(fs)
        .filter(p => dirname(p) === resolved)
        .map(p => basename(p))
        .sort();
      if (children.length === 0) pushSystem('(空)');
      else pushSystem(children.join('  '));
    }
  }

  function runCd(args: string[]) {
    const raw = args[1] ?? '';
    if (!raw) {
      setCwd('/home');
      pushSystem('home に移動しました。');
      return;
    }
    const resolved = resolvePath(raw, cwd);
    const item = fs[resolved];
    if (!item || item.kind !== 'dir') {
      pushSystem(`cd: ${raw}: そのようなディレクトリはありません。`);
      return;
    }
    if (!hasExec(item, role)) {
      pushSystem(`cd: ${raw}: 権限がありません。`);
      return;
    }
    setCwd(resolved);
    pushSystem(`${raw} に移動しました。`);
  }

  function runCat(args: string[]) {
    const raw = args[1] ?? '';
    if (!raw) {
      pushSystem('cat: ファイル名が必要です。');
      return;
    }
    const resolved = resolvePath(raw, cwd);
    const item = fs[resolved];
    if (!item || item.kind !== 'file') {
      pushSystem(`cat: ${raw}: そのようなファイルはありません。`);
      return;
    }
    if (!hasRead(item, role)) {
      pushSystem(`cat: ${raw}: 権限がありません（read が必要）。`);
      return;
    }
    pushSystem(item.content);

    // Stage gates
    if (stage === 'files' && resolved.endsWith('/home/docs/PORTAL_PROPOSAL.md')) {
      setStage('permissions');
      pushSystem('資料を確認！次はパーミッションです。');
    }
    if (stage === 'permissions' && resolved.endsWith('/home/docs/private.txt')) {
      setStage('processes');
      pushSystem('private.txt を読めました。次はプロセス管理へ。');
    }
    if (stage === 'scripts' && resolved.endsWith('/home/docs/result.txt') && scriptExecuted) {
      setStage('network');
      pushSystem('result.txt を確認！次はネットワークです。');
    }
  }

  function runChmod(args: string[]) {
    const modeRaw = args[1];
    const rawPath = args[2];
    if (!modeRaw || !rawPath) {
      pushSystem('chmod: usage: chmod <mode> <path>');
      return;
    }
    const modeNum = Number(modeRaw);
    if (!Number.isFinite(modeNum)) {
      pushSystem('chmod: mode が不正です。');
      return;
    }
    const resolved = resolvePath(rawPath, cwd);
    const item = fs[resolved];
    if (!item) {
      pushSystem(`chmod: ${rawPath}: そのようなファイル/ディレクトリはありません。`);
      return;
    }
    setFs(prev => ({ ...prev, [resolved]: { ...item, mode: modeNum } }));
    pushSystem(`権限を ${modeNum} に変更しました。`);
  }

  function runPs() {
    if (processes.length === 0) {
      pushSystem('PID\tNAME\tSTATUS');
      pushSystem('(プロセスなし)');
      return;
    }
    const header = 'PID\tNAME\tSTATUS';
    const body = processes
      .filter(p => p.status === 'running')
      .map(p => `${p.pid}\t${p.name}\t${p.status}`)
      .join('\n');
    pushSystem(`${header}\n${body || '(なし)'}`);
  }

  function runStart() {
    if (stage !== 'processes') {
      pushSystem('今はこのコマンドは使えません（ミッションの順番が必要です）。');
      return;
    }

    const pid = nextPid;
    setNextPid(prev => prev + 1);
    setProcesses(prev => [{ pid, name: 'portal-server', status: 'running' }, ...prev].slice(0, 8));
    pushSystem(`プロセスを開始しました：pid=${pid}`);
  }

  function runKill(args: string[]) {
    const pidRaw = args[1];
    const pid = pidRaw ? Number(pidRaw) : NaN;
    if (!Number.isFinite(pid)) {
      pushSystem('kill: usage: kill <pid>');
      return;
    }
    const target = processes.find(p => p.pid === pid && p.status === 'running');
    if (!target) {
      pushSystem(`kill: pid=${pid}: 見つかりません。`);
      return;
    }

    setProcesses(prev =>
      prev.map(p => (p.pid === pid ? { ...p, status: 'killed' } : p))
    );
    pushSystem(`pid=${pid} を停止しました。`);

    if (stage === 'processes') {
      setStage('scripts');
      pushSystem('プロセスを止めました。次はシェルスクリプトへ。');
    }
  }

  function runScript(args: string[]) {
    if (stage !== 'scripts') {
      pushSystem('scripts段階に到達してから実行してください。');
      return;
    }

    // ./run.sh
    const resolved = resolvePath(args[0], cwd);
    const item = fs[resolved];
    if (!item || item.kind !== 'file') {
      pushSystem('スクリプトが見つかりません。');
      return;
    }

    setScriptExecuted(true);
    // Simulate script effects
    setFs(prev => ({
      ...prev,
      '/home/docs/result.txt': {
        kind: 'file',
        mode: 0o644,
        content: 'result.txt が生成されました（run.sh の結果）',
      },
    }));
    pushSystem('run.sh を実行しました。result.txt が生成されます。');
  }

  function runPing(args: string[]) {
    const host = args[1] ?? '';
    if (stage !== 'network') return pushSystem('ネットワーク段階に到達してから実行してください。');
    if (!host) return pushSystem('ping: ホスト名を指定してください。');
    if (host === scenario?.networkHosts?.[0]) {
      setNetworkPingOk(true);
      pushSystem(`PING ${host}: success（簡易）`);
    } else {
      pushSystem(`PING ${host}: failed（簡易）`);
    }
  }

  function runCurl(args: string[]) {
    const url = args[1] ?? '';
    if (stage !== 'network') return pushSystem('ネットワーク段階に到達してから実行してください。');
    if (!url) return pushSystem('curl: URL が必要です。');

    const host = url.replace(/^https?:\/\//, '').split('/')[0];
    if (!networkPingOk) {
      pushSystem('curl は疎通が必要です。まず ping を試してください。');
      return;
    }
    if (host === scenario?.networkHosts?.[0]) {
      setNetworkCurlOk(true);
      pushSystem('curl: portalページ取得成功（簡易）');
      setStage('done');
      pushSystem('ミッション完了！おつかれさま！');
    } else {
      pushSystem('curl: ホストが見つかりません（簡易）。');
    }
  }

  function runCommand(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    pushLine({ kind: 'user', text: trimmed });
    const tokens = trimmed.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    if (cmd === 'clear') {
      setLines([]);
      return;
    }

    if (cmd === 'help') {
      const stageHints: Record<Exclude<StageId, 'done'>, string[]> = {
        files: ['help', 'ls', 'cd docs', 'cat PORTAL_PROPOSAL.md'],
        permissions: ['ls -l docs', 'chmod 644 docs/private.txt', 'cat docs/private.txt'],
        processes: ['ps', 'start', 'kill <pid>'],
        scripts: ['ls', './run.sh'],
        network: ['ping portal.engine.skill-lab', 'curl https://portal.engine.skill-lab/'],
      };
      const list = stage === 'done' ? [] : stageHints[stage as Exclude<StageId, 'done'>] ?? [];
      pushSystem(`使えるコマンド（簡易）：\n${list.join('\n')}`);
      return;
    }

    if (cmd === 'ls') {
      // handle: ls -l <path> / ls <path>
      if (tokens[1] === '-l') {
        runLs(['ls', tokens[1], tokens[2] ?? '']);
      } else {
        runLs(['ls', tokens[1] ?? '']);
      }
      return;
    }

    if (cmd === 'cd') {
      runCd(tokens);
      return;
    }

    if (cmd === 'cat') {
      runCat(tokens);
      return;
    }

    if (cmd === 'chmod') {
      runChmod(tokens);
      return;
    }

    if (cmd === 'ps') {
      runPs();
      return;
    }

    if (cmd === 'start') {
      runStart();
      return;
    }

    if (cmd === 'kill') {
      runKill(tokens);
      return;
    }

    // Execute script
    if (cmd === './run.sh' || cmd === 'bash' || cmd.endsWith('run.sh')) {
      if (tokens[0] === 'bash') {
        runScript(['./run.sh']);
      } else {
        // './run.sh'
        runScript([tokens[0]]);
      }
      return;
    }

    if (cmd === 'ping') {
      runPing(tokens);
      return;
    }

    if (cmd === 'curl') {
      runCurl(tokens);
      return;
    }

    pushSystem('そのコマンドは見つかりません（簡易シミュレーション）。`help` を試してください。');
  }

  if (!scenario || !learning || !youtube) {
    return <div className="text-gray-600">読み込み中...</div>;
  }

  const stageLabel = scenario.stages.find(s => s.id === stage)?.label ?? (stage === 'done' ? '完了' : stage);

  if (stage === 'done') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Linuxコマンドクエスト（Phase1 完成デモ）</h2>
          <p className="text-gray-600 mt-1">ミッション完了です！</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="font-bold text-gray-800 mb-2">{learning.result.title}</div>
          <div className="text-gray-600 text-sm">{learning.result.description}</div>
        </div>
        <YoutubeEntryPoint content={youtube} />
        <button
          onClick={() => setResetToken(t => t + 1)}
          className="px-6 py-3 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
          type="button"
        >
          最初からやり直す
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-800">Linuxコマンドクエスト（Phase1 完成デモ）</h2>
        <p className="text-gray-600 mt-1">仮想ターミナル上で、ファイル/権限/プロセス/スクリプト/ネットワークを体験します。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-black/5 rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="text-sm text-gray-600">ターミナル（{stageLabel}）</div>
          </div>

          <div className="p-4 max-h-[420px] overflow-y-auto space-y-2 bg-white">
            {lines.map((l, idx) => (
              <div key={idx} className={l.kind === 'user' ? 'text-gray-900' : 'text-gray-700'}>
                {l.kind === 'user' ? (
                  <span className="font-mono text-sm">
                    {prompt} {l.text}
                  </span>
                ) : (
                  <span className="font-mono text-sm whitespace-pre-wrap">{l.text}</span>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runCommand(input);
              setInput('');
              inputRef.current?.focus();
            }}
            className="p-4 border-t border-gray-100 bg-white"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-600">{prompt}</span>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 font-mono text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-400"
                placeholder="コマンドを入力"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold hover:shadow transition-shadow"
              >
                実行
              </button>
            </div>

            {quickCommands.length > 0 ? (
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
            ) : null}
          </form>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4">
          <div>
            <div className="text-sm text-gray-600">ミッション</div>
            <div className="mt-2 font-bold text-gray-800">
              {stageLabel === 'ファイル操作' && 'ファイルを見つけて読もう'}
              {stageLabel === 'パーミッション' && '権限を変更して private を読もう'}
              {stageLabel === 'プロセス管理' && 'プロセスを開始して停止しよう'}
              {stageLabel === 'シェルスクリプト' && 'スクリプトを実行しよう'}
              {stageLabel === 'ネットワーク系' && 'ping と curl で到達確認しよう'}
            </div>
            <div className="text-sm text-gray-600 mt-2">{learning.stages[stage as Exclude<StageId, 'done'>]?.hint}</div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
            <div className="font-bold text-gray-800 mb-2">仮想ユーザー</div>
            <div>・現在ロール：other（権限が必要な場面があります）</div>
          </div>

          <button
            type="button"
            onClick={() => setResetToken(t => t + 1)}
            className="w-full px-4 py-3 rounded-2xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
          >
            最初からやり直す
          </button>
        </div>
      </div>
    </div>
  );
}

