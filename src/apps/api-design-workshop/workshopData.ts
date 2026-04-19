/** API設計ワークショップ — シナリオ（メソッド・URL・ステータスに加え、認証・ヘッダー・入出力ボディを扱う） */

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof METHODS)[number];

/** 公開 API か、Bearer 等でユーザー特定するか */
export const AUTH_LEVELS = ['public', 'bearer'] as const;
export type AuthLevel = (typeof AUTH_LEVELS)[number];

/** リクエスト／レスポンスの本文の有無（JSON API を前提） */
export const BODY_PRESENCE = ['none', 'json'] as const;
export type BodyPresence = (typeof BODY_PRESENCE)[number];

/**
 * 代表的な HTTP ヘッダー（学習用の組み合わせ）
 * - accept: 取得したい表現（多くは Accept: application/json）
 * - contentType: リクエストボディの形式（Content-Type: application/json）
 * - authorization: アクセストークン等（Authorization: Bearer ...）
 */
export const HEADER_PARTS = ['accept', 'contentType', 'authorization'] as const;
export type HeaderPart = (typeof HEADER_PARTS)[number];

export function sortHeaderParts(parts: HeaderPart[]): HeaderPart[] {
  return [...parts].sort((a, b) => HEADER_PARTS.indexOf(a) - HEADER_PARTS.indexOf(b));
}

export type EndpointAspects = {
  auth: AuthLevel;
  requestBody: BodyPresence;
  responseBody: BodyPresence;
  /** 並びは sortHeaderParts で正規化して比較する */
  headers: HeaderPart[];
};

export type EndpointAnswer = EndpointAspects & {
  method: HttpMethod;
  path: string[];
  status: string;
};

export type EndpointHints = {
  method: string;
  path: string;
  status: string;
  auth: string;
  requestBody: string;
  responseBody: string;
  headers: string;
};

