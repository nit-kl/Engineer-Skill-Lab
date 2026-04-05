/** API設計ワークショップ — シナリオデータ（docs プロトタイプと同一） */

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof METHODS)[number];

export type EndpointAnswer = {
  method: HttpMethod;
  path: string[];
  status: string;
};

export type EndpointDef = {
  description: string;
  answer: EndpointAnswer;
  altAnswers?: EndpointAnswer[];
  hints: { method: string; path: string; status: string };
};

export type ScenarioChallenge = {
  id: number;
  title: string;
  scenario: string;
  difficulty: 1 | 2 | 3;
  icon: string;
  segments: string[];
  endpoints: EndpointDef[];
};

export const CHALLENGES: ScenarioChallenge[] = [
  {
    id: 1,
    title: 'メモ・ノートAPI',
    scenario:
      '社内用のシンプルなメモアプリを新規開発します。まずは「メモ」を中心にした基本的な REST API を設計してください。',
    difficulty: 1,
    icon: '📒',
    segments: ['notes', '{id}'],
    endpoints: [
      {
        description: 'メモ一覧を取得する',
        answer: { method: 'GET', path: ['notes'], status: '200' },
        hints: { method: 'データを読むだけのときは？', path: 'コレクション（複数形の名詞）', status: '成功したら？' },
      },
      {
        description: '新しいメモを作成する',
        answer: { method: 'POST', path: ['notes'], status: '201' },
        hints: { method: '新規リソースを生み出す', path: '同じコレクションに POST', status: 'リソースが作れた合図' },
      },
      {
        description: '1件のメモを全文置き換えて更新する',
        answer: { method: 'PUT', path: ['notes', '{id}'], status: '200' },
        altAnswers: [{ method: 'PATCH', path: ['notes', '{id}'], status: '200' }],
        hints: { method: '既存を更新する', path: 'どのメモかを URL で特定', status: '更新成功のとき' },
      },
      {
        description: 'メモを削除する',
        answer: { method: 'DELETE', path: ['notes', '{id}'], status: '204' },
        altAnswers: [{ method: 'DELETE', path: ['notes', '{id}'], status: '200' }],
        hints: { method: 'リソースを消す', path: '対象の ID をパスに', status: '本文が返らない成功' },
      },
    ],
  },
  {
    id: 2,
    title: 'レストラン予約API',
    scenario:
      '飲食店の予約サイトをリリースします。空き状況の確認から予約の作成、自分の予約一覧までを API で支えます。',
    difficulty: 2,
    icon: '🍽️',
    segments: ['availability', 'reservations', 'tables', 'me', 'users', '{id}'],
    endpoints: [
      {
        description: '指定日の空きテーブル状況を取得する',
        answer: { method: 'GET', path: ['availability'], status: '200' },
        altAnswers: [{ method: 'GET', path: ['tables', 'availability'], status: '200' }],
        hints: { method: '参照のみ', path: '空き状況を表すリソース名', status: '取得成功' },
      },
      {
        description: '新規に予約を作成する',
        answer: { method: 'POST', path: ['reservations'], status: '201' },
        hints: { method: '新しい予約リソース', path: '予約のコレクション', status: '作成完了' },
      },
      {
        description: 'ログイン中のユーザーの予約一覧を取得する',
        answer: { method: 'GET', path: ['me', 'reservations'], status: '200' },
        altAnswers: [
          { method: 'GET', path: ['users', 'me', 'reservations'], status: '200' },
          { method: 'GET', path: ['reservations'], status: '200' },
        ],
        hints: { method: '自分の一覧を見る', path: '「自分」を表すパス + 予約', status: '取得成功' },
      },
      {
        description: '特定の予約をキャンセルする',
        answer: { method: 'DELETE', path: ['reservations', '{id}'], status: '204' },
        altAnswers: [{ method: 'DELETE', path: ['reservations', '{id}'], status: '200' }],
        hints: { method: 'リソースを削除', path: 'どの予約かを ID で', status: '本文なしの成功が定番' },
      },
    ],
  },
  {
    id: 3,
    title: '動画配信API',
    scenario:
      '動画投稿・視聴サービスのバックエンドです。動画本体、いいね、コメント、チャンネル登録を REST で表現します。',
    difficulty: 2,
    icon: '🎬',
    segments: ['videos', 'comments', 'likes', 'channels', 'subscriptions', '{id}'],
    endpoints: [
      {
        description: '動画のメタ情報と再生用 URL を取得する',
        answer: { method: 'GET', path: ['videos', '{id}'], status: '200' },
        hints: { method: '1件取得', path: '動画 ID で特定', status: '取得成功' },
      },
      {
        description: '動画に「いいね」を付ける',
        answer: { method: 'POST', path: ['videos', '{id}', 'likes'], status: '201' },
        altAnswers: [{ method: 'PUT', path: ['videos', '{id}', 'likes'], status: '200' }],
        hints: { method: '新しい「いいね」リソース', path: '動画の子リソース', status: '作成されたとき' },
      },
      {
        description: '動画にコメントを投稿する',
        answer: { method: 'POST', path: ['videos', '{id}', 'comments'], status: '201' },
        hints: { method: 'コメントを新規作成', path: '動画配下の comments', status: '投稿完了' },
      },
      {
        description: 'チャンネルを登録（フォロー）する',
        answer: { method: 'POST', path: ['channels', '{id}', 'subscriptions'], status: '201' },
        altAnswers: [
          { method: 'POST', path: ['subscriptions'], status: '201' },
          { method: 'PUT', path: ['channels', '{id}', 'subscriptions'], status: '200' },
        ],
        hints: { method: '関係性を作る', path: 'チャンネルと購読（サブスク）', status: '登録できたら' },
      },
    ],
  },
  {
    id: 4,
    title: '物流・配送API',
    scenario:
      'EC の倉庫システムと配送キャリアをつなぐ API です。出荷指示・追跡・配送完了までを安全に表現してください。',
    difficulty: 3,
    icon: '📦',
    segments: ['shipments', 'tracking', 'events', 'deliveries', 'complete', '{id}'],
    endpoints: [
      {
        description: '出荷依頼（荷物）の一覧を取得する',
        answer: { method: 'GET', path: ['shipments'], status: '200' },
        hints: { method: '一覧参照', path: '出荷（shipments）', status: '取得成功' },
      },
      {
        description: '新しい出荷依頼を登録する',
        answer: { method: 'POST', path: ['shipments'], status: '201' },
        hints: { method: '新規リソース', path: '出荷コレクションへ POST', status: '登録完了' },
      },
      {
        description: '追跡番号で配送ステータスを取得する',
        answer: { method: 'GET', path: ['shipments', '{id}', 'tracking'], status: '200' },
        altAnswers: [{ method: 'GET', path: ['tracking', '{id}'], status: '200' }],
        hints: { method: '参照のみ', path: '荷物にぶら下がる追跡', status: '取得成功' },
      },
      {
        description: '配送完了イベントを記録する',
        answer: { method: 'POST', path: ['shipments', '{id}', 'events'], status: '201' },
        altAnswers: [{ method: 'POST', path: ['deliveries', '{id}', 'complete'], status: '201' }],
        hints: { method: '新しいイベント', path: '特定の出荷の下に events', status: '記録できたら' },
      },
      {
        description: '出荷依頼を取り消す（キャンセル）',
        answer: { method: 'DELETE', path: ['shipments', '{id}'], status: '204' },
        altAnswers: [{ method: 'DELETE', path: ['shipments', '{id}'], status: '200' }],
        hints: { method: 'リソース削除', path: '対象の shipment ID', status: '本文なし成功' },
      },
    ],
  },
  {
    id: 5,
    title: 'ヘルスケア記録API',
    scenario:
      'ウェアラブル連携の健康アプリです。日々の記録、医師との共有、同意（コンセント）管理を API で扱います。',
    difficulty: 3,
    icon: '🩺',
    segments: ['records', 'vitals', 'consents', 'sharing', 'providers', 'me', '{id}'],
    endpoints: [
      {
        description: '自分の健康記録一覧を取得する',
        answer: { method: 'GET', path: ['records'], status: '200' },
        altAnswers: [{ method: 'GET', path: ['me', 'records'], status: '200' }],
        hints: { method: '一覧取得', path: '記録のコレクション', status: '取得成功' },
      },
      {
        description: '新しいバイタル（心拍・歩数など）を記録する',
        answer: { method: 'POST', path: ['vitals'], status: '201' },
        altAnswers: [{ method: 'POST', path: ['records', 'vitals'], status: '201' }],
        hints: { method: '新規作成', path: 'バイタル計測データ', status: '作成完了' },
      },
      {
        description: '医療機関へのデータ共有の同意を更新する',
        answer: { method: 'PUT', path: ['consents', '{id}'], status: '200' },
        altAnswers: [{ method: 'PATCH', path: ['consents', '{id}'], status: '200' }],
        hints: { method: '既存リソースの更新', path: '同意リソースを ID で', status: '更新成功' },
      },
      {
        description: '共有先の医療機関一覧を取得する',
        answer: { method: 'GET', path: ['providers'], status: '200' },
        altAnswers: [{ method: 'GET', path: ['sharing', 'providers'], status: '200' }],
        hints: { method: '一覧参照', path: 'プロバイダ（医療機関）', status: '取得成功' },
      },
      {
        description: '特定の共有設定を取り消す',
        answer: { method: 'DELETE', path: ['sharing', '{id}'], status: '204' },
        altAnswers: [
          { method: 'DELETE', path: ['consents', '{id}'], status: '204' },
          { method: 'DELETE', path: ['sharing', '{id}'], status: '200' },
        ],
        hints: { method: 'リソース削除', path: '共有設定を特定', status: '本文なしの成功' },
      },
    ],
  },
];
