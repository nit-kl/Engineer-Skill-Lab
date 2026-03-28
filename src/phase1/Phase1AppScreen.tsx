import type { ComponentType } from 'react';
import { ChevronLeft } from 'lucide-react';
import { appsData } from '../data';
import CloudArchPuzzleApp from '../apps/cloud-arch-puzzle/App';
import SqlDojoApp from '../apps/sql-dojo/App';

const APP_COMPONENTS: Record<string, ComponentType> = {
  'cloud-arch-puzzle': CloudArchPuzzleApp,
  'sql-dojo': SqlDojoApp,
};

export default function Phase1AppScreen(props: { appId: string; onExit: () => void }) {
  const { appId, onExit } = props;
  const appMeta = appsData.find(a => a.id === appId);
  const Component = APP_COMPONENTS[appId];
  const isCloudArchPuzzle = appId === 'cloud-arch-puzzle';
  const isSqlDojo = appId === 'sql-dojo';
  const isFullBleed = isCloudArchPuzzle || isSqlDojo;

  return (
    <div
      className={
        isFullBleed
          ? 'relative z-10 w-full min-w-0 max-w-none px-0 pt-0 pb-4'
          : 'relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8'
      }
    >
      <div
        className={[
          'flex items-center justify-between gap-4',
          isFullBleed ? 'mb-4 px-4 sm:px-6' : 'mb-6',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label="ポータルに戻る"
          className={[
            'group inline-flex items-center gap-1.5 pl-3 pr-4 py-2.5 rounded-2xl',
            'bg-white/90 backdrop-blur-sm border-2 border-pink-200/70 text-gray-800 font-bold text-[15px]',
            'shadow-[0_4px_14px_-4px_rgba(236,72,153,0.35)]',
            'hover:border-pink-300 hover:shadow-[0_6px_20px_-4px_rgba(236,72,153,0.45)] hover:-translate-y-0.5',
            'active:translate-y-0 active:shadow-md transition-all duration-200',
          ].join(' ')}
        >
          <ChevronLeft
            className="h-5 w-5 text-pink-500 shrink-0 transition-transform group-hover:-translate-x-0.5"
            strokeWidth={2.5}
            aria-hidden
          />
          戻る
        </button>

        <div className="text-right min-w-0">
          <div
            className={[
              'text-xl font-bold tracking-tight truncate',
              isCloudArchPuzzle || isSqlDojo
                ? 'bg-gradient-to-r from-pink-600 via-rose-600 to-violet-600 bg-clip-text text-transparent'
                : 'text-gray-900',
            ].join(' ')}
          >
            {appMeta?.title ?? appId}
          </div>
        </div>
      </div>

      <div
        className={
          isFullBleed
            ? 'w-full min-w-0 bg-transparent border-0 shadow-none rounded-none overflow-visible'
            : 'bg-white/80 backdrop-blur-sm border border-white/50 rounded-3xl shadow-sm overflow-hidden'
        }
      >
        {Component ? (
          <div className={isFullBleed ? 'w-full min-w-0 p-0' : 'p-6 sm:p-8'}>{<Component />}</div>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="text-lg font-bold text-gray-800 mb-2">対応していないアプリです</div>
            <div className="text-gray-700">Portal からやり直してください。</div>
          </div>
        )}
      </div>
    </div>
  );
}