export type EndpointDef = {
  description: string;
  answer: EndpointAnswer;
  altAnswers?: EndpointAnswer[];
  hints: EndpointHints;
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

const H = {
  authBearer: 'ログイン済みユーザー前提なら Bearer 等で本人確認',
  authPublic: '誰でも閲覧できる公開情報なら認証不要でもよい',
  reqNone: 'GET の多くや 204 相当ではリクエスト本文は送らない',
  reqJson: 'POST/PUT/PATCH では JSON 本文を Content-Type とセットで送る',
  resNone: '204 No Content はレスポンス本文なしが典型',
  resJson: '200/201 では JSON で表現を返すことが多い',
  hdrRead: 'JSON を受け取りたい GET では Accept: application/json を付ける例が多い',
  hdrWrite: 'JSON ボディを送るときは Content-Type: application/json',
  hdrAuth: '保護リソースへは Authorization（Bearer 等）を付ける',
  hdrReadAuth: '認証付き GET では Accept と Authorization を組み合わせる例が多い',
  hdrWriteAuth: '認証付きで JSON を書くときは Content-Type と Authorization',
  hdrDel: '本文なし DELETE では Authorization だけ、という構成もよくある',
} as const;

export const CHALLENGES: ScenarioChallenge[] = [
  {
    id: 1,
    title: 'メモ・ノートAPI',
    scenario:
      '社内用のシンプルなメモアプリを新規開発します。利用者はログイン済みとし、メモの CRUD とあわせて「誰向けの API か」「どのヘッダーで形式と認証を伝えるか」「ボディの有無」まで意識した REST API を設計してください。',
    difficulty: 1,
    icon: '📒',
    segments: ['notes', '{id}'],
    endpoints: [
      {
        description: 'メモ一覧を取得する',
        answer: {
          method: 'GET',
          path: ['notes'],
          status: '200',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept', 'authorization']),
        },
        hints: {
          method: 'データを読むだけのときは？',
          path: 'コレクション（複数形の名詞）',
          status: '成功したら？',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrReadAuth,
        },
      },
      {
        description: '新しいメモを作成する',
        answer: {
          method: 'POST',
          path: ['notes'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        hints: {
          method: '新規リソースを生み出す',
          path: '同じコレクションに POST',
          status: 'リソースが作れた合図',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: '1件のメモを全文置き換えて更新する',
        answer: {
          method: 'PUT',
          path: ['notes', '{id}'],
          status: '200',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        altAnswers: [
          {
            method: 'PATCH',
            path: ['notes', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
        ],
        hints: {
          method: '既存を更新する',
          path: 'どのメモかを URL で特定',
          status: '更新成功のとき',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: 'メモを削除する',
        answer: {
          method: 'DELETE',
          path: ['notes', '{id}'],
          status: '204',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'none',
          headers: sortHeaderParts(['authorization']),
        },
        altAnswers: [
          {
            method: 'DELETE',
            path: ['notes', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['authorization']),
          },
        ],
        hints: {
          method: 'リソースを消す',
          path: '対象の ID をパスに',
          status: '本文が返らない成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resNone,
          headers: H.hdrDel,
        },
      },
    ],
  },
  {
    id: 2,
    title: 'レストラン予約API',
    scenario:
      '飲食店の予約サイトをリリースします。空き状況の閲覧はゲストでも可能にしつつ、予約の作成や自分の予約一覧は認証が必要、という前提で API を考えます。',
    difficulty: 2,
    icon: '🍽️',
    segments: ['availability', 'reservations', 'tables', 'me', 'users', '{id}'],
    endpoints: [
      {
        description: '指定日の空きテーブル状況を取得する',
        answer: {
          method: 'GET',
          path: ['availability'],
          status: '200',
          auth: 'public',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept']),
        },
        altAnswers: [
          {
            method: 'GET',
            path: ['tables', 'availability'],
            status: '200',
            auth: 'public',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['accept']),
          },
        ],
        hints: {
          method: '参照のみ',
          path: '空き状況を表すリソース名',
          status: '取得成功',
          auth: H.authPublic,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrRead,
        },
      },
      {
        description: '新規に予約を作成する',
        answer: {
          method: 'POST',
          path: ['reservations'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        hints: {
          method: '新しい予約リソース',
          path: '予約のコレクション',
          status: '作成完了',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: 'ログイン中のユーザーの予約一覧を取得する',
        answer: {
          method: 'GET',
          path: ['me', 'reservations'],
          status: '200',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept', 'authorization']),
        },
        altAnswers: [
          {
            method: 'GET',
            path: ['users', 'me', 'reservations'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['accept', 'authorization']),
          },
          {
            method: 'GET',
            path: ['reservations'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['accept', 'authorization']),
          },
        ],
        hints: {
          method: '自分の一覧を見る',
          path: '「自分」を表すパス + 予約',
          status: '取得成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrReadAuth,
        },
      },
      {
        description: '特定の予約をキャンセルする',
        answer: {
          method: 'DELETE',
          path: ['reservations', '{id}'],
          status: '204',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'none',
          headers: sortHeaderParts(['authorization']),
        },
        altAnswers: [
          {
            method: 'DELETE',
            path: ['reservations', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['authorization']),
          },
        ],
        hints: {
          method: 'リソースを削除',
          path: 'どの予約かを ID で',
          status: '本文なしの成功が定番',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resNone,
          headers: H.hdrDel,
        },
      },
    ],
  },
  {
    id: 3,
    title: '動画配信API',
    scenario:
      '動画投稿・視聴サービスのバックエンドです。視聴や一覧は広く公開しつつ、いいね・コメント・チャンネル登録などはアカウントが必要、という前提で設計します。',
    difficulty: 2,
    icon: '🎬',
    segments: ['videos', 'comments', 'likes', 'channels', 'subscriptions', '{id}'],
    endpoints: [
      {
        description: '動画のメタ情報と再生用 URL を取得する',
        answer: {
          method: 'GET',
          path: ['videos', '{id}'],
          status: '200',
          auth: 'public',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept']),
        },
        hints: {
          method: '1件取得',
          path: '動画 ID で特定',
          status: '取得成功',
          auth: H.authPublic,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrRead,
        },
      },
      {
        description: '動画に「いいね」を付ける',
        answer: {
          method: 'POST',
          path: ['videos', '{id}', 'likes'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        altAnswers: [
          {
            method: 'PUT',
            path: ['videos', '{id}', 'likes'],
            status: '200',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
        ],
        hints: {
          method: '新しい「いいね」リソース',
          path: '動画の子リソース',
          status: '作成されたとき',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: '動画にコメントを投稿する',
        answer: {
          method: 'POST',
          path: ['videos', '{id}', 'comments'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        hints: {
          method: 'コメントを新規作成',
          path: '動画配下の comments',
          status: '投稿完了',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: 'チャンネルを登録（フォロー）する',
        answer: {
          method: 'POST',
          path: ['channels', '{id}', 'subscriptions'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        altAnswers: [
          {
            method: 'POST',
            path: ['subscriptions'],
            status: '201',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
          {
            method: 'PUT',
            path: ['channels', '{id}', 'subscriptions'],
            status: '200',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
        ],
        hints: {
          method: '関係性を作る',
          path: 'チャンネルと購読（サブスク）',
          status: '登録できたら',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
    ],
  },
  {
    id: 4,
    title: '物流・配送API',
    scenario:
      'EC の倉庫システムと配送キャリアをつなぐ API です。出荷・追跡・イベント記録は関係者のみが呼び出せる想定で、認証ヘッダーと JSON ボディの使い分けを整理します。',
    difficulty: 3,
    icon: '📦',
    segments: ['shipments', 'tracking', 'events', 'deliveries', 'complete', '{id}'],
    endpoints: [
      {
        description: '出荷依頼（荷物）の一覧を取得する',
        answer: {
          method: 'GET',
          path: ['shipments'],
          status: '200',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept', 'authorization']),
        },
        hints: {
          method: '一覧参照',
          path: '出荷（shipments）',
          status: '取得成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrReadAuth,
        },
      },
      {
        description: '新しい出荷依頼を登録する',
        answer: {
          method: 'POST',
          path: ['shipments'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        hints: {
          method: '新規リソース',
          path: '出荷コレクションへ POST',
          status: '登録完了',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: '追跡番号で配送ステータスを取得する',
        answer: {
          method: 'GET',
          path: ['shipments', '{id}', 'tracking'],
          status: '200',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept', 'authorization']),
        },
        altAnswers: [
          {
            method: 'GET',
            path: ['tracking', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['accept', 'authorization']),
          },
        ],
        hints: {
          method: '参照のみ',
          path: '荷物にぶら下がる追跡',
          status: '取得成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrReadAuth,
        },
      },
      {
        description: '配送完了イベントを記録する',
        answer: {
          method: 'POST',
          path: ['shipments', '{id}', 'events'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        altAnswers: [
          {
            method: 'POST',
            path: ['deliveries', '{id}', 'complete'],
            status: '201',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
        ],
        hints: {
          method: '新しいイベント',
          path: '特定の出荷の下に events',
          status: '記録できたら',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: '出荷依頼を取り消す（キャンセル）',
        answer: {
          method: 'DELETE',
          path: ['shipments', '{id}'],
          status: '204',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'none',
          headers: sortHeaderParts(['authorization']),
        },
        altAnswers: [
          {
            method: 'DELETE',
            path: ['shipments', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['authorization']),
          },
        ],
        hints: {
          method: 'リソース削除',
          path: '対象の shipment ID',
          status: '本文なし成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resNone,
          headers: H.hdrDel,
        },
      },
    ],
  },
  {
    id: 5,
    title: 'ヘルスケア記録API',
    scenario:
      'ウェアラブル連携の健康アプリです。個人の健康データを扱うため、全エンドポイントで本人確認（Bearer 等）を前提に、データの入力・取得・削除のボディの有無を区別して設計します。',
    difficulty: 3,
    icon: '🩺',
    segments: ['records', 'vitals', 'consents', 'sharing', 'providers', 'me', '{id}'],
    endpoints: [
      {
        description: '自分の健康記録一覧を取得する',
        answer: {
          method: 'GET',
          path: ['records'],
          status: '200',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept', 'authorization']),
        },
        altAnswers: [
          {
            method: 'GET',
            path: ['me', 'records'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['accept', 'authorization']),
          },
        ],
        hints: {
          method: '一覧取得',
          path: '記録のコレクション',
          status: '取得成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrReadAuth,
        },
      },
      {
        description: '新しいバイタル（心拍・歩数など）を記録する',
        answer: {
          method: 'POST',
          path: ['vitals'],
          status: '201',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        altAnswers: [
          {
            method: 'POST',
            path: ['records', 'vitals'],
            status: '201',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
        ],
        hints: {
          method: '新規作成',
          path: 'バイタル計測データ',
          status: '作成完了',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: '医療機関へのデータ共有の同意を更新する',
        answer: {
          method: 'PUT',
          path: ['consents', '{id}'],
          status: '200',
          auth: 'bearer',
          requestBody: 'json',
          responseBody: 'json',
          headers: sortHeaderParts(['contentType', 'authorization']),
        },
        altAnswers: [
          {
            method: 'PATCH',
            path: ['consents', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'json',
            responseBody: 'json',
            headers: sortHeaderParts(['contentType', 'authorization']),
          },
        ],
        hints: {
          method: '既存リソースの更新',
          path: '同意リソースを ID で',
          status: '更新成功',
          auth: H.authBearer,
          requestBody: H.reqJson,
          responseBody: H.resJson,
          headers: H.hdrWriteAuth,
        },
      },
      {
        description: '共有先の医療機関一覧を取得する',
        answer: {
          method: 'GET',
          path: ['providers'],
          status: '200',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'json',
          headers: sortHeaderParts(['accept', 'authorization']),
        },
        altAnswers: [
          {
            method: 'GET',
            path: ['sharing', 'providers'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['accept', 'authorization']),
          },
        ],
        hints: {
          method: '一覧参照',
          path: 'プロバイダ（医療機関）',
          status: '取得成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resJson,
          headers: H.hdrReadAuth,
        },
      },
      {
        description: '特定の共有設定を取り消す',
        answer: {
          method: 'DELETE',
          path: ['sharing', '{id}'],
          status: '204',
          auth: 'bearer',
          requestBody: 'none',
          responseBody: 'none',
          headers: sortHeaderParts(['authorization']),
        },
        altAnswers: [
          {
            method: 'DELETE',
            path: ['consents', '{id}'],
            status: '204',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'none',
            headers: sortHeaderParts(['authorization']),
          },
          {
            method: 'DELETE',
            path: ['sharing', '{id}'],
            status: '200',
            auth: 'bearer',
            requestBody: 'none',
            responseBody: 'json',
            headers: sortHeaderParts(['authorization']),
          },
        ],
        hints: {
          method: 'リソース削除',
          path: '共有設定を特定',
          status: '本文なしの成功',
          auth: H.authBearer,
          requestBody: H.reqNone,
          responseBody: H.resNone,
          headers: H.hdrDel,
        },
      },
    ],
  },
];
