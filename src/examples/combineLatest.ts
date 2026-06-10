import { combineLatest } from 'rxjs';
import type { Scenario } from '../core/types';
import { timeline } from './_helpers';

export const combineLatestExample: Scenario = {
  id: 'combineLatest',
  title: 'combineLatest — 各ストリームの最新値を組み合わせ',
  summary:
    'どれか 1 本が値を出すたびに、全ストリームの「最新値」をまとめて配列で流す。全ストリームが最低 1 回 emit するまでは何も出ない点に注目。',
  duration: 2600,
  code: `import { combineLatest } from 'rxjs';

// どちらかが更新されるたび [aの最新, bの最新] を流す
const out$ = combineLatest([a$, b$]);`,
  build: (scheduler) => {
    const a$ = timeline(scheduler, [
      [0, 'A0'],
      [1000, 'A1'],
      [2000, 'A2'],
    ]);
    const b$ = timeline(scheduler, [
      [500, 'B0'],
      [1500, 'B1'],
    ]);
    return {
      sources: [
        { id: 'a', label: 'a$', obs: a$ },
        { id: 'b', label: 'b$', obs: b$ },
      ],
      output: { id: 'out', label: 'combineLatest', obs: combineLatest([a$, b$]) },
    };
  },
};
