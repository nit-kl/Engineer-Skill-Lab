/**
 * Mini SQL engine (SELECT-only subset). Ported from docs/sql-dojo.jsx.
 */

export type CellValue = string | number | null;
export type Row = Record<string, CellValue>;

type Token =
  | { type: 'STRING'; value: string }
  | { type: 'NUMBER'; value: number }
  | { type: 'KEYWORD' | 'IDENT' | 'SYMBOL' | 'OP'; value: string };

/** Parsed expression AST (loose shape for maintainability). */
export type Expr = {
  type: string;
  [key: string]: unknown;
};

type ParsedQuery = {
  distinct: boolean;
  columns: Array<{ expr: Expr; alias: string | null }>;
  tables: Array<{ name: string; alias: string | null }>;
  joins: Array<{ type: string | null; table: string; alias: string | null; on: Expr | null }>;
  where: Expr | null;
  groupBy: Expr[];
  having: Expr | null;
  orderBy: Array<{ expr: Expr; dir: string }>;
  limit: string | number | null | undefined;
  offset: string | number | null | undefined;
};

export type Database = Record<string, Row[]>;

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = sql.trim();
  const KW = [
    'SELECT',
    'FROM',
    'WHERE',
    'AND',
    'OR',
    'NOT',
    'ORDER',
    'BY',
    'ASC',
    'DESC',
    'GROUP',
    'HAVING',
    'JOIN',
    'INNER',
    'LEFT',
    'RIGHT',
    'ON',
    'AS',
    'IN',
    'BETWEEN',
    'LIKE',
    'IS',
    'NULL',
    'DISTINCT',
    'LIMIT',
    'COUNT',
    'SUM',
    'AVG',
    'MAX',
    'MIN',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'CROSS',
    'OUTER',
    'UNION',
    'ALL',
    'COALESCE',
    'IFNULL',
    'ROUND',
    'LENGTH',
    'UPPER',
    'LOWER',
    'SUBSTR',
    'TRIM',
    'REPLACE',
    'ABS',
    'MOD',
    'OFFSET',
    'EXISTS',
  ];

  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    if (s[i] === "'" || s[i] === '"') {
      const q = s[i];
      let j = i + 1;
      while (j < s.length && s[j] !== q) j++;
      tokens.push({ type: 'STRING', value: s.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if ('(),;'.includes(s[i])) {
      tokens.push({ type: 'SYMBOL', value: s[i] });
      i++;
      continue;
    }
    if (s[i] === '!' && s[i + 1] === '=') {
      tokens.push({ type: 'OP', value: '!=' });
      i += 2;
      continue;
    }
    if (s[i] === '<' && s[i + 1] === '=') {
      tokens.push({ type: 'OP', value: '<=' });
      i += 2;
      continue;
    }
    if (s[i] === '>' && s[i + 1] === '=') {
      tokens.push({ type: 'OP', value: '>=' });
      i += 2;
      continue;
    }
    if (s[i] === '<' && s[i + 1] === '>') {
      tokens.push({ type: 'OP', value: '!=' });
      i += 2;
      continue;
    }
    if ('<>=+/'.includes(s[i])) {
      tokens.push({ type: 'OP', value: s[i] });
      i++;
      continue;
    }
    const prev = tokens[tokens.length - 1];
    if (
      s[i] === '-' &&
      (tokens.length === 0 ||
        ['OP', 'SYMBOL', 'KEYWORD'].includes(prev?.type) ||
        [',', '('].includes(String(prev?.value)))
    ) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      if (j > i + 1) {
        tokens.push({ type: 'NUMBER', value: parseFloat(s.slice(i, j)) });
        i = j;
        continue;
      }
    }
    if (s[i] === '-') {
      tokens.push({ type: 'OP', value: '-' });
      i++;
      continue;
    }
    if (s[i] === '%') {
      tokens.push({ type: 'OP', value: '%' });
      i++;
      continue;
    }
    if (s[i] === '*') {
      tokens.push({ type: 'SYMBOL', value: '*' });
      i++;
      continue;
    }
    if (s[i] === '.') {
      tokens.push({ type: 'SYMBOL', value: '.' });
      i++;
      continue;
    }
    let j = i;
    while (j < s.length && /[a-zA-Z0-9_\u3000-\u9FFF]/.test(s[j])) j++;
    if (j > i) {
      const w = s.slice(i, j);
      const up = w.toUpperCase();
      if (KW.includes(up)) tokens.push({ type: 'KEYWORD', value: up });
      else if (/^\d+(\.\d+)?$/.test(w)) tokens.push({ type: 'NUMBER', value: parseFloat(w) });
      else tokens.push({ type: 'IDENT', value: w });
      i = j;
      continue;
    }
    i++;
  }
  return tokens;
}

