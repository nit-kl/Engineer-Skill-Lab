/** API設計ワークショップ — 問題データ（docs プロトタイプから移植） */

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof METHODS)[number];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#43A047',
  POST: '#F9A825',
  PUT: '#0078D4',
  PATCH: '#E65100',
  DELETE: '#D32F2F',
};

export const STATUS_CODES: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  301: 'Moved Permanently',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

export const CHAPTERS = [
  {
    id: 'methods',
    title: 'HTTPメソッド',
    emoji: '🚀',
    color: '#43A047',
    desc: '正しいHTTPメソッドとパスを選ぼう',
  },
  {
    id: 'status',
    title: 'ステータスコード',
    emoji: '🔢',
    color: '#0078D4',
    desc: '適切なレスポンスコードを学ぼう',
  },
  {
    id: 'naming',
    title: 'リソース設計',
    emoji: '📐',
    color: '#F9A825',
    desc: 'RESTfulなURL設計のベストプラクティス',
  },
  {
    id: 'structure',
    title: 'リクエスト/レスポンス',
    emoji: '📦',
    color: '#E65100',
    desc: 'JSON構造の設計パターンを身につけよう',
  },
  {
    id: 'advanced',
    title: '実践設計',
    emoji: '🏆',
    color: '#D32F2F',
    desc: '総合的なAPI設計力を試そう',
  },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]['id'];

export type PathOption = { path: string; correct: boolean; note?: string };

export type MethodPathChallenge = {
  id: number;
  chapter: ChapterId;
  title: string;
  difficulty: number;
  type: 'method_path';
  description: string;
  context?: string;
  methodAnswer: HttpMethod;
  pathOptions: PathOption[];
  explanation: string;
};

export type NamingFixChallenge = {
  id: number;
  chapter: ChapterId;
  title: string;
  difficulty: number;
  type: 'naming_fix';
  description: string;
  context?: string;
  badEndpoint: { method: HttpMethod | string; path: string };
  methodAnswer: HttpMethod;
  pathOptions: PathOption[];
  explanation: string;
};

export type StatusCodeChallenge = {
  id: number;
  chapter: ChapterId;
  title: string;
  difficulty: number;
  type: 'status_code';
  description: string;
  context?: string;
  options: number[];
  answer: number;
  explanation: string;
};

export type MultiChoiceOption = { label: string; correct: boolean };

export type MultiChoiceChallenge = {
  id: number;
  chapter: ChapterId;
  title: string;
  difficulty: number;
  type: 'multi_choice';
  description: string;
  context?: string;
  options: MultiChoiceOption[];
  explanation: string;
};

export type Challenge =
  | MethodPathChallenge
  | NamingFixChallenge
  | StatusCodeChallenge
  | MultiChoiceChallenge;

