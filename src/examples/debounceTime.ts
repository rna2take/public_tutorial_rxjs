import { debounceTime } from 'rxjs';
import type { Scenario } from '../core/types';
import { timeline } from './_helpers';

export const debounceTimeExample: Scenario = {
  id: 'debounceTime',
  title: 'debounceTime — 値が落ち着くまで待つ',
  summary:
    '値が来てから指定時間(ここでは 300ms)新しい値が来なければ、最後の値だけを流す。連続入力(バースト)は最後の 1 個に間引かれる。検索ボックスの入力確定などで使う。',
  duration: 2300,
  code: `import { debounceTime } from 'rxjs';

// 300ms 何も来なくなったら、直前の値だけを流す
const out$ = source$.pipe(debounceTime(300));`,
  build: (scheduler) => {
    const source$ = timeline(scheduler, [
      [0, 'a'],
      [100, 'b'],
      [200, 'c'],
      [900, 'd'],
      [1000, 'e'],
      [1700, 'f'],
    ]);
    return {
      sources: [{ id: 'source', label: 'source$', obs: source$ }],
      output: { id: 'out', label: 'debounceTime', obs: source$.pipe(debounceTime(300, scheduler)) },
    };
  },
};
