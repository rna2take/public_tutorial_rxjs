import { from } from 'rxjs';
import type { LiveScenario } from '../core/types';

// 指定ミリ秒後に値を返す「本物の」Promise(API 呼び出しなどの代わり)。
const delay = <T>(ms: number, value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

/**
 * 本物の Promise.all を実際に実行して可視化する live シナリオ。
 * 自分のコードを確認したいときの雛形にもなる(run の中に書くだけ)。
 */
export const promiseAllExample: LiveScenario = {
  id: 'promise-all',
  title: 'Promise.all — 本物の Promise を実行して確認',
  summary:
    '本物の Promise.all を実際に走らせて可視化する。A(300ms)と B(500ms)の両方が解決した時点(=遅い方の 500ms)で結果 [A,B] が出る。モデルではなく実物を実時間で記録している。',
  timeout: 2000,
  code: `const delay = (ms, v) =>
  new Promise((res) => setTimeout(() => res(v), ms));

const taskA = delay(300, 'A'); // 300ms かかる
const taskB = delay(500, 'B'); // 500ms かかる

// 本物の Promise.all を RxJS の from で受ける
const out$ = from(Promise.all([taskA, taskB]));
// → 500ms で ['A', 'B'] が出る`,
  run: (probe) => {
    const taskA = delay(300, 'A');
    const taskB = delay(500, 'B');
    const all = Promise.all([taskA, taskB]);
    // 各タスクと、両方を待つ Promise.all をそれぞれ観測する。
    return [
      probe('taskA', from(taskA)),
      probe('taskB', from(taskB)),
      probe('Promise.all', from(all), 'output'),
    ];
  },
};
