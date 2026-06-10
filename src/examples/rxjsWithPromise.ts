import { from, mergeMap } from 'rxjs';
import type { LiveScenario } from '../core/types';

const delay = <T>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/**
 * RxJS と本物の Promise を混ぜたコードの確認例。
 * ストリームの各値を Promise(例: API 呼び出し)に渡し、mergeMap で並行実行する。
 */
export const rxjsWithPromiseExample: LiveScenario = {
  id: 'rxjs-with-promise',
  title: 'RxJS × Promise — 各値を並行に非同期処理',
  summary:
    'ストリームの各値を Promise(例: API 呼び出し)に渡し、mergeMap で並行に実行する。id=1,2,3 がそれぞれ 200ms,400ms,600ms 後に解決し、終わった順に出る様子を実時間で確認できる。',
  timeout: 2000,
  code: `from([1, 2, 3]).pipe(
  // 各 id を「id×200ms かかる Promise」に変換し、並行に実行
  mergeMap((id) => from(delay(id * 200, 'res' + id))),
)`,
  run: (probe) => {
    const out$ = from([1, 2, 3]).pipe(
      mergeMap((id) => from(delay(id * 200, `res${id}`))),
    );
    return probe('mergeMap→Promise', out$, 'output');
  },
};
