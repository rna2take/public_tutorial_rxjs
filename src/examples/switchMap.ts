import { map, switchMap, take, timer } from 'rxjs';
import type { Scenario } from '../core/types';
import { timeline } from './_helpers';

export const switchMapExample: Scenario = {
  id: 'switchMap',
  title: 'switchMap — 新しい値が来たら前の内側をキャンセル',
  summary:
    '外側の値ごとに内側ストリームを開始するが、次の外側が来た瞬間に前の内側を打ち切る。p の内側は途中でキャンセルされ(p3 が出ない)、最後の r は最後まで流れる。',
  duration: 3600,
  code: `import { switchMap, take, map, timer } from 'rxjs';

const out$ = clicks$.pipe(
  // 新しいクリックが来たら前の内側 timer を捨てて貼り直す
  switchMap((label) =>
    timer(0, 300).pipe(take(4), map((i) => label + i)),
  ),
);`,
  build: (scheduler) => {
    const clicks$ = timeline(scheduler, [
      [0, 'p'],
      [800, 'q'],
      [2400, 'r'],
    ]);
    const inner = (label: string) =>
      timer(0, 300, scheduler).pipe(
        take(4),
        map((i) => `${label}${i}`),
      );
    return {
      sources: [{ id: 'clicks', label: 'clicks$', obs: clicks$ }],
      output: {
        id: 'out',
        label: 'switchMap',
        obs: clicks$.pipe(switchMap((label) => inner(label as string))),
      },
    };
  },
};
