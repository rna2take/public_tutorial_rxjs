import { defer } from 'rxjs';
import type { LiveScenario } from '../core/types';

const delay = <T>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/**
 * RxJS のオペレーターに限らず、普通の async/await コードもそのまま確認できる例。
 * defer() の中に任意の非同期ロジックを書ける。
 */
export const asyncAwaitExample: LiveScenario = {
  id: 'async-await',
  title: 'async / await — 任意の非同期ロジックを確認',
  summary:
    'defer の中で async/await を使った普通の JavaScript を書ける。ここでは 2 段階(300ms → 200ms)待って結果を返す。RxJS のオペレーターでなくても、任意の非同期コードをそのまま動かして確認できる。',
  timeout: 2000,
  code: `defer(async () => {
  await delay(300);              // 何らかの非同期処理
  const v = await delay(200, 'X');
  return 'result:' + v;          // 合計 500ms 後に出る
})`,
  run: (probe) => {
    const out$ = defer(async () => {
      await delay(300, null);
      const v = await delay(200, 'X');
      return `result:${v}`;
    });
    return probe('async/await', out$, 'output');
  },
};