function parseExpr(t: Token[], p: number): [Expr, number] {
  return parseOrExpr(t, p);
}
function parseOrExpr(t: Token[], p: number): [Expr, number] {
  let l: Expr;
  [l, p] = parseAndExpr(t, p);
  while (p < t.length && t[p]?.value === 'OR') {
    p++;
    let r: Expr;
    [r, p] = parseAndExpr(t, p);
    l = { type: 'OR', left: l, right: r };
  }
  return [l, p];
}
function parseAndExpr(t: Token[], p: number): [Expr, number] {
  let l: Expr;
  [l, p] = parseNotExpr(t, p);
  while (p < t.length && t[p]?.value === 'AND') {
    p++;
    let r: Expr;
    [r, p] = parseNotExpr(t, p);
    l = { type: 'AND', left: l, right: r };
  }
  return [l, p];
}
function parseNotExpr(t: Token[], p: number): [Expr, number] {
  if (t[p]?.value === 'NOT') {
    p++;
    let e: Expr;
    [e, p] = parseNotExpr(t, p);
    return [{ type: 'NOT', expr: e }, p];
  }
  return parseCmpExpr(t, p);
}

function parseCmpExpr(t: Token[], p: number): [Expr, number] {
  let l: Expr;
  [l, p] = parseAddExpr(t, p);
  if (p >= t.length) return [l, p];
  const tk = t[p];
  if (tk?.value === 'IS') {
    p++;
    let not = false;
    if (t[p]?.value === 'NOT') {
      not = true;
      p++;
    }
    if (t[p]?.value === 'NULL') {
      p++;
      return [{ type: not ? 'IS_NOT_NULL' : 'IS_NULL', expr: l }, p];
    }
  }
  if (tk?.value === 'NOT' && t[p + 1]?.value === 'IN') {
    p += 2;
    let v: Expr[];
    [v, p] = parseInList(t, p);
    return [{ type: 'NOT_IN', expr: l, values: v }, p];
  }
  if (tk?.value === 'IN') {
    p++;
    let v: Expr[];
    [v, p] = parseInList(t, p);
    return [{ type: 'IN', expr: l, values: v }, p];
  }
  if (tk?.value === 'NOT' && t[p + 1]?.value === 'BETWEEN') {
    p += 2;
    let lo: Expr;
    [lo, p] = parseAddExpr(t, p);
    p++;
    let hi: Expr;
    [hi, p] = parseAddExpr(t, p);
    return [{ type: 'NOT_BETWEEN', expr: l, lo, hi }, p];
  }
  if (tk?.value === 'BETWEEN') {
    p++;
    let lo: Expr;
    [lo, p] = parseAddExpr(t, p);
    p++;
    let hi: Expr;
    [hi, p] = parseAddExpr(t, p);
    return [{ type: 'BETWEEN', expr: l, lo, hi }, p];
  }
  if (tk?.value === 'NOT' && t[p + 1]?.value === 'LIKE') {
    p += 2;
    let r: Expr;
    [r, p] = parseAddExpr(t, p);
    return [{ type: 'NOT_LIKE', left: l, right: r }, p];
  }
  if (tk?.value === 'LIKE') {
    p++;
    let r: Expr;
    [r, p] = parseAddExpr(t, p);
    return [{ type: 'LIKE', left: l, right: r }, p];
  }
  if (tk?.type === 'OP' && '= != < > <= >='.split(' ').includes(String(tk.value))) {
    const op = tk.value;
    p++;
    let r: Expr;
    [r, p] = parseAddExpr(t, p);
    return [{ type: 'CMP', op, left: l, right: r }, p];
  }
  return [l, p];
}

