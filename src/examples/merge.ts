import { merge } from 'rxjs';
import type { Scenario } from '../core/types';
import { timeline } from './_helpers';

export const mergeExample: Scenario = {
  id: 'merge',
  title: 'merge — 複数ストリームを並行に合流',
  summary:
    '複数の入力ストリームを同時に購読し、どれかが値を出すたびにそのまま出力へ流す。並行(parallel)に走る 2 本が 1 本に混ざり、発火時刻はそのまま保たれる。',
  duration: 3200,
  code: `import { merge } from 'rxjs';

// a$ と b$ を同時に購読し、来た順にそのまま流す
const out$ = merge(a$, b$);`,
  build: (scheduler) => {
    const a$ = timeline(scheduler, [
      [0, 'A0'],
      [1000, 'A1'],
      [2000, 'A2'],
    ]);
    const b$ = timeline(scheduler, [
      [500, 'B0'],
      [1500, 'B1'],
      [2500, 'B2'],
    ]);
    return {
      sources: [
        { id: 'a', label: 'a$', obs: a$ },
        { id: 'b', label: 'b$', obs: b$ },
      ],
      output: { id: 'out', label: 'merge', obs: merge(a$, b$) },
    };
  },
};
