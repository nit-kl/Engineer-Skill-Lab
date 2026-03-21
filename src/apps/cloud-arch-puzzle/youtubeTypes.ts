export type Rank = 'S' | 'A' | 'B' | 'C' | 'D';

export type YoutubeChapter = {
  title: string;
  start: string; // e.g. "0:00"
};

export type YoutubeEntry = {
  videoId: string;
  url?: string;
  chapters?: YoutubeChapter[];
};

export type YoutubeRankMap = Record<Rank, YoutubeEntry | undefined>;

export type YoutubeContent = {
  rankToVideo: YoutubeRankMap;
  /** チャレンジ（レッスン）IDごとの上書き。キーは数値IDの文字列（例: "1"）。 */
  byChallengeId?: Record<string, { rankToVideo: YoutubeRankMap }>;
};

