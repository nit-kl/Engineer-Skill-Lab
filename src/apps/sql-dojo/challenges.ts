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
    title: 'はじめてのSELECT',
    difficulty: 1,
    description:
      'employeesテーブルから、名前(name)と年齢(age)を取得してください。',
    tables: ['employees'],
    hint: 'SELECT カラム名, カラム名 FROM テーブル名',
    answer: 'SELECT name, age FROM employees',
    validate: (r) => deepEq(r, DB_COMPANY.employees.map((u) => ({ name: u.name, age: u.age }))),
  },
  {
    id: 2,
    chapter: 'basics',
    title: 'WHERE句でフィルタ',
    difficulty: 1,
    description:
      'employeesテーブルから、開発部(department_id = 1)のメンバーの名前(name)と給与(salary)を取得してください。',
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
    title: '比較演算子',
    difficulty: 1,
    description:
      'employeesテーブルから、給与(salary)が450000以上のメンバーの名前(name)と給与(salary)を取得してください。',
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
    title: 'ORDER BYで並べ替え',
    difficulty: 1,
    description:
      'employeesテーブルの全員の名前(name)・年齢(age)・給与(salary)を、給与の高い順に取得してください。',
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
    title: '複数条件のWHERE',
    difficulty: 1,
    description:
      'employeesテーブルから、30歳以上かつ給与(salary)が500000未満のメンバーの名前(name)・年齢(age)・給与(salary)を取得してください。',
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
    title: 'LIKEで部分一致',
    difficulty: 1,
    description:
      'productsテーブルから、名前(name)に「USB」を含む商品の名前(name)と価格(price)を取得してください。',
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
    title: 'INで複数値マッチ',
    difficulty: 1,
    description:
      'productsテーブルから、カテゴリ(category)が「電子機器」か「ストレージ」の商品の名前(name)・カテゴリ(category)・価格(price)を取得してください。',
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
    title: 'BETWEENで範囲指定',
    difficulty: 2,
    description:
      'productsテーブルから、価格(price)が5000〜50000の商品の名前(name)と価格(price)を価格昇順で取得してください。',
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
    title: 'DISTINCTで重複排除',
    difficulty: 1,
    description: 'customersテーブルから、重複なく地域(region)の一覧を取得してください。',
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
    title: 'AND/ORの組み合わせ',
    difficulty: 2,
    description:
      'productsテーブルから、カテゴリが「周辺機器」で、かつ在庫(stock)が100以上、または価格(price)が10000以上の商品の名前(name)と価格(price)を取得してください。',
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
    title: 'LIMITで上位N件',
    difficulty: 1,
    description:
      'productsテーブルから、価格(price)が高い順に上位3件の名前(name)と価格(price)を取得してください。',
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
    title: 'COUNTで数える',
    difficulty: 1,
    description:
      'studentsテーブルから、学年(grade)ごとの生徒数をカウントしてください。カラム名はgrade, countにしてください。',
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
    title: 'AVG / MAX / MIN',
    difficulty: 2,
    description:
      'scoresテーブルから、科目(subject_id)ごとの平均点(avg_score)・最高点(max_score)・最低点(min_score)を求めてください。',
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
    title: 'HAVINGで絞り込み',
    difficulty: 2,
    description:
      'scoresテーブルから、科目ごとの平均点(avg_score)を求め、平均が80以上の科目(subject_id)だけを表示してください。',
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
    title: 'COUNT(DISTINCT)',
    difficulty: 2,
    description:
      'scoresテーブルから、科目ごとの受験者数を集計してください。カラムはsubject_id, student_countにしてください。',
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
    title: 'SUM + WHERE + ORDER BY',
    difficulty: 2,
    description:
      "ordersテーブルから、完了(status='完了')注文の顧客(customer_id)ごとの合計数量(total_qty)を求め、多い順に並べてください。",
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
    title: '部活ごとの人数',
    difficulty: 2,
    description:
      'studentsテーブルから、部活(club)ごとの人数(member_count)を集計してください。NULLの部活は含めなくてOKです。clubとmember_countを出力してください。',
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
    title: 'INNER JOINの基本',
    difficulty: 2,
    description:
      'employeesとdepartmentsをINNER JOINし、社員名(name)と部署名(departmentsのname → dept_name)を取得してください。',
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
    title: 'LEFT JOINで欠損発見',
    difficulty: 2,
    description:
      'departmentsに対してemployeesをLEFT JOINし、社員がいない部署名(name)を見つけてください。',
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
    title: '3テーブル結合',
    difficulty: 3,
    description:
      'students, scores, subjectsを結合して、生徒名(name)・科目名(subjectsのname → subject_name)・点数(score)を取得し、点数の高い順に並べてください。',
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
    title: 'JOINと集計',
    difficulty: 3,
    description:
      'employeesとassignmentsを結合して、社員(name)ごとのプロジェクト数(project_count)を集計し、多い順に並べてください。',
    tables: ['employees', 'assignments'],
    hint: 'JOIN + GROUP BY + COUNT + ORDER BY',
    answer:
      'SELECT e.name, COUNT(*) AS project_count FROM employees e JOIN assignments a ON e.id = a.employee_id GROUP BY e.name ORDER BY project_count DESC',
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
    title: '注文と商品の結合',
    difficulty: 2,
    description:
      'ordersとproductsをproduct_idで結合し、注文ID(ordersのid → order_id)・商品名(productsのname → product_name)・数量(quantity)を取得してください。',
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
    title: '算術演算で在庫金額',
    difficulty: 2,
    description:
      'productsテーブルから、商品名(name)と在庫金額(stock × price → stock_value)を計算し、在庫金額の高い順に上位5件を取得してください。',
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
    title: 'CASE式で成績ランク',
    difficulty: 3,
    description:
      "scoresテーブルから、student_id, subject_id, score と、90点以上なら'優'、70点以上なら'良'、それ以外は'可'を grade_label カラムで表示してください。",
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
    title: 'NULLの扱い',
    difficulty: 2,
    description:
      'studentsテーブルから、部活(club)が未登録(NULL)の生徒の名前(name)と学年(grade)を取得してください。',
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
    title: 'レビュー分析',
    difficulty: 3,
    description:
      'reviewsとproductsを結合し、商品名(name)ごとの平均評価(avg_rating)とレビュー数(review_count)を求め、平均評価の高い順に並べてください。',
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
    title: 'CASE式で価格帯分類',
    difficulty: 3,
    description:
      "productsテーブルから、商品名(name)と、price < 5000 なら'低価格'、< 50000 なら'中価格'、それ以外なら'高価格'を price_range カラムで表示してください。",
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
    title: '売上レポート',
    difficulty: 3,
    description:
      "orders, products, customersを結合し、完了(status='完了')注文の顧客名(customersのname → customer_name)ごとの合計売上金額(quantity × price → total_amount)を集計し、金額の高い順に並べてください。",
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