function parseAddExpr(t: Token[], p: number): [Expr, number] {
  let l: Expr;
  [l, p] = parseMulExpr(t, p);
  while (p < t.length && (t[p]?.value === '+' || t[p]?.value === '-') && t[p]?.type === 'OP') {
    const op = t[p].value as string;
    p++;
    let r: Expr;
    [r, p] = parseMulExpr(t, p);
    l = { type: 'ARITH', op, left: l, right: r };
  }
  return [l, p];
}
function parseMulExpr(t: Token[], p: number): [Expr, number] {
  let l: Expr;
  [l, p] = parseAtom(t, p);
  while (
    p < t.length &&
    (t[p]?.value === '*' || t[p]?.value === '/' || t[p]?.value === '%') &&
    (t[p]?.type === 'OP' || t[p]?.type === 'SYMBOL')
  ) {
    const op = t[p].value as string;
    p++;
    let r: Expr;
    [r, p] = parseAtom(t, p);
    l = { type: 'ARITH', op, left: l, right: r };
  }
  return [l, p];
}

function parseInList(t: Token[], p: number): [Expr[], number] {
  const v: Expr[] = [];
  p++;
  while (p < t.length && t[p].value !== ')') {
    if (t[p].value === ',') {
      p++;
      continue;
    }
    let e: Expr;
    [e, p] = parseAtom(t, p);
    v.push(e);
  }
  p++;
  return [v, p];
}

function parseAtom(t: Token[], p: number): [Expr, number] {
  if (p >= t.length) return [{ type: 'LITERAL', value: null }, p];
  const tk = t[p];
  if (tk.value === '(') {
    p++;
    let e: Expr;
    [e, p] = parseExpr(t, p);
    if (t[p]?.value === ')') p++;
    return [e, p];
  }
  if (tk.value === 'NULL') return [{ type: 'LITERAL', value: null }, p + 1];
  if (tk.type === 'NUMBER') return [{ type: 'LITERAL', value: tk.value }, p + 1];
  if (tk.type === 'STRING') return [{ type: 'LITERAL', value: tk.value }, p + 1];
  const AG = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN'];
  if (AG.includes(String(tk.value)) && t[p + 1]?.value === '(') {
    const fn = tk.value as string;
    p += 2;
    let dist = false;
    if (t[p]?.value === 'DISTINCT') {
      dist = true;
      p++;
    }
    let arg: Expr;
    if (t[p]?.value === '*') {
      arg = { type: 'STAR' };
      p++;
    } else {
      [arg, p] = parseExpr(t, p);
    }
    if (t[p]?.value === ')') p++;
    return [{ type: 'AGGR', fn, arg, distinct: dist }, p];
  }
  const FN = [
    'COALESCE',
    'IFNULL',
    'ROUND',
    'LENGTH',
    'UPPER',
    'LOWER',
    'SUBSTR',
    'TRIM',
    'REPLACE',
    'ABS',
    'CAST',
    'NULLIF',
    'MOD',
  ];
  if (FN.includes(String(tk.value)) && t[p + 1]?.value === '(') {
    const fn = tk.value as string;
    p += 2;
    const args: Expr[] = [];
    while (p < t.length && t[p].value !== ')') {
      if (t[p].value === ',') {
        p++;
        continue;
      }
      let a: Expr;
      [a, p] = parseExpr(t, p);
      args.push(a);
    }
    p++;
    return [{ type: 'FUNC', fn, args }, p];
  }
  if (tk.value === 'CASE') {
    p++;
    const whens: Array<{ cond: Expr; val: Expr }> = [];
    let el: Expr | null = null;
    while (t[p]?.value === 'WHEN') {
      p++;
      let c: Expr;
      [c, p] = parseExpr(t, p);
      p++;
      let v: Expr;
      [v, p] = parseExpr(t, p);
      whens.push({ cond: c, val: v });
    }
    if (t[p]?.value === 'ELSE') {
      p++;
      [el, p] = parseExpr(t, p);
    }
    if (t[p]?.value === 'END') p++;
    return [{ type: 'CASE', whens, elseExpr: el }, p];
  }
  if (tk.type === 'IDENT' || tk.type === 'KEYWORD') {
    if (t[p + 1]?.value === '.' && t[p + 2]) {
      const tbl = tk.value as string;
      p += 2;
      const col = t[p].value as string;
      p++;
      return [{ type: 'COL', table: tbl, col }, p];
    }
    return [{ type: 'COL', col: tk.value as string }, p + 1];
  }
  if (tk.value === '*') return [{ type: 'STAR' }, p + 1];
  return [{ type: 'LITERAL', value: null }, p + 1];
}

