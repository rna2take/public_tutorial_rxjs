/**
 * RxJS が emit した任意の値を、マーブルに載せる短い文字列へ変換する。
 * combineLatest のような配列(タプル)も [a,b] の形で読めるようにする。
 */
export function formatValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return `[${value.map(formatValue).join(',')}]`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
