import { concat } from 'rxjs';
import type { Scenario } from '../core/types';
import { timeline } from './_helpers';

export const concatExample: Scenario = {
  id: 'concat',
  title: 'concat — 前が完了してから次を流す',
  summary:
    'merge と違い、先頭のストリームが「完了」するまで次のストリームは購読されない。b$ の値は本来の時刻ではなく、a$ の完了後にずれて流れる(時系列の直列化)。',
  duration: 2200,
  code: `import { concat } from 'rxjs';

// a$ が完了してから b$ を購読する(直列)
const out$ = concat(a$, b$);`,
  build: (scheduler) => {
    const a$ = timeline(scheduler, [
      [0, 'A0'],
      [400, 'A1'],
      [800, 'A2'],
    ]);
    const b$ = timeline(scheduler, [
      [200, 'B0'],
      [600, 'B1'],
      [1000, 'B2'],
    ]);
    return {
      sources: [
        { id: 'a', label: 'a$', obs: a$ },
        { id: 'b', label: 'b$', obs: b$ },
      ],
      output: { id: 'out', label: 'concat', obs: concat(a$, b$) },
    };
  },
};
