import type { Row } from './sqlEngine';

/** 行順・列キー一致で比較（数値は誤差 0.01 まで許容）。 */
export function deepEq(a: Row[], b: Row[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ka = Object.keys(a[i]);
    if (ka.length !== Object.keys(b[i]).length) return false;
    for (const k of ka) {
      const keysB = Object.keys(b[i]);
      const va = a[i][k];
      const vb =
        b[i][k] ?? b[i][keysB.find((bk) => bk.toLowerCase() === k.toLowerCase()) ?? ''];
      if (typeof va === 'number' && typeof vb === 'number') {
        if (Math.abs(va - vb) > 0.01) return false;
      } else if (va != vb) return false;
    }
  }
  return true;
}

/** 順序無視で比較（キーは小文字化、数値は誤差 1 まで許容）。 */
export function sameUn(a: Row[], b: Row[]): boolean {
  if (a.length !== b.length) return false;
  const n = (rows: Row[]) =>
    rows
      .map((r) => {
        const o: Row = {};
        for (const [k, v] of Object.entries(r)) o[k.toLowerCase()] = v;
        return o;
      })
      .sort((x, y) =>
        JSON.stringify(Object.values(x)).localeCompare(JSON.stringify(Object.values(y)))
      );
  const na = n(a);
  const nb = n(b);
  for (let i = 0; i < na.length; i++) {
    for (const k of Object.keys(na[i])) {
      const va = na[i][k];
      const vb = nb[i]?.[k];
      if (typeof va === 'number' && typeof vb === 'number') {
        if (Math.abs(va - vb) > 1) return false;
      } else if (va != vb) return false;
    }
  }
  return true;
}
