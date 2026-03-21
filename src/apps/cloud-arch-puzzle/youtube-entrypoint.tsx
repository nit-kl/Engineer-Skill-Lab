import type { Rank } from './youtubeTypes';
import type { YoutubeContent } from './youtubeTypes';

export function YoutubeEntryPoint(props: { content: YoutubeContent; rank: Rank }) {
  const { content, rank } = props;
  const entry = content.rankToVideo[rank];

  if (!entry) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-700 text-sm leading-relaxed">
        このランクに紐づく動画は準備中です。
      </div>
    );
  }

  if (!entry.videoId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-700 text-sm leading-relaxed">
        YouTube 埋め込みは準備中です（動画ID未設定）。
        <div className="mt-2">
          <a className="text-pink-600 hover:underline" href={entry.url ?? '#'} target="_blank" rel="noreferrer">
            {entry.url ? '関連リンクを見る' : 'リンクなし'}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="font-bold text-gray-900 mb-3 text-base">結果→解説動画（YouTube）</div>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/5 border border-gray-100">
        <iframe
          title={`YouTube ${rank}`}
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${entry.videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {entry.chapters?.length ? (
        <div className="mt-3">
          <div className="text-sm text-gray-800 font-semibold mb-2">章立て</div>
          <div className="space-y-1">
            {entry.chapters.map(c => (
              <div key={c.start} className="text-sm text-gray-800 leading-relaxed">
                <span className="font-mono text-xs text-gray-600">{c.start}</span> {c.title}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