function evalLikePattern(pat: string): RegExp {
  return new RegExp('^' + pat.replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i');
}

function evalExpr(n: Expr | null | undefined, row: Row): CellValue | boolean {
  if (!n) return null;
  switch (n.type) {
    case 'LITERAL':
      return n.value as CellValue;
    case 'STAR':
      return '*';
    case 'COL': {
      const table = n.table as string | undefined;
      const col = n.col as string;
      const k = table ? `${table}.${col}` : col;
      if (k in row) return row[k];
      if (col in row) return row[col];
      for (const rk of Object.keys(row)) {
        if (rk.endsWith('.' + col)) return row[rk];
      }
      return null;
    }
    case 'ARITH': {
      const l = evalExpr(n.left as Expr, row) as number | null;
      const r = evalExpr(n.right as Expr, row) as number | null;
      if (l === null || r === null) return null;
      const op = n.op as string;
      switch (op) {
        case '+':
          return Number(l) + Number(r);
        case '-':
          return Number(l) - Number(r);
        case '*':
          return Number(l) * Number(r);
        case '/':
          return r !== 0 ? Number(l) / Number(r) : null;
        case '%':
          return Number(l) % Number(r);
        default:
          return null;
      }
    }
    case 'CMP': {
      const l = evalExpr(n.left as Expr, row);
      const r = evalExpr(n.right as Expr, row);
      const op = n.op as string;
      if (l === null || r === null) return op === '=' ? l === null && r === null : false;
      switch (op) {
        case '=':
          return l == r;
        case '!=':
          return l != r;
        case '<':
          return (l as number | string) < (r as number | string);
        case '>':
          return (l as number | string) > (r as number | string);
        case '<=':
          return (l as number | string) <= (r as number | string);
        case '>=':
          return (l as number | string) >= (r as number | string);
        default:
          return false;
      }
    }
    case 'AND':
      return !!(evalExpr(n.left as Expr, row) && evalExpr(n.right as Expr, row));
    case 'OR':
      return !!(evalExpr(n.left as Expr, row) || evalExpr(n.right as Expr, row));
    case 'NOT':
      return !evalExpr(n.expr as Expr, row);
    case 'IS_NULL':
      return evalExpr(n.expr as Expr, row) === null;
    case 'IS_NOT_NULL':
      return evalExpr(n.expr as Expr, row) !== null;
    case 'IN': {
      const v = evalExpr(n.expr as Expr, row);
      return (n.values as Expr[]).some((x) => evalExpr(x, row) == v);
    }
    case 'NOT_IN': {
      const v = evalExpr(n.expr as Expr, row);
      return !(n.values as Expr[]).some((x) => evalExpr(x, row) == v);
    }
    case 'BETWEEN': {
      const v = evalExpr(n.expr as Expr, row) as number | string;
      return v >= evalExpr(n.lo as Expr, row) && v <= evalExpr(n.hi as Expr, row);
    }
    case 'NOT_BETWEEN': {
      const v = evalExpr(n.expr as Expr, row) as number | string;
      return !(v >= evalExpr(n.lo as Expr, row) && v <= evalExpr(n.hi as Expr, row));
    }
    case 'LIKE': {
      const v = String(evalExpr(n.left as Expr, row) ?? '');
      const p2 = String(evalExpr(n.right as Expr, row) ?? '');
      return evalLikePattern(p2).test(v);
    }
    case 'NOT_LIKE': {
      const v = String(evalExpr(n.left as Expr, row) ?? '');
      const p2 = String(evalExpr(n.right as Expr, row) ?? '');
      return !evalLikePattern(p2).test(v);
    }
    case 'AGGR': {
      const id = n._id as number;
      return row['__aggr_' + id] ?? null;
    }
    case 'FUNC': {
      const fn = n.fn as string;
      const args = (n.args as Expr[]).map((x) => evalExpr(x, row)) as CellValue[];
      switch (fn) {
        case 'COALESCE':
          return args.find((x) => x !== null) ?? null;
        case 'IFNULL':
          return args[0] !== null ? args[0] : args[1];
        case 'ROUND':
          return args[1] != null
            ? Math.round(Number(args[0]) * Math.pow(10, Number(args[1]))) /
                Math.pow(10, Number(args[1]))
            : Math.round(Number(args[0]));
        case 'LENGTH':
          return args[0] != null ? String(args[0]).length : null;
        case 'UPPER':
          return args[0] != null ? String(args[0]).toUpperCase() : null;
        case 'LOWER':
          return args[0] != null ? String(args[0]).toLowerCase() : null;
        case 'ABS':
          return args[0] != null ? Math.abs(Number(args[0])) : null;
        case 'TRIM':
          return args[0] != null ? String(args[0]).trim() : null;
        case 'SUBSTR':
          return args[0] != null
            ? String(args[0]).substring(
                (Number(args[1]) || 1) - 1,
                (Number(args[1]) || 1) - 1 + (Number(args[2]) || 999)
              )
            : null;
        case 'REPLACE':
          return args[0] != null
            ? String(args[0]).replaceAll(String(args[1]), String(args[2]))
            : null;
        default:
          return null;
      }
    }
    case 'CASE': {
      const whens = n.whens as Array<{ cond: Expr; val: Expr }>;
      for (const w of whens) {
        if (evalExpr(w.cond, row)) return evalExpr(w.val, row);
      }
      return n.elseExpr ? evalExpr(n.elseExpr as Expr, row) : null;
    }
    default:
      return null;
  }
}

function parseSQL(sql: string): ParsedQuery {
  const t = tokenize(sql);
  let p = 0;
  if (t[p]?.value !== 'SELECT') throw new Error('SELECT文を入力してください');
  p++;
  let distinct = false;
  if (t[p]?.value === 'DISTINCT') {
    distinct = true;
    p++;
  }
  const columns: ParsedQuery['columns'] = [];
  while (p < t.length && t[p]?.value !== 'FROM') {
    if (t[p]?.value === ',') {
      p++;
      continue;
    }
    let expr: Expr;
    [expr, p] = parseExpr(t, p);
    let alias: string | null = null;
    if (t[p]?.value === 'AS') {
      p++;
      alias = t[p]?.value as string;
      p++;
    } else if (t[p]?.type === 'IDENT' && t[p]?.value !== 'FROM' && t[p]?.value !== ',') {
      alias = t[p]?.value as string;
      p++;
    }
    columns.push({ expr, alias });
  }
  if (t[p]?.value !== 'FROM') throw new Error('FROM句が必要です');
  p++;
  const tables: ParsedQuery['tables'] = [];
  const tN = t[p]?.value as string;
  p++;
  let tA: string | null = null;
  if (t[p]?.value === 'AS') {
    p++;
    tA = t[p]?.value as string;
    p++;
  } else if (
    t[p]?.type === 'IDENT' &&
    !['WHERE', 'ORDER', 'GROUP', 'HAVING', 'LIMIT', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'CROSS', 'ON', 'UNION'].includes(
      String(t[p]?.value)?.toUpperCase?.() ?? ''
    )
  ) {
    tA = t[p]?.value as string;
    p++;
  }
  tables.push({ name: tN, alias: tA });
  const joins: ParsedQuery['joins'] = [];
  while (p < t.length) {
    let jt: string | null = null;
    if (t[p]?.value === 'INNER') {
      jt = 'INNER';
      p++;
    } else if (t[p]?.value === 'LEFT') {
      jt = 'LEFT';
      p++;
      if (t[p]?.value === 'OUTER') p++;
    } else if (t[p]?.value === 'RIGHT') {
      jt = 'RIGHT';
      p++;
      if (t[p]?.value === 'OUTER') p++;
    } else if (t[p]?.value === 'CROSS') {
      jt = 'CROSS';
      p++;
    }
    if (t[p]?.value === 'JOIN') {
      if (!jt) jt = 'INNER';
      p++;
      const jTbl = t[p]?.value as string;
      p++;
      let jA: string | null = null;
      if (t[p]?.value === 'AS') {
        p++;
        jA = t[p]?.value as string;
        p++;
      } else if (t[p]?.type === 'IDENT' && t[p]?.value !== 'ON' && t[p]?.value !== 'WHERE') {
        jA = t[p]?.value as string;
        p++;
      }
      let on: Expr | null = null;
      if (t[p]?.value === 'ON') {
        p++;
        [on, p] = parseExpr(t, p);
      }
      joins.push({ type: jt, table: jTbl, alias: jA, on });
    } else break;
  }
  let where: Expr | null = null;
  if (t[p]?.value === 'WHERE') {
    p++;
    [where, p] = parseExpr(t, p);
  }
  const groupBy: Expr[] = [];
  if (t[p]?.value === 'GROUP' && t[p + 1]?.value === 'BY') {
    p += 2;
    while (p < t.length && !['HAVING', 'ORDER', 'LIMIT', 'UNION'].includes(String(t[p]?.value))) {
      if (t[p]?.value === ',') {
        p++;
        continue;
      }
      let e: Expr;
      [e, p] = parseAtom(t, p);
      groupBy.push(e);
    }
  }
  let having: Expr | null = null;
  if (t[p]?.value === 'HAVING') {
    p++;
    [having, p] = parseExpr(t, p);
  }
  const orderBy: ParsedQuery['orderBy'] = [];
  if (t[p]?.value === 'ORDER' && t[p + 1]?.value === 'BY') {
    p += 2;
    while (p < t.length && !['LIMIT', 'UNION'].includes(String(t[p]?.value))) {
      if (t[p]?.value === ',') {
        p++;
        continue;
      }
      let e: Expr;
      [e, p] = parseExpr(t, p);
      let d = 'ASC';
      if (t[p]?.value === 'ASC') p++;
      else if (t[p]?.value === 'DESC') {
        d = 'DESC';
        p++;
      }
      orderBy.push({ expr: e, dir: d });
    }
  }
  let limit: string | number | null | undefined = null;
  let offset: string | number | null | undefined = null;
  if (t[p]?.value === 'LIMIT') {
    p++;
    limit = t[p]?.value;
    p++;
  }
  if (t[p]?.value === 'OFFSET') {
    p++;
    offset = t[p]?.value;
    p++;
  }
  return { distinct, columns, tables, joins, where, groupBy, having, orderBy, limit, offset };
}

function findAggr(n: Expr | null | undefined, aggrIdRef: { id: number }): Expr[] {
  if (!n) return [];
  if (n.type === 'AGGR') {
    n._id = aggrIdRef.id++;
    return [n];
  }
  const r: Expr[] = [];
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (v && typeof v === 'object') {
      if (Array.isArray(v)) {
        v.forEach((x) => {
          if (x && typeof x === 'object') r.push(...findAggr(x as Expr, aggrIdRef));
        });
      } else r.push(...findAggr(v as Expr, aggrIdRef));
    }
  }
  return r;
}