export const CHALLENGES: Challenge[] = [
  {
    id: 1,
    chapter: 'methods',
    title: 'ユーザー一覧の取得',
    difficulty: 1,
    type: 'method_path',
    description: '全ユーザーの一覧を取得するAPIエンドポイントを設計してください。',
    context: 'ユーザー管理システムのAPI。ユーザーリソースのコレクションを返すエンドポイントです。',
    methodAnswer: 'GET',
    pathOptions: [
      { path: '/users', correct: true },
      { path: '/getUsers', correct: false },
      { path: '/user/list', correct: false },
      { path: '/users/all', correct: false },
    ],
    explanation:
      'リソースの取得にはGETを使い、コレクション名は複数形（/users）にします。動詞（/getUsers）やアクション語（/list, /all）はURLに含めません。',
  },
  {
    id: 2,
    chapter: 'methods',
    title: '新規ユーザーの作成',
    difficulty: 1,
    type: 'method_path',
    description: '新しいユーザーを作成するAPIエンドポイントを設計してください。',
    context: 'リクエストボディにname, emailを含めてユーザーを新規登録します。',
    methodAnswer: 'POST',
    pathOptions: [
      { path: '/users', correct: true },
      { path: '/users/create', correct: false },
      { path: '/createUser', correct: false },
      { path: '/users/new', correct: false },
    ],
    explanation:
      '新規リソース作成にはPOSTを使います。パスはコレクション（/users）に対してPOSTし、create等の動詞はURLに含めません。',
  },
  {
    id: 3,
    chapter: 'methods',
    title: '特定ユーザーの取得',
    difficulty: 1,
    type: 'method_path',
    description: 'ID=42のユーザーの詳細情報を取得するエンドポイントを設計してください。',
    context: '個別リソースのURIにはリソースIDをパスパラメータとして含めます。',
    methodAnswer: 'GET',
    pathOptions: [
      { path: '/users/42', correct: true },
      { path: '/users?id=42', correct: false },
      { path: '/getUser/42', correct: false },
      { path: '/user/detail/42', correct: false },
    ],
    explanation:
      '個別リソースは /users/{id} のパスパラメータ形式で取得します。クエリパラメータ（?id=42）は一覧のフィルタ用です。',
  },
  {
    id: 4,
    chapter: 'methods',
    title: 'ユーザー情報の全更新',
    difficulty: 2,
    type: 'method_path',
    description:
      'ID=42のユーザーの情報を全項目まとめて更新（置き換え）するエンドポイントを設計してください。',
    context: 'リクエストボディに全フィールドを含めて、リソースを完全に置き換えます。部分更新ではありません。',
    methodAnswer: 'PUT',
    pathOptions: [
      { path: '/users/42', correct: true },
      { path: '/users/42/update', correct: false },
      { path: '/updateUser/42', correct: false },
      { path: '/users', correct: false },
    ],
    explanation:
      'リソースの完全な置き換えにはPUTを使います。PUTは冪等（何度実行しても同じ結果）です。PATCHとの違いを意識しましょう。',
  },
  {
    id: 5,
    chapter: 'methods',
    title: 'ユーザー情報の部分更新',
    difficulty: 2,
    type: 'method_path',
    description: 'ID=42のユーザーのメールアドレスだけを更新するエンドポイントを設計してください。',
    context: '全フィールドではなく、一部のフィールドのみを更新する「部分更新」です。',
    methodAnswer: 'PATCH',
    pathOptions: [
      { path: '/users/42', correct: true },
      { path: '/users/42/email', correct: false },
      { path: '/users/42/update', correct: false },
      { path: '/users/updateEmail/42', correct: false },
    ],
    explanation:
      '部分更新にはPATCHを使います。変更したいフィールドだけをリクエストボディに含めます。PUT（全置換）との使い分けが重要です。',
  },
  {
    id: 6,
    chapter: 'methods',
    title: 'ユーザーの削除',
    difficulty: 1,
    type: 'method_path',
    description: 'ID=42のユーザーを削除するエンドポイントを設計してください。',
    context: '指定したユーザーリソースを削除します。',
    methodAnswer: 'DELETE',
    pathOptions: [
      { path: '/users/42', correct: true },
      { path: '/users/42/delete', correct: false },
      { path: '/deleteUser/42', correct: false },
      { path: '/users/remove/42', correct: false },
    ],
    explanation:
      'リソースの削除にはDELETEを使い、削除対象は個別リソースのURI（/users/{id}）で指定します。動詞をURLに含める必要はありません。',
  },
  {
    id: 7,
    chapter: 'status',
    title: '正常取得',
    difficulty: 1,
    type: 'status_code',
    description:
      'GET /users/42 でユーザー情報の取得に成功した場合、どのステータスコードを返すべきですか？',
    context: 'リクエストされたリソースが正常に見つかり、レスポンスボディに含めて返します。',
    options: [200, 201, 204, 304],
    answer: 200,
    explanation: 'データを正常に取得・返却する場合は 200 OK を返します。',
  },
  {
    id: 8,
    chapter: 'status',
    title: 'リソース作成成功',
    difficulty: 1,
    type: 'status_code',
    description: 'POST /users で新規ユーザーの作成に成功した場合、どのステータスコードを返すべきですか？',
    context: 'リクエストが成功し、新しいリソースが作成されました。',
    options: [200, 201, 204, 301],
    answer: 201,
    explanation:
      '新しいリソースの作成成功時は 201 Created を返します。Locationヘッダーに新リソースのURIを含めるのがベストプラクティスです。',
  },
  {
    id: 9,
    chapter: 'status',
    title: '削除成功（本文なし）',
    difficulty: 2,
    type: 'status_code',
    description:
      'DELETE /users/42 でユーザーの削除に成功し、レスポンスボディを返さない場合のステータスコードは？',
    context: '削除処理は成功しましたが、返すべきデータはありません。',
    options: [200, 201, 204, 404],
    answer: 204,
    explanation: '処理成功でレスポンスボディが空の場合は 204 No Content を返します。',
  },
  {
    id: 10,
    chapter: 'status',
    title: '存在しないリソース',
    difficulty: 1,
    type: 'status_code',
    description:
      'GET /users/99999 でリクエストされたが、該当ユーザーが存在しない場合のステータスコードは？',
    context: '指定されたIDのリソースがデータベースに存在しません。',
    options: [400, 403, 404, 500],
    answer: 404,
    explanation: 'リクエストされたリソースが存在しない場合は 404 Not Found を返します。',
  },
  {
    id: 11,
    chapter: 'status',
    title: 'バリデーションエラー',
    difficulty: 2,
    type: 'status_code',
    description: 'POST /users でメールアドレスの形式が不正だった場合のステータスコードは？',
    context: 'リクエストの構文（JSON形式）は正しいが、ビジネスルール上処理できない内容です。',
    options: [400, 404, 409, 422],
    answer: 422,
    explanation:
      '構文は正しいがセマンティクスが不正な場合は 422 Unprocessable Entity を返します。400 Bad Request（構文エラー）との使い分けがポイントです。',
  },
  {
    id: 12,
    chapter: 'status',
    title: '認証エラー',
    difficulty: 2,
    type: 'status_code',
    description: '認証トークンが無効または未送信でAPIにアクセスした場合のステータスコードは？',
    context: '「あなたが誰かわからない」状態です。ログインが必要です。',
    options: [400, 401, 403, 404],
    answer: 401,
    explanation:
      '認証されていない（未ログイン・トークン無効）場合は 401 Unauthorized を返します。403 Forbidden（認証済みだが権限なし）と区別しましょう。',
  },
  {
    id: 13,
    chapter: 'status',
    title: '権限エラー',
    difficulty: 2,
    type: 'status_code',
    description: '一般ユーザーが管理者専用APIにアクセスした場合のステータスコードは？',
    context: '認証は成功している（誰かわかっている）が、このリソースにアクセスする権限がありません。',
    options: [400, 401, 403, 404],
    answer: 403,
    explanation:
      '認証済みだが認可されていない場合は 403 Forbidden を返します。401（認証失敗）との違いがポイントです。',
  },
  {
    id: 14,
    chapter: 'naming',
    title: '悪いURL：動詞を含むパス',
    difficulty: 1,
    type: 'naming_fix',
    description: '以下のエンドポイントはRESTfulではありません。正しく修正してください。',
    badEndpoint: { method: 'GET', path: '/getUsers' },
    methodAnswer: 'GET',
    pathOptions: [
      { path: '/users', correct: true },
      { path: '/getUsers', correct: false },
      { path: '/user/list', correct: false },
      { path: '/fetch/users', correct: false },
    ],
    explanation:
      'RESTでは動詞をURLに含めません。HTTPメソッド自体がアクション（GET=取得）を表現します。',
  },
  {
    id: 15,
    chapter: 'naming',
    title: '悪いURL：単数形＋動詞',
    difficulty: 1,
    type: 'naming_fix',
    description: '以下のエンドポイントはRESTfulではありません。正しく修正してください。',
    badEndpoint: { method: 'POST', path: '/user/create' },
    methodAnswer: 'POST',
    pathOptions: [
      { path: '/users', correct: true },
      { path: '/user/create', correct: false },
      { path: '/user', correct: false },
      { path: '/createUser', correct: false },
    ],
    explanation:
      'コレクション名は複数形（/users）にし、アクション（create）はHTTPメソッド（POST）で表現します。',
  },
  {
    id: 16,
    chapter: 'naming',
    title: '悪いURL：削除にGET',
    difficulty: 2,
    type: 'naming_fix',
    description: '以下のエンドポイントはRESTfulではありません。正しく修正してください。',
    badEndpoint: { method: 'GET', path: '/users/42/delete' },
    methodAnswer: 'DELETE',
    pathOptions: [
      { path: '/users/42', correct: true },
      { path: '/users/42/delete', correct: false },
      { path: '/users/delete/42', correct: false },
      { path: '/deleteUser/42', correct: false },
    ],
    explanation:
      '削除はDELETEメソッドで表現し、パスにdeleteなどの動詞を含めません。GETで状態を変更するのはREST原則に反します。',
  },
  {
    id: 17,
    chapter: 'naming',
    title: 'ネストされたリソース',
    difficulty: 2,
    type: 'method_path',
    description: 'ID=42のユーザーが投稿した記事（posts）の一覧を取得するエンドポイントを設計してください。',
    context: 'ユーザーに紐づく記事というサブリソースを扱います。親リソース/子リソースの関係をパスで表現します。',
    methodAnswer: 'GET',
    pathOptions: [
      { path: '/users/42/posts', correct: true },
      { path: '/posts?user_id=42', correct: false },
      { path: '/users/42?include=posts', correct: false },
      { path: '/getUserPosts/42', correct: false },
    ],
    explanation:
      '親リソース/子リソースの関係はネストしたパスで表現します：/users/{id}/posts。クエリパラメータでのフィルタも許容されますが、所属関係が明確ならネストが推奨です。',
  },
  {
    id: 18,
    chapter: 'naming',
    title: '検索・フィルタリング',
    difficulty: 2,
    type: 'multi_choice',
    description: '商品を価格帯でフィルタリングする場合、どのURL設計が最も適切ですか？',
    options: [
      { label: 'GET /products?min_price=1000&max_price=5000', correct: true },
      { label: 'GET /products/filter/price/1000/5000', correct: false },
      { label: 'POST /products/search { price_range: [1000, 5000] }', correct: false },
      { label: 'GET /searchProducts?minPrice=1000&maxPrice=5000', correct: false },
    ],
    explanation:
      'フィルタリングにはクエリパラメータを使います。GETリクエスト＋クエリ文字列が最もRESTfulです。パスに/filterを含めたり、POSTで検索するのは避けます。',
  },
  {
    id: 19,
    chapter: 'naming',
    title: 'ページネーション',
    difficulty: 2,
    type: 'multi_choice',
    description: '商品一覧のページネーションとして、最も適切なURL設計はどれですか？',
    options: [
      { label: 'GET /products?page=2&per_page=20', correct: true },
      { label: 'GET /products/page/2', correct: false },
      { label: 'POST /products/list { page: 2, per_page: 20 }', correct: false },
      { label: 'GET /products/2/20', correct: false },
    ],
    explanation:
      'ページネーションもクエリパラメータで表現します。page, per_page（またはlimit, offset）が一般的です。パスに含めると意味が不明確になります。',
  },
  {
    id: 20,
    chapter: 'structure',
    title: '作成レスポンスの設計',
    difficulty: 2,
    type: 'multi_choice',
    description: 'POST /users でユーザー作成成功時のレスポンスとして最も適切なものは？',
    options: [
      {
        label:
          '{ "id": 1, "name": "太郎", "email": "taro@example.com", "created_at": "..." }（作成されたリソース全体）',
        correct: true,
      },
      { label: '{ "success": true, "message": "ユーザーを作成しました" }', correct: false },
      { label: '{ "status": 201 }', correct: false },
      { label: '{ "user_id": 1 }（IDのみ）', correct: false },
    ],
    explanation:
      '作成したリソースの全体を返すのがベストプラクティスです。クライアントが追加のGETリクエストを送る必要がなくなり、効率的です。',
  },
  {
    id: 21,
    chapter: 'structure',
    title: 'エラーレスポンスの設計',
    difficulty: 2,
    type: 'multi_choice',
    description: 'バリデーションエラー時のレスポンス構造として最も適切なものは？',
    options: [
      {
        label:
          '{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [{ "field": "email", ... }] } }',
        correct: true,
      },
      { label: '{ "error": "メール形式が不正です" }（文字列のみ）', correct: false },
      { label: '{ "success": false, "errors": ["メール形式が不正です"] }', correct: false },
      { label: '{ "status": 422, "error": true }', correct: false },
    ],
    explanation:
      'エラーレスポンスには ①機械可読なエラーコード ②人が読めるメッセージ ③フィールドごとの詳細 を含めると、クライアントが適切にハンドリングできます。',
  },
  {
    id: 22,
    chapter: 'structure',
    title: '一覧レスポンスの設計',
    difficulty: 2,
    type: 'multi_choice',
    description: 'GET /products の一覧レスポンスとして最も適切な構造は？',
    options: [
      {
        label: '{ "data": [...], "pagination": { "total": 100, "page": 1, "per_page": 20 } }',
        correct: true,
      },
      { label: '[{ "id": 1, ... }, { "id": 2, ... }]（配列のみ）', correct: false },
      { label: '{ "products": [...], "count": 100 }', correct: false },
      { label: '{ "status": "ok", "result": [...] }', correct: false },
    ],
    explanation:
      '一覧は data（配列）＋ pagination（メタ情報）の構造が推奨です。トップレベルを配列にすると、後からメタ情報を追加できず拡張性が失われます。',
  },
  {
    id: 23,
    chapter: 'structure',
    title: '日時のフォーマット',
    difficulty: 1,
    type: 'multi_choice',
    description: 'APIレスポンスに日時を含める場合、推奨されるフォーマットはどれですか？',
    options: [
      { label: 'ISO 8601形式: "2026-03-28T10:30:00Z"', correct: true },
      { label: 'Unixタイムスタンプ: 1774886200', correct: false },
      { label: '"2026/03/28 10:30:00"', correct: false },
      { label: '"2026年3月28日 10時30分"', correct: false },
    ],
    explanation:
      '日時はISO 8601形式（RFC 3339）が国際標準です。タイムゾーンはUTC（末尾のZ）で返し、クライアント側でローカル時刻に変換するのがベストプラクティスです。',
  },
  {
    id: 24,
    chapter: 'structure',
    title: 'nullの扱い方',
    difficulty: 2,
    type: 'multi_choice',
    description:
      'ユーザーの「自己紹介」フィールドが未設定の場合、JSONレスポンスでの表現として最も適切なのは？',
    options: [
      { label: '{ "bio": null }（フィールドを含めてnullで返す）', correct: true },
      { label: '{ }（フィールド自体を省略する）', correct: false },
      { label: '{ "bio": "" }（空文字にする）', correct: false },
      { label: '{ "bio": "未設定" }（文字列で表現する）', correct: false },
    ],
    explanation:
      '未設定は null で返すのが最も意図が明確です。フィールド省略はクライアント側で「存在しない」のか「未設定」なのか区別がつかず、空文字は「空の値を設定した」と混同されます。',
  },
  {
    id: 25,
    chapter: 'advanced',
    title: 'お気に入り商品の追加',
    difficulty: 2,
    type: 'method_path',
    description: 'ID=42のユーザーのお気に入りに商品を追加するエンドポイントを設計してください。',
    context: 'ユーザー → お気に入り（favorites）という関係。リクエストボディに商品IDを含めて追加します。',
    methodAnswer: 'POST',
    pathOptions: [
      { path: '/users/42/favorites', correct: true },
      { path: '/favorites/add', correct: false },
      { path: '/users/42/addFavorite', correct: false },
      { path: '/products/7/favorite', correct: false },
    ],
    explanation:
      'サブリソースへの追加はPOST /users/{id}/favoritesにリクエストボディで商品IDを送ります。ユーザーが主体なので、ユーザーのサブリソースとして設計します。',
  },
  {
    id: 26,
    chapter: 'advanced',
    title: '注文のキャンセル',
    difficulty: 3,
    type: 'multi_choice',
    description: 'ECサイトの注文APIとして、注文のキャンセルを実現する最も適切な設計はどれですか？',
    options: [
      { label: 'PATCH /orders/{id} に { "status": "cancelled" } を送る', correct: true },
      { label: 'DELETE /orders/{id}（注文を削除する）', correct: false },
      { label: 'POST /orders/{id}/cancel', correct: false },
      { label: 'PUT /orders/{id}/status に { "value": "cancelled" }', correct: false },
    ],
    explanation:
      '注文キャンセルはリソースの「状態変更」なので PATCH が最適です。DELETEはリソースの物理削除を意味し、注文履歴が消えてしまいます。POST /cancel も実務では使われますが、REST原則としてはPATCHがベターです。',
  },
  {
    id: 27,
    chapter: 'advanced',
    title: '一括操作のAPI設計',
    difficulty: 3,
    type: 'multi_choice',
    description: '複数の商品を一括で削除する場合、最も適切なAPI設計はどれですか？',
    options: [
      { label: 'DELETE /products に { "ids": [1, 2, 3] } をボディで送る', correct: true },
      { label: 'DELETE /products/1,2,3（カンマ区切りでIDを並べる）', correct: false },
      { label: 'POST /products/bulk-delete に { "ids": [1, 2, 3] }', correct: false },
      { label: '各IDに対して DELETE /products/{id} を個別に3回呼ぶ', correct: false },
    ],
    explanation:
      '一括削除はコレクションに対するDELETEリクエストにボディでIDリストを送るのが最もRESTfulです。個別に3回呼ぶのは非効率で、カンマ区切りはURLの仕様上問題が生じることがあります。',
  },
  {
    id: 28,
    chapter: 'advanced',
    title: 'APIバージョニング',
    difficulty: 2,
    type: 'multi_choice',
    description: 'APIのバージョニング方法として、最も広く採用されているのはどれですか？',
    options: [
      { label: 'URLパス: /v1/users, /v2/users', correct: true },
      { label: 'カスタムヘッダー: X-API-Version: 2', correct: false },
      { label: 'クエリパラメータ: /users?version=2', correct: false },
      { label: 'Acceptヘッダー: application/vnd.api.v2+json', correct: false },
    ],
    explanation:
      'URLパスにバージョンを含める方式が最も一般的で、直感的かつデバッグしやすいです。ヘッダー方式は理論的には美しいですが、ブラウザでテストしづらく実務では少数派です。',
  },
  {
    id: 29,
    chapter: 'advanced',
    title: 'アカウントの無効化',
    difficulty: 3,
    type: 'method_path',
    description: 'ID=42のユーザーのアカウントを無効化（deactivate）するエンドポイントを設計してください。',
    context:
      'CRUDに収まらない「アクション」的な操作です。状態フィールドの更新として設計するのが最もRESTfulです。',
    methodAnswer: 'PATCH',
    pathOptions: [
      { path: '/users/42', correct: true, note: 'ボディ: { "status": "inactive" }' },
      { path: '/users/42/deactivate', correct: false },
      { path: '/users/deactivate/42', correct: false },
      { path: '/deactivateUser/42', correct: false },
    ],
    explanation:
      'PATCH /users/{id} に { "status": "inactive" } を送るのが最もRESTfulです。アクション的なURLも実務では見られますが、本質は「ステータスフィールドの更新」なのでPATCHが適切です。',
  },
  {
    id: 30,
    chapter: 'advanced',
    title: '冪等性の理解',
    difficulty: 3,
    type: 'multi_choice',
    description: '以下のHTTPメソッドのうち、冪等（何度実行しても結果が同じ）でないものはどれですか？',
    options: [
      { label: 'POST — 同じリクエストで複数のリソースが作られる', correct: true },
      { label: 'GET — 何度取得しても同じ結果', correct: false },
      { label: 'PUT — 何度置き換えても同じ結果', correct: false },
      { label: 'DELETE — 何度削除しても結果は同じ', correct: false },
    ],
    explanation:
      'POSTは冪等ではありません。同じリクエストを2回送ると2つのリソースが作成されます。GET/PUT/DELETEは冪等（同じリクエストを繰り返しても結果は同じ）です。APIの信頼性設計で重要な概念です。',
  },
];

export function getRank(score: number) {
  if (score >= 90) return { rank: 'S', color: '#FF6B9D', bg: '#FFF0F5', emoji: '🏆' };
  if (score >= 70) return { rank: 'A', color: '#F9A825', bg: '#FFF8E1', emoji: '🌟' };
  if (score >= 50) return { rank: 'B', color: '#43A047', bg: '#E8F5E9', emoji: '👍' };
  if (score >= 30) return { rank: 'C', color: '#0078D4', bg: '#E3F2FD', emoji: '💪' };
  return { rank: 'D', color: '#9E9E9E', bg: '#F5F5F5', emoji: '📝' };
}
