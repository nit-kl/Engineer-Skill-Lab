type YoutubeEntry = {
  videoId: string;
  url?: string;
  chapters?: Array<{ start: string; title: string }>;
};

export default function YoutubeEntryPoint(props: { content: { default?: YoutubeEntry }; mode?: 'default' }) {
  const entry = props.content.default;

  if (!entry) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600 text-sm">
        YouTube情報は準備中です。
      </div>
    );
  }

  if (!entry.videoId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-600 text-sm">
        YouTube埋め込みは準備中（動画ID未設定）です。
        {entry.url ? (
          <div className="mt-2">
            <a className="text-pink-600 hover:underline" href={entry.url} target="_blank" rel="noreferrer">
              関連リンクを見る
            </a>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="font-bold text-gray-800 mb-3">結果→解説（YouTube）</div>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black/5 border border-gray-100">
        <iframe
          title="YouTube"
          className="w-full h-full"
          src={`https://www.youtube.com/embed/${entry.videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

