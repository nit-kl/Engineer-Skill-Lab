import type { Row } from './sqlEngine';
import { deepEq, sameUn } from './compareRows';
import { DB_COMPANY, DB_SCHOOL, DB_SHOP } from './dojoData';
import type { ChapterId } from './dojoData';

export type Difficulty = 1 | 2 | 3;

export type Challenge = {
  id: number;
  chapter: ChapterId;
  title: string;
  difficulty: Difficulty;
  description: string;
  tables: string[];
  hint: string;
  answer: string;
  validate: (r: Row[]) => boolean;
};

export const CHALLENGES: Challenge[] = [
  {
    id: 1,
    chapter: 'basics',
    title: '17:47、社員マスタが全社で同じエラーで止まった',
    difficulty: 1,
    description:
      '権限まわりのリリース事故で、人事ポータルの社員マスタが全員まとめて開けない（自分の画面だけの問題ではない）。ロールバック手順は走っているが、それまでのつなぎで経営対応が「登録されている人の最低限の名簿」を求めている。GUIは死んでいるが、緊急用の読取専用SQLコンソールだけは通っており、当番に回ったあなたがここから叩けるのが唯一のルートだ。\n\n' +
      'employees テーブルから、名前(name)と年齢(age)を取得するSQLを書いてください。',
    tables: ['employees'],
    hint: 'SELECT カラム名, カラム名 FROM テーブル名',
    answer: 'SELECT name, age FROM employees',
    validate: (r) => deepEq(r, DB_COMPANY.employees.map((u) => ({ name: u.name, age: u.age }))),
  },
  {
    id: 2,
    chapter: 'basics',
    title: 'リリース直前、開発部だけの人件費を即答せよ',
    difficulty: 1,
    description:
      '会計からSlack着信。「開発部(department_id = 1)の給与レンジ、今すぐ」。承認フローが止まっていて、あなたがその場で叩けるのはこのリードオンリーDBだけ。\n\n' +
      'employees から、開発部のメンバーの名前(name)と給与(salary)を取得してください。',
    tables: ['employees'],
    hint: 'WHERE カラム名 = 値',
    answer: 'SELECT name, salary FROM employees WHERE department_id = 1',
    validate: (r) =>
      deepEq(
        r,
        DB_COMPANY.employees.filter((e) => e.department_id === 1).map((e) => ({
          name: e.name,
          salary: e.salary,
        }))
      ),
  },
  {
    id: 3,
    chapter: 'basics',
    title: '昇給ラインの急造リスト——450k未満は手当対象？',
    difficulty: 1,
    description:
      '労務トラブルを避けるため、「給与が45万円以上の人」を今日中に法務へ送る必要がある。エクスポートが不安定で、生SQL一択。\n\n' +
      'employees から、給与(salary)が450000以上のメンバーの名前(name)と給与(salary)を取得してください。',
    tables: ['employees'],
    hint: 'WHERE salary >= 値',
    answer: 'SELECT name, salary FROM employees WHERE salary >= 450000',
    validate: (r) =>
      sameUn(
        r,
        DB_COMPANY.employees.filter((e) => Number(e.salary) >= 450000).map((e) => ({
          name: e.name,
          salary: e.salary,
        }))
      ),
  },
  {
    id: 4,
    chapter: 'basics',
    title: '役員面談で刺される前に「給与トップから並べろ」',
    difficulty: 1,
    description:
      '「誰が一番もらっている？」という質問が飛んできた。感覚で答えると火に油。事実ベースで並べ替えた表をその場で出すしかない。\n\n' +
      'employees の全員について、名前(name)・年齢(age)・給与(salary)を、給与の高い順に取得してください。',
    tables: ['employees'],
    hint: 'ORDER BY カラム名 DESC',
    answer: 'SELECT name, age, salary FROM employees ORDER BY salary DESC',
    validate: (r) =>
      deepEq(
        r,
        [...DB_COMPANY.employees]
          .sort((a, b) => Number(b.salary) - Number(a.salary))
          .map((e) => ({ name: e.name, age: e.age, salary: e.salary }))
      ),
  },
  {
    id: 5,
    chapter: 'basics',
    title: '中堅層の待遇見直し——30代で50万未満は誰だ',
    difficulty: 1,
    description:
      'タレント流出が話題になっている。人事が「30歳以上かつ給与50万未満」のメンバー名单を今すぐ欲しいと言ってくる。ミスは許されない。\n\n' +
      'employees から、30歳以上かつ給与(salary)が500000未満の人の名前(name)・年齢(age)・給与(salary)を取得してください。',
    tables: ['employees'],
    hint: 'WHERE age >= 30 AND salary < 500000',
    answer: 'SELECT name, age, salary FROM employees WHERE age >= 30 AND salary < 500000',
    validate: (r) =>
      sameUn(
        r,
        DB_COMPANY.employees
          .filter((e) => Number(e.age) >= 30 && Number(e.salary) < 500000)
          .map((e) => ({ name: e.name, age: e.age, salary: e.salary }))
      ),
  },
  {
    id: 6,
    chapter: 'filtering',
    title: 'USB在庫疑惑の拡散前に、論点SKUを名前と単価で囲い込め',
    difficulty: 1,
    description:
      'SNSで「USBまわりの在庫がおかしい」という曖昧な噂が流れ始めた。倉庫で実数を数える段階の前に、社内では「そもそもどのSKUが論点か」をマスタで確定させ、販売価格も揃えて広報・受注窓口に即回さないと、根拠なしの否定・肯定どちらも踏み抜く。\n\n' +
      'products から、名前(name)に「USB」を含む商品の名前(name)と価格(price)を取得してください。',
    tables: ['products'],
    hint: "WHERE name LIKE '%キーワード%'",
    answer: "SELECT name, price FROM products WHERE name LIKE '%USB%'",
    validate: (r) =>
      sameUn(
        r,
        DB_SHOP.products
          .filter((p) => String(p.name).includes('USB'))
          .map((p) => ({ name: p.name, price: p.price }))
      ),
  },
  {
    id: 7,
    chapter: 'filtering',
    title: '配送センター混乱——電子機器とストレージだけ優先ピック',
    difficulty: 1,
    description:
      'トラック遅延でピッキング指示が乱れた。「電子機器」と「ストレージ」のカテゴリだけ先にリストアップしろ、と現場監督が叫んでいる。\n\n' +
      'products から、カテゴリ(category)が「電子機器」か「ストレージ」の商品について、名前(name)・カテゴリ(category)・価格(price)を取得してください。',
    tables: ['products'],
    hint: "WHERE category IN ('値1', '値2')",
    answer: "SELECT name, category, price FROM products WHERE category IN ('電子機器', 'ストレージ')",
    validate: (r) =>
      sameUn(
        r,
        DB_SHOP.products
          .filter((p) => ['電子機器', 'ストレージ'].includes(String(p.category)))
          .map((p) => ({ name: p.name, category: p.category, price: p.price }))
      ),
  },
  {
    id: 8,
    chapter: 'filtering',
    title: '価格帯バグ疑い、五千〜五万円のSKUを昇順で晒せ',
    difficulty: 2,
    description:
      '価格改定バッチの不具合が疑われている。五千円〜五万円のレンジに落ちる商品を、安い順に並べて経理と突き合わせる。お前の手が止まればロールバック不能。\n\n' +
      'products から、価格(price)が5000〜50000の商品の名前(name)と価格(price)を、価格の昇順で取得してください。',
    tables: ['products'],
    hint: 'WHERE price BETWEEN 下限 AND 上限',
    answer: 'SELECT name, price FROM products WHERE price BETWEEN 5000 AND 50000 ORDER BY price ASC',
    validate: (r) =>
      deepEq(
        r,
        DB_SHOP.products
          .filter((p) => Number(p.price) >= 5000 && Number(p.price) <= 50000)
          .sort((a, b) => Number(a.price) - Number(b.price))
          .map((p) => ({ name: p.name, price: p.price }))
      ),
  },
  {
    id: 9,
    chapter: 'filtering',
    title: '出張規程改正、営業に「何地域をカバーしてるか」聞かれた',
    difficulty: 1,
    description:
      '法務が「顧客の所在地域がすべて把握できているか」と詰めている。重複なく地域の一覧を出せばとりあえず一息つける。\n\n' +
      'customers テーブルから、重複なく地域(region)の一覧を取得してください。',
    tables: ['customers'],
    hint: 'SELECT DISTINCT カラム名',
    answer: 'SELECT DISTINCT region FROM customers',
    validate: (r) =>
      sameUn(
        r,
        [...new Set(DB_SHOP.customers.map((c) => c.region))].map((reg) => ({ region: reg }))
      ),
  },
  {
    id: 10,
    chapter: 'filtering',
    title: '在庫アラート誤爆、周辺機器の閾値だけ切り分けろ',
    difficulty: 2,
    description:
      '監視が赤転したが、本当に危ないのは「周辺機器」で在庫100以上、または単価1万超——この条件に当たるSKUだけ施策会議に持ち込めと部長命令。\n\n' +
      'products から、カテゴリが「周辺機器」で、かつ在庫(stock)が100以上、または価格(price)が10000以上の商品の名前(name)と価格(price)を取得してください。',
    tables: ['products'],
    hint: "WHERE category = '...' AND (stock >= ... OR price >= ...)",
    answer:
      "SELECT name, price FROM products WHERE category = '周辺機器' AND (stock >= 100 OR price >= 10000)",
    validate: (r) =>
      sameUn(
        r,
        DB_SHOP.products
          .filter(
            (p) => p.category === '周辺機器' && (Number(p.stock) >= 100 || Number(p.price) >= 10000)
          )
          .map((p) => ({ name: p.name, price: p.price }))
      ),
  },
  {
    id: 11,
    chapter: 'filtering',
    title: 'アワード品の代替案、高単価トップ3を今すぐ',
    difficulty: 1,
    description:
      'ヒット商品が欠品し、顧客VIPへの代替ギフトを即決しなければ契約失効の可能性がある。高い順に3件、社長が待っている。\n\n' +
      'products から、価格(price)が高い順に上位3件の名前(name)と価格(price)を取得してください。',
    tables: ['products'],
    hint: 'ORDER BY ... DESC LIMIT 数',
    answer: 'SELECT name, price FROM products ORDER BY price DESC LIMIT 3',
    validate: (r) =>
      deepEq(
        r,
        [...DB_SHOP.products]
          .sort((a, b) => Number(b.price) - Number(a.price))
          .slice(0, 3)
          .map((p) => ({ name: p.name, price: p.price }))
      ),
  },
  {
    id: 12,
    chapter: 'aggregation',
    title: '避難誘導で紙名簿がない——学年別人数を理事に即答',
    difficulty: 1,
    description:
      '非常時の避難誘導で「各学年に何人いるか」が求められた。紙の名簿が倉庫に取りに行けない。DBだけが真実。\n\n' +
      'students から、学年(grade)ごとの生徒数をカウントしてください。カラム名は grade, count にしてください。',
    tables: ['students'],
    hint: 'SELECT カラム, COUNT(*) AS count FROM テーブル GROUP BY カラム',
    answer: 'SELECT grade, COUNT(*) AS count FROM students GROUP BY grade',
    validate: (r) => {
      const g: Record<number, number> = {};
      DB_SCHOOL.students.forEach((s) => {
        g[Number(s.grade)] = (g[Number(s.grade)] || 0) + 1;
      });
      return sameUn(
        r,
        Object.entries(g).map(([k, v]) => ({ grade: Number(k), count: v }))
      );
    },
  },
  {
    id: 13,
    chapter: 'aggregation',
    title: 'テスト難易度論争、科目別の平均・最高・最低を数字で黙らせろ',
    difficulty: 2,
    description:
      '保護者会で「数学だけ厳しすぎる」が炎上寸前。科目ごとの平均・最高点・最低点を出さないとあなたの評価が飛ぶ。\n\n' +
      'scores から、科目(subject_id)ごとの平均点(avg_score)・最高点(max_score)・最低点(min_score)を求めてください。',
    tables: ['scores'],
    hint: 'AVG(score), MAX(score), MIN(score) を GROUP BY で使う',
    answer:
      'SELECT subject_id, AVG(score) AS avg_score, MAX(score) AS max_score, MIN(score) AS min_score FROM scores GROUP BY subject_id',
    validate: (r) => {
      const g: Record<number, number[]> = {};
      DB_SCHOOL.scores.forEach((s) => {
        if (!g[s.subject_id]) g[s.subject_id] = [];
        g[s.subject_id].push(Number(s.score));
      });
      return sameUn(
        r,
        Object.entries(g).map(([k, v]) => ({
          subject_id: Number(k),
          avg_score: v.reduce((a, b) => a + b, 0) / v.length,
          max_score: Math.max(...v),
          min_score: Math.min(...v),
        }))
      );
    },
  },
  {
    id: 14,
    chapter: 'aggregation',
    title: '補習予算争い、平均80点以上の科目だけが助成ライン',
    difficulty: 2,
    description:
      '教委から「平均が一定以上の科目だけ追加予算」と通達。平均が80以上の科目だけを即リスト化し、それ以外は予算ゼロ。\n\n' +
      'scores から、科目ごとの平均点(avg_score)を求め、平均が80以上の科目(subject_id)だけを表示してください。',
    tables: ['scores'],
    hint: 'HAVING AVG(score) >= 80',
    answer:
      'SELECT subject_id, AVG(score) AS avg_score FROM scores GROUP BY subject_id HAVING AVG(score) >= 80',
    validate: (r) => {
      const g: Record<number, number[]> = {};
      DB_SCHOOL.scores.forEach((s) => {
        if (!g[s.subject_id]) g[s.subject_id] = [];
        g[s.subject_id].push(Number(s.score));
      });
      return sameUn(
        r,
        Object.entries(g)
          .map(([k, v]) => ({
            subject_id: Number(k),
            avg_score: v.reduce((a, b) => a + b, 0) / v.length,
          }))
          .filter((x) => x.avg_score >= 80)
      );
    },
  },
  {
    id: 15,
    chapter: 'aggregation',
    title: '試験監督トラブル、同一人物の二重計上がないか人数を証明しろ',
    difficulty: 2,
    description:
      '採点システムの不具合で「同じ生徒が二重にカウントされた」と疑われている。科目ごとに、ユニークな受験者数だけ出せと監査が言い張る。\n\n' +
      'scores から、科目ごとの受験者数を集計してください。カラムは subject_id, student_count にしてください。',
    tables: ['scores'],
    hint: 'COUNT(DISTINCT student_id)',
    answer:
      'SELECT subject_id, COUNT(DISTINCT student_id) AS student_count FROM scores GROUP BY subject_id',
    validate: (r) => {
      const g: Record<number, Set<number>> = {};
      DB_SCHOOL.scores.forEach((s) => {
        if (!g[s.subject_id]) g[s.subject_id] = new Set();
        g[s.subject_id].add(Number(s.student_id));
      });
      return sameUn(
        r,
        Object.entries(g).map(([k, v]) => ({ subject_id: Number(k), student_count: v.size }))
      );
    },
  },
  {
    id: 16,
    chapter: 'aggregation',
    title: '大量キャンセル後の売上修正、完了分だけ顧客別数量を出せ',
    difficulty: 2,
    description:
      '決済バッチ事故で倉庫は混乱。「完了」ステータスだけの配送実績を顧客別に合算し、CSが謝罪メールの宛先人数を確定させる。遅延は許されない。\n\n' +
      "orders から、完了(status='完了')注文の顧客(customer_id)ごとの合計数量(total_qty)を求め、多い順に並べてください。",
    tables: ['orders'],
    hint: 'SUM(quantity) + GROUP BY + ORDER BY ... DESC',
    answer:
      "SELECT customer_id, SUM(quantity) AS total_qty FROM orders WHERE status = '完了' GROUP BY customer_id ORDER BY total_qty DESC",
    validate: (r) => {
      const g: Record<number, number> = {};
      DB_SHOP.orders
        .filter((o) => o.status === '完了')
        .forEach((o) => {
          g[Number(o.customer_id)] = (g[Number(o.customer_id)] || 0) + Number(o.quantity);
        });
      return deepEq(
        r,
        Object.entries(g)
          .map(([k, v]) => ({ customer_id: Number(k), total_qty: v }))
          .sort((a, b) => b.total_qty - a.total_qty)
      );
    },
  },
  {
    id: 17,
    chapter: 'aggregation',
    title: '部活動バス事故、乗車名簿に部ごとの人数が必要',
    difficulty: 2,
    description:
      '急なバス手配で、部活単位の搭乗者数を今すぐ申告しなければ出発できない。未所属(NULL)は対象外。\n\n' +
      'students から、部活(club)ごとの人数(member_count)を集計してください。NULLの部活は含めなくてOKです。club と member_count を出力してください。',
    tables: ['students'],
    hint: 'WHERE club IS NOT NULL + GROUP BY club',
    answer:
      'SELECT club, COUNT(*) AS member_count FROM students WHERE club IS NOT NULL GROUP BY club',
    validate: (r) => {
      const g: Record<string, number> = {};
      DB_SCHOOL.students
        .filter((s) => s.club !== null)
        .forEach((s) => {
          g[String(s.club)] = (g[String(s.club)] || 0) + 1;
        });
      return sameUn(
        r,
        Object.entries(g).map(([k, v]) => ({ club: k, member_count: v }))
      );
    },
  },
  {
    id: 18,
    chapter: 'joins',
    title: '組織再編PDFが腐った、社員—部署の対応表を今作れ',
    difficulty: 2,
    description:
      '株主総会資料の差し替え期限が30分後。employees と departments を突合し、誰がどの部署かの表を生SQLで復元するしかない。\n\n' +
      'employees と departments を INNER JOIN し、社員名(name)と部署名(departmentsのname → dept_name)を取得してください。',
    tables: ['employees', 'departments'],
    hint: 'JOIN departments d ON e.department_id = d.id',
    answer:
      'SELECT e.name, d.name AS dept_name FROM employees e INNER JOIN departments d ON e.department_id = d.id',
    validate: (r) =>
      deepEq(
        r,
        DB_COMPANY.employees
          .map((e) => {
            const d = DB_COMPANY.departments.find((dep) => dep.id === e.department_id);
            return d ? { name: e.name, dept_name: d.name } : null;
          })
          .filter((x): x is { name: string; dept_name: string } => x != null)
      ),
  },
  {
    id: 19,
    chapter: 'joins',
    title: 'ガバナンス監査、「社員ゼロの部署」は存在するか',
    difficulty: 2,
    description:
      '外部監査法人が「幽霊部署がないか」と迫っている。誰も紐づいていない部署名を一発で突き止めよ。ゼロ件なら即ホッとできる。\n\n' +
      'departments に対して employees を LEFT JOIN し、社員がいない部署の名前(name)だけを取得してください。',
    tables: ['departments', 'employees'],
    hint: 'LEFT JOIN + WHERE ... IS NULL',
    answer:
      'SELECT d.name FROM departments d LEFT JOIN employees e ON d.id = e.department_id WHERE e.id IS NULL',
    validate: (r) => {
      const has = new Set(DB_COMPANY.employees.map((e) => Number(e.department_id)));
      return sameUn(
        r,
        DB_COMPANY.departments.filter((d) => !has.has(Number(d.id))).map((d) => ({ name: d.name }))
      );
    },
  },
  {
    id: 20,
    chapter: 'joins',
    title: '成績開示システム障害、生徒×科目の全スコアを即席リスト',
    difficulty: 3,
    description:
      '保護者サイトが落ち、電話殺到。紙の成績表が間に合わない。生徒名・科目名・点数を結合して、高得点順に並べた緊急表を出せ。\n\n' +
      'students, scores, subjects を結合し、生徒名(name)・科目名(subjectsのname → subject_name)・点数(score)を取得し、点数の高い順に並べてください。',
    tables: ['students', 'scores', 'subjects'],
    hint: '2回JOINする: scores → students, scores → subjects',
    answer:
      'SELECT st.name, su.name AS subject_name, sc.score FROM scores sc JOIN students st ON sc.student_id = st.id JOIN subjects su ON sc.subject_id = su.id ORDER BY sc.score DESC',
    validate: (r) =>
      deepEq(
        r,
        DB_SCHOOL.scores
          .map((sc) => ({
            name: DB_SCHOOL.students.find((s) => s.id === sc.student_id)!.name,
            subject_name: DB_SCHOOL.subjects.find((s) => s.id === sc.subject_id)!.name,
            score: sc.score,
          }))
          .sort((a, b) => Number(b.score) - Number(a.score))
      ),
  },
  {
    id: 21,
    chapter: 'joins',
    title: 'リソース枯渇、誰が何本の案件に手を出す過負荷か突き止めろ',
    difficulty: 3,
    description:
      '複数プロジェクト同時稼働で現場が疲弊。「誰に何件アサインされているか」を人数で並べ、一番多い人から手を離させる方針が決まった。\n\n' +
      'employees と assignments を結合し、社員(name)ごとのプロジェクト数(project_count)を集計し、多い順に並べてください。',
    tables: ['employees', 'assignments'],
    hint: 'JOIN + GROUP BY + COUNT + ORDER BY',
    answer:
      'SELECT e.name, COUNT(*) AS project_count FROM employees e JOIN assignments a ON e.id = a.employee_id GROUP BY e.name ORDER BY COUNT(*) DESC',
    validate: (r) => {
      const g: Record<string, number> = {};
      DB_COMPANY.assignments.forEach((a) => {
        const e = DB_COMPANY.employees.find((emp) => emp.id === a.employee_id);
        if (e) g[String(e.name)] = (g[String(e.name)] || 0) + 1;
      });
      return deepEq(
        r,
        Object.entries(g)
          .map(([k, v]) => ({ name: k, project_count: v }))
          .sort((a, b) => b.project_count - a.project_count)
      );
    },
  },
  {
    id: 22,
    chapter: 'joins',
    title: '配送トラッキングがIDのまま、顧客に説明できる表を',
    difficulty: 2,
    description:
      '問い合わせ対応で「注文番号と商品名がセットでないと話が進まない」と吠えられる。orders と products を突合し、現場と同じ粒度のリストを出せ。\n\n' +
      'orders と products を product_id で結合し、注文ID(ordersのid → order_id)・商品名(productsのname → product_name)・数量(quantity)を取得してください。',
    tables: ['orders', 'products'],
    hint: 'JOIN products p ON o.product_id = p.id',
    answer:
      'SELECT o.id AS order_id, p.name AS product_name, o.quantity FROM orders o JOIN products p ON o.product_id = p.id',
    validate: (r) =>
      deepEq(
        r,
        DB_SHOP.orders.map((o) => ({
          order_id: o.id,
          product_name: DB_SHOP.products.find((p) => p.id === o.product_id)!.name,
          quantity: o.quantity,
        }))
      ),
  },
  {
    id: 23,
    chapter: 'advanced',
    title: '在庫評価の夜間ジョブが失敗、棚卸し金額トップ5を手計算で',
    difficulty: 2,
    description:
      '会計システムが落ちている。期末の在庫評価は stock×price で上から5件、経理が電話で待っている。ミスればあなたの責任になる。\n\n' +
      'products から、商品名(name)と在庫金額(stock × price → stock_value)を計算し、在庫金額の高い順に上位5件を取得してください。',
    tables: ['products'],
    hint: 'SELECT name, stock * price AS stock_value ...',
    answer:
      'SELECT name, stock * price AS stock_value FROM products ORDER BY stock_value DESC LIMIT 5',
    validate: (r) =>
      deepEq(
        r,
        DB_SHOP.products
          .map((p) => ({ name: p.name, stock_value: Number(p.stock) * Number(p.price) }))
          .sort((a, b) => b.stock_value - a.stock_value)
          .slice(0, 5)
      ),
  },
  {
    id: 24,
    chapter: 'advanced',
    title: '奨学金判定バッチが停止、閾値でラベルを即席で付け直せ',
    difficulty: 3,
    description:
      '夜間バッチが死んだ。手動でもいいから全スコアに優・良・可を振れと学務が怒鳴る。基準は90/70で固定。\n\n' +
      "scores から、student_id, subject_id, score と、90点以上なら'優'、70点以上なら'良'、それ以外は'可'を grade_label カラムで表示してください。",
    tables: ['scores'],
    hint: "CASE WHEN score >= 90 THEN '優' ...",
    answer:
      "SELECT student_id, subject_id, score, CASE WHEN score >= 90 THEN '優' WHEN score >= 70 THEN '良' ELSE '可' END AS grade_label FROM scores",
    validate: (r) =>
      deepEq(
        r,
        DB_SCHOOL.scores.map((s) => ({
          student_id: s.student_id,
          subject_id: s.subject_id,
          score: s.score,
          grade_label:
            Number(s.score) >= 90 ? '優' : Number(s.score) >= 70 ? '良' : '可',
        }))
      ),
  },
  {
    id: 25,
    chapter: 'advanced',
    title: '部活勧誘のミス登録、未所属の生徒だけ今夜リストアップ',
    difficulty: 2,
    description:
      '部活顧問が「未所属の子にだけ案内メールを送る」と暴走。club が NULL の生徒を漏らすとクレームになる。\n\n' +
      'students から、部活(club)が未登録(NULL)の生徒の名前(name)と学年(grade)を取得してください。',
    tables: ['students'],
    hint: 'WHERE club IS NULL',
    answer: 'SELECT name, grade FROM students WHERE club IS NULL',
    validate: (r) =>
      sameUn(
        r,
        DB_SCHOOL.students.filter((s) => s.club === null).map((s) => ({ name: s.name, grade: s.grade }))
      ),
  },
  {
    id: 26,
    chapter: 'advanced',
    title: '信頼できる商品だけ広告に載せろ——評価と件数を平均の高い順で',
    difficulty: 3,
    description:
      '炎上を避けるため、「平均評価が高く、レビュー件数も把握できた商品」からバナーを出す方針に急転換。商品名ごとに平均評価と件数を集計し、評価が高い順に並べて会議に持ち込め。\n\n' +
      'reviews と products を結合し、商品名(name)ごとの平均評価(avg_rating)とレビュー数(review_count)を求め、平均評価の高い順に並べてください。',
    tables: ['reviews', 'products'],
    hint: 'JOIN + GROUP BY + AVG + COUNT + ORDER BY DESC',
    answer:
      'SELECT p.name, AVG(r.rating) AS avg_rating, COUNT(*) AS review_count FROM reviews r JOIN products p ON r.product_id = p.id GROUP BY p.name ORDER BY avg_rating DESC',
    validate: (r) => {
      const g: Record<string, number[]> = {};
      DB_SHOP.reviews.forEach((rv) => {
        const p = DB_SHOP.products.find((prod) => prod.id === rv.product_id)!;
        if (!g[p.name]) g[p.name] = [];
        g[p.name].push(Number(rv.rating));
      });
      return deepEq(
        r,
        Object.entries(g)
          .map(([k, v]) => ({
            name: k,
            avg_rating: v.reduce((a, b) => a + b, 0) / v.length,
            review_count: v.length,
          }))
          .sort((a, b) => b.avg_rating - a.avg_rating)
      );
    },
  },
  {
    id: 27,
    chapter: 'advanced',
    title: '値引きキャンペーン設計が白紙、価格帯ラベルを一括生成',
    difficulty: 3,
    description:
      '朝礼で「低・中・高の3帯に分けて施策を組め」と突き落とされた。定義は既定の閾値だけ。Excelは禁止、DB直叩き。\n\n' +
      "products から、商品名(name)と、price < 5000 なら'低価格'、< 50000 なら'中価格'、それ以外なら'高価格'を price_range カラムで表示してください。",
    tables: ['products'],
    hint: "CASE WHEN price < 5000 THEN '低価格' ...",
    answer:
      "SELECT name, CASE WHEN price < 5000 THEN '低価格' WHEN price < 50000 THEN '中価格' ELSE '高価格' END AS price_range FROM products",
    validate: (r) =>
      deepEq(
        r,
        DB_SHOP.products.map((p) => ({
          name: p.name,
          price_range:
            Number(p.price) < 5000
              ? '低価格'
              : Number(p.price) < 50000
                ? '中価格'
                : '高価格',
        }))
      ),
  },
  {
    id: 28,
    chapter: 'advanced',
    title: '決算直前、完了済みの顧客別粗利を今この画面で出せ',
    difficulty: 3,
    description:
      '取締役会が15分後に始まる。「どの顧客が一番買っているか」を完了注文だけで数字で言えとCFOが睨んでいる。join漏れは即詰み。\n\n' +
      "orders, products, customers を結合し、完了(status='完了')注文の顧客名(customersのname → customer_name)ごとの合計売上金額(quantity × price → total_amount)を集計し、金額の高い順に並べてください。",
    tables: ['orders', 'products', 'customers'],
    hint: '3テーブルJOIN + WHERE + SUM(o.quantity * p.price) + GROUP BY + ORDER BY',
    answer:
      "SELECT c.name AS customer_name, SUM(o.quantity * p.price) AS total_amount FROM orders o JOIN products p ON o.product_id = p.id JOIN customers c ON o.customer_id = c.id WHERE o.status = '完了' GROUP BY c.name ORDER BY total_amount DESC",
    validate: (r) => {
      const g: Record<string, number> = {};
      DB_SHOP.orders
        .filter((o) => o.status === '完了')
        .forEach((o) => {
          const p = DB_SHOP.products.find((prod) => prod.id === o.product_id);
          const c = DB_SHOP.customers.find((cust) => cust.id === o.customer_id);
          if (p && c) g[String(c.name)] = (g[String(c.name)] || 0) + Number(o.quantity) * Number(p.price);
        });
      return deepEq(
        r,
        Object.entries(g)
          .map(([k, v]) => ({ customer_name: k, total_amount: v }))
          .sort((a, b) => b.total_amount - a.total_amount)
      );
    },
  },
];
