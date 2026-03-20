import type { ComponentType } from 'react';
import { appsData } from '../data';
import CloudArchPuzzleApp from './apps/cloud-arch-puzzle/App';
import GitBranchQuestApp from './apps/git-branch-quest/App';
import AlgoVisualizerApp from './apps/algo-visualizer/App';
import LinuxCommandQuestApp from './apps/linux-command-quest/App';

const APP_COMPONENTS: Record<string, ComponentType> = {
  'cloud-arch-puzzle': CloudArchPuzzleApp,
  'git-branch-quest': GitBranchQuestApp,
  'algo-visualizer': AlgoVisualizerApp,
  'linux-command-quest': LinuxCommandQuestApp,
};

export default function Phase1AppScreen(props: { appId: string; onExit: () => void }) {
  const { appId, onExit } = props;
  const appMeta = appsData.find(a => a.id === appId);
  const Component = APP_COMPONENTS[appId];

  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          onClick={onExit}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-gray-200 hover:bg-white transition-colors shadow-sm"
        >
          ← 戻る
        </button>

        <div className="text-right">
          <div className="text-sm text-gray-500">Phase 1</div>
          <div className="text-xl font-display font-bold text-gray-800">{appMeta?.title ?? appId}</div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl shadow-sm overflow-hidden">
        {Component ? (
          <div className="p-6 sm:p-8">{<Component />}</div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="text-lg font-bold text-gray-800 mb-2">対応していないアプリです</div>
            <div className="text-gray-600">Portal からやり直してください。</div>
          </div>
        )}
      </div>
    </div>
  );
}

