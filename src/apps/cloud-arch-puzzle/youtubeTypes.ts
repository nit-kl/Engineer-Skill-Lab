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

export type YoutubeContent = {
  rankToVideo: Record<Rank, YoutubeEntry | undefined>;
};

