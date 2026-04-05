/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 教育用の「意図的に脆弱なコード」サンプルです。本番やコピペ利用は禁止。
 * 問題追加・文言修正はこのファイルのみを編集すると差分が追いやすいです。
 */

import type { VulnChallenge } from './types';

export const CHALLENGES: readonly VulnChallenge[] = [
  {
    id: 1,
    title: 'ログインフォームの罠',
    category: 'SQL Injection',
    difficulty: 1,
    description:
      'このログイン処理には致命的な脆弱性が潜んでいます。攻撃者がパスワードなしでログインできる原因を見つけてください。',
    code: `app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = \`SELECT * FROM users
    WHERE username = '\${username}'
    AND password = '\${password}'\`;
  db.query(query, (err, results) => {
    if (results.length > 0) {
      res.json({ success: true, token: generateToken(results[0]) });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});`,
    vulnerableLines: [2, 3, 4],
    hints: [
      'ユーザー入力がそのままクエリに埋め込まれていませんか？',
      "' OR '1'='1 のような入力を想像してみてください",
      'プリペアドステートメントを使うべき場所です',
    ],
    explanation:
      "ユーザー入力を直接SQL文に結合しているため、SQLインジェクション攻撃が可能です。攻撃者は username に `' OR '1'='1' --` と入力することで、認証をバイパスできます。対策としては、プリペアドステートメント（パラメータ化クエリ）を使用してください。",
    fixedCode: `app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (results.length > 0) {
      res.json({ success: true, token: generateToken(results[0]) });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });
});`,
  },
  {
    id: 2,
    title: '掲示板のコメント欄',
    category: 'XSS',
    difficulty: 1,
    description:
      'このコメント表示機能には、攻撃者がユーザーのブラウザ上でスクリプトを実行できる脆弱性があります。',
    code: `app.get('/comments', async (req, res) => {
  const comments = await db.getComments();
  let html = '<div class="comments">';
  for (const comment of comments) {
    html += \`<div class="comment">
      <strong>\${comment.author}</strong>
      <p>\${comment.body}</p>
      <span>\${comment.date}</span>
    </div>\`;
  }
  html += '</div>';
  res.send(html);
});`,
    vulnerableLines: [5, 6],
    hints: [
      'comment.body にHTMLタグが含まれていたらどうなりますか？',
      "<script>alert('XSS')</script> が投稿された場合を考えてみてください",
      'HTMLエスケープ処理が必要です',
    ],
    explanation:
      'ユーザーが投稿したコメント内容（comment.author, comment.body）をエスケープせずにHTMLに直接挿入しているため、格納型XSS（Stored XSS）攻撃が可能です。攻撃者が `<script>` タグを含むコメントを投稿すると、他のユーザーのブラウザでスクリプトが実行されます。',
    fixedCode: `const escapeHtml = (str) => str
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

app.get('/comments', async (req, res) => {
  const comments = await db.getComments();
  let html = '<div class="comments">';
  for (const comment of comments) {
    html += \`<div class="comment">
      <strong>\${escapeHtml(comment.author)}</strong>
      <p>\${escapeHtml(comment.body)}</p>
      <span>\${escapeHtml(comment.date)}</span>
    </div>\`;
  }
  html += '</div>';
  res.send(html);
});`,
  },
  {
    id: 3,
    title: 'パスワードリセットの落とし穴',
    category: 'Broken Auth',
    difficulty: 2,
    description:
      'このパスワードリセット機能には、他人のパスワードを変更できてしまう重大な認証の欠陥があります。',
    code: `app.post('/reset-password', (req, res) => {
  const { email, newPassword } = req.body;
  const token = req.query.token;

  // トークンの検証
  const resetRecord = db.findResetToken(token);
  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // パスワードを更新
  db.updatePassword(email, newPassword);
  db.deleteResetToken(token);
  res.json({ success: true });
});`,
    vulnerableLines: [1, 10, 11],
    hints: [
      'トークンとメールアドレスの関連性を確認していますか？',
      'トークンは有効でも、別人のメールアドレスを指定できませんか？',
      'resetRecord.email と req.body.email の一致確認が必要です',
    ],
    explanation:
      'トークンの有効性は確認していますが、トークンに紐づくメールアドレスとリクエストのメールアドレスが一致するかを確認していません。攻撃者は有効なトークンを入手した上で、別のユーザーのメールアドレスを指定してパスワードを変更できます。',
    fixedCode: `app.post('/reset-password', (req, res) => {
  const { newPassword } = req.body;
  const token = req.query.token;

  const resetRecord = db.findResetToken(token);
  if (!resetRecord) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  // トークンに紐づくemailのみ更新可能
  db.updatePassword(resetRecord.email, newPassword);
  db.deleteResetToken(token);
  res.json({ success: true });
});`,
  },
  {
    id: 4,
    title: 'ファイルアップロード機能',
    category: 'Path Traversal',
    difficulty: 2,
    description:
      'このファイルアップロード処理には、サーバー上の任意のファイルを上書きできてしまう脆弱性が潜んでいます。',
    code: `app.post('/upload', (req, res) => {
  const file = req.files.document;
  const fileName = file.name;
  const uploadPath = \`./uploads/\${fileName}\`;

  file.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Upload failed' });
    }
    res.json({
      success: true,
      path: uploadPath
    });
  });
});`,
    vulnerableLines: [2, 3],
    hints: [
      'ファイル名に `../` が含まれていたらどうなりますか？',
      '`../../etc/passwd` のようなファイル名を想像してください',
      'path.basename() でファイル名をサニタイズしましょう',
    ],
    explanation:
      'ユーザーが送信したファイル名をそのままパスに使用しているため、パストラバーサル攻撃が可能です。攻撃者は `../../../etc/crontab` のようなファイル名を送信して、サーバー上の任意の場所にファイルを書き込むことができます。',
    fixedCode: `const path = require('path');

app.post('/upload', (req, res) => {
  const file = req.files.document;
  const safeName = path.basename(file.name);
  const uploadPath = path.join('./uploads', safeName);

  // uploadsディレクトリ外への書き込みを防止
  if (!uploadPath.startsWith(path.resolve('./uploads'))) {
    return res.status(400).json({ error: 'Invalid file name' });
  }

  file.mv(uploadPath, (err) => {
    if (err) return res.status(500).json({ error: 'Upload failed' });
    res.json({ success: true, path: safeName });
  });
});`,
  },
  {
    id: 5,
    title: 'APIレート制限の抜け穴',
    category: 'Rate Limiting',
    difficulty: 2,
    description:
      'このレート制限の実装にはバイパス可能な重大な欠陥があります。攻撃者がブルートフォース攻撃を実行できる原因を特定してください。',
    code: `const rateLimit = {};

app.use('/api/login', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']
    || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimit[ip]) {
    rateLimit[ip] = { count: 0, resetTime: now + 60000 };
  }

  if (now > rateLimit[ip].resetTime) {
    rateLimit[ip] = { count: 0, resetTime: now + 60000 };
  }

  rateLimit[ip].count++;

  if (rateLimit[ip].count > 10) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
});`,
    vulnerableLines: [3, 4],
    hints: [
      'X-Forwarded-For ヘッダーは誰が設定できますか？',
      '攻撃者がこのヘッダーを偽装できませんか？',
      '信頼できるプロキシからのヘッダーのみ使用すべきです',
    ],
    explanation:
      'X-Forwarded-For ヘッダーはクライアントが自由に設定できるため、攻撃者はリクエストごとに異なるIPアドレスを偽装することで、レート制限を完全にバイパスできます。信頼できるリバースプロキシ経由でのみこのヘッダーを参照するか、`req.ip`（Express の trust proxy 設定）を使用してください。',
    fixedCode: `const rateLimit = require('express-rate-limit');

// trust proxy を適切に設定
app.set('trust proxy', 1);

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // アカウント単位のレート制限も追加
  keyGenerator: (req) => {
    return req.ip + ':' + (req.body.username || 'unknown');
  },
});

app.use('/api/login', loginLimiter);`,
  },
  {
    id: 6,
    title: 'JWT認証の実装ミス',
    category: 'JWT Vuln',
    difficulty: 3,
    description:
      'このJWT検証ロジックには、トークンを偽造できてしまう致命的な脆弱性があります。',
    code: `const jwt = require('jsonwebtoken');

app.use('/api/admin', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256', 'none']
    });

    if (decoded.role === 'admin') {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({ error: 'Not admin' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});`,
    vulnerableLines: [9, 10],
    hints: [
      'algorithms 配列に注目してください',
      "'none' アルゴリズムは何を意味しますか？",
      "アルゴリズム 'none' は署名なしのトークンを許可します",
    ],
    explanation:
      "JWT の検証時に `algorithms: ['HS256', 'none']` と指定しているため、攻撃者は署名なし（alg: none）のトークンを作成してadmin権限を偽装できます。`none` アルゴリズムは本番環境では絶対に許可してはいけません。",
    fixedCode: `const jwt = require('jsonwebtoken');

app.use('/api/admin', (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    // 'none' を絶対に許可しない
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    if (decoded.role === 'admin') {
      req.user = decoded;
      next();
    } else {
      res.status(403).json({ error: 'Not admin' });
    }
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});`,
  },
  {
    id: 7,
    title: 'NoSQLの見落とし',
    category: 'NoSQL Injection',
    difficulty: 3,
    description:
      'MongoDB を使ったこの検索APIには、オペレータインジェクションの脆弱性が存在します。',
    code: `app.post('/api/users/search', async (req, res) => {
  const { username, role } = req.body;

  const users = await db.collection('users').find({
    username: username,
    role: role,
    isActive: true
  }).toArray();

  res.json(users.map(u => ({
    id: u._id,
    username: u.username,
    role: u.role
  })));
});`,
    vulnerableLines: [3, 4, 5],
    hints: [
      'req.body の値がオブジェクトだったらどうなりますか？',
      '{ "$ne": null } のような値が渡された場合を考えてください',
      '入力値の型チェックが必要です',
    ],
    explanation:
      'リクエストボディの値をそのままMongoDBクエリに渡しているため、攻撃者は `{ "username": {"$ne": null}, "role": {"$eq": "admin"} }` のようなオペレータを含むオブジェクトを送信して、全ユーザー情報を取得したり、管理者情報にアクセスできます。',
    fixedCode: `app.post('/api/users/search', async (req, res) => {
  const { username, role } = req.body;

  // 文字列型を強制し、オペレータインジェクションを防止
  if (typeof username !== 'string' || typeof role !== 'string') {
    return res.status(400).json({ error: 'Invalid input type' });
  }

  const users = await db.collection('users').find({
    username: String(username),
    role: String(role),
    isActive: true
  }).toArray();

  res.json(users.map(u => ({
    id: u._id,
    username: u.username,
    role: u.role
  })));
});`,
  },
  {
    id: 8,
    title: 'デシリアライズの恐怖',
    category: 'Insecure Deserialization',
    difficulty: 3,
    description:
      'このセッション復元機能には、リモートコード実行（RCE）に繋がる可能性のある非常に危険な脆弱性があります。',
    code: `const serialize = require('node-serialize');

app.get('/dashboard', (req, res) => {
  const sessionCookie = req.cookies.session;

  if (sessionCookie) {
    const sessionData = Buffer.from(sessionCookie, 'base64')
      .toString('utf8');
    const session = serialize.unserialize(sessionData);

    res.render('dashboard', {
      user: session.username,
      theme: session.preferences?.theme || 'light'
    });
  } else {
    res.redirect('/login');
  }
});`,
    vulnerableLines: [7, 8],
    hints: [
      'node-serialize の unserialize 関数は何を実行できますか？',
      '攻撃者がCookieの値を改ざんできることを忘れないでください',
      '関数の自動実行（IIFE）がシリアライズデータに含まれる可能性があります',
    ],
    explanation:
      'node-serialize の `unserialize()` は、シリアライズされたデータに含まれるJavaScript関数を実行できます。攻撃者はセッションCookieにIIFE（即時実行関数）を含むシリアライズデータをBase64エンコードして送信することで、サーバー上で任意のコードを実行できます（RCE）。',
    fixedCode: `// node-serialize は使用しない！
// 代わりに JSON.parse + スキーマ検証を使用

const Joi = require('joi');

const sessionSchema = Joi.object({
  username: Joi.string().alphanum().max(50).required(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark').default('light')
  }).optional()
});

app.get('/dashboard', (req, res) => {
  const sessionCookie = req.cookies.session;
  if (!sessionCookie) return res.redirect('/login');

  try {
    const raw = Buffer.from(sessionCookie, 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    const { error, value } = sessionSchema.validate(parsed);
    if (error) return res.redirect('/login');

    res.render('dashboard', {
      user: value.username,
      theme: value.preferences?.theme || 'light'
    });
  } catch {
    res.redirect('/login');
  }
});`,
  },
];