export function executeSQL(sql: string, db: Database): Row[] {
  const q = parseSQL(sql);
  const getT = (name: string): Row[] => {
    const n = name.toLowerCase();
    for (const k of Object.keys(db)) {
      if (k.toLowerCase() === n) return db[k];
    }
    throw new Error(`テーブル '${name}' が見つかりません`);
  };
  const firstTable = q.tables[0];
  let rows: Row[] = getT(firstTable.name).map((r) => {
    const o: Row = {};
    const px = firstTable.alias || firstTable.name;
    for (const [k, v] of Object.entries(r)) {
      o[k] = v;
      o[`${px}.${k}`] = v;
    }
    return o;
  });
  for (const j of q.joins) {
    const jR = getT(j.table);
    const px = j.alias || j.table;
    const nr: Row[] = [];
    for (const lr of rows) {
      let matched = false;
      for (const rr of jR) {
        const c = { ...lr };
        for (const [k, v] of Object.entries(rr)) {
          c[`${px}.${k}`] = v;
          if (!(k in c)) c[k] = v;
        }
        if (!j.on || evalExpr(j.on, c)) {
          nr.push(c);
          matched = true;
        }
      }
      if (!matched && j.type === 'LEFT') {
        const c = { ...lr };
        for (const k of Object.keys(jR[0] || {})) {
          c[`${px}.${k}`] = null;
          if (!(k in c)) c[k] = null;
        }
        nr.push(c);
      }
    }
    rows = nr;
  }
  if (q.where) rows = rows.filter((rCell) => evalExpr(q.where, rCell));
  const aggrIdRef = { id: 0 };
  const allAg: Expr[] = [];
  q.columns.forEach((c) => allAg.push(...findAggr(c.expr, aggrIdRef)));
  if (q.having) allAg.push(...findAggr(q.having, aggrIdRef));
  q.orderBy.forEach((o) => allAg.push(...findAggr(o.expr, aggrIdRef)));
  if (q.groupBy.length > 0 || allAg.length > 0) {
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
      const key = q.groupBy.map((g) => evalExpr(g, r)).join('|||');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    if (groups.size === 0 && allAg.length > 0) groups.set('__all__', rows);
    rows = [];
    for (const [, gR] of groups) {
      const rep = { ...gR[0] };
      for (const ag of allAg) {
        const arg = ag.arg as Expr;
        const vals = gR
          .map((rCell) => evalExpr(arg, rCell))
          .filter((v) => v !== null && v !== undefined) as CellValue[];
        const dv = ag.distinct ? [...new Set(vals)] : vals;
        let res: CellValue;
        switch (ag.fn) {
          case 'COUNT':
            res = arg.type === 'STAR' ? gR.length : dv.length;
            break;
          case 'SUM':
            res = dv.reduce<number>((a, b) => a + Number(b), 0);
            break;
          case 'AVG':
            res = dv.length ? dv.reduce<number>((a, b) => a + Number(b), 0) / dv.length : null;
            break;
          case 'MAX':
            res = dv.length ? Math.max(...dv.map(Number)) : null;
            break;
          case 'MIN':
            res = dv.length ? Math.min(...dv.map(Number)) : null;
            break;
          default:
            res = null;
        }
        rep['__aggr_' + (ag._id as number)] = res;
      }
      rows.push(rep);
    }
    if (q.having) rows = rows.filter((rCell) => !!evalExpr(q.having, rCell));
  }
  /** 投影後の行と、ORDER BY 用（SELECT エイリアス・集約スロットを両方見られる）のマージ行 */
  const projected = rows.map((rCell) => {
    const o: Row = {};
    for (const c of q.columns) {
      const expr = c.expr as Expr;
      if (expr.type === 'STAR') {
        for (const [k, v] of Object.entries(rCell)) {
          if (!k.includes('.') && !k.startsWith('__aggr_')) o[k] = v;
        }
      } else {
        const arg = expr.arg as Expr | undefined;
        const col = expr.col as string | undefined;
        let nm =
          c.alias ||
          col ||
          (expr.type === 'AGGR' ? `${expr.fn}(${arg?.col || '*'})` : 'expr');
        o[nm] = evalExpr(expr, rCell) as CellValue;
      }
    }
    const merged: Row = { ...rCell, ...o };
    return { out: o, merged };
  });
  if (q.orderBy.length > 0) {
    projected.sort((a, b) => {
      for (const o of q.orderBy) {
        const va = evalExpr(o.expr, a.merged);
        const vb = evalExpr(o.expr, b.merged);
        if (va === vb) continue;
        if (va === null) return 1;
        if (vb === null) return -1;
        const cmp = typeof va === 'string' ? va.localeCompare(String(vb)) : Number(va) - Number(vb);
        if (cmp !== 0) return o.dir === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });
  }
  let res: Row[] = projected.map((p) => p.out);
  if (q.distinct) {
    const seen = new Set<string>();
    const u: Row[] = [];
    for (const r of res) {
      const k = JSON.stringify(Object.values(r));
      if (!seen.has(k)) {
        seen.add(k);
        u.push(r);
      }
    }
    res = u;
  }
  const off = q.offset ? parseInt(String(q.offset), 10) : 0;
  return res.slice(off, q.limit ? off + parseInt(String(q.limit), 10) : undefined);
}
