import { record } from '../core/recorder';
import { recordLive } from '../core/recordLive';
import type { LiveScenario, Scenario, VizEntry } from '../core/types';
import { mergeExample } from './merge';
import { concatExample } from './concat';
import { combineLatestExample } from './combineLatest';
import { switchMapExample } from './switchMap';
import { debounceTimeExample } from './debounceTime';
import { promiseAllExample } from './promiseAll';
import { rxjsWithPromiseExample } from './rxjsWithPromise';
import { errorHandlingExample } from './errorHandling';
import { asyncAwaitExample } from './asyncAwait';

/**
 * cold(仮想時間で一瞬に計算)シナリオ。
 * 純粋な RxJS のオペレーターを学ぶ用。recorder.test.ts でも使う。
 */
export const scenarios: Scenario[] = [
  mergeExample,
  concatExample,
  combineLatestExample,
  switchMapExample,
  debounceTimeExample,
];

/**
 * live(実時間で実際に実行)シナリオ。
 * 本物の Promise / async-await / エラー / 任意の非同期を含む「自分のコードの動作確認」用。
 * 下の例は一部にすぎず、run() に書いたコードは何でもそのまま動かして記録できる。
 */
export const liveScenarios: LiveScenario[] = [
  promiseAllExample,
  rxjsWithPromiseExample,
  errorHandlingExample,
  asyncAwaitExample,
];

function coldEntry(s: Scenario): VizEntry {
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    code: s.code,
    kind: 'cold',
    load: () => Promise.resolve(record(s)),
  };
}

function liveEntry(s: LiveScenario): VizEntry {
  return {
    id: s.id,
    title: s.title,
    summary: s.summary,
    code: s.code,
    kind: 'live',
    load: () => recordLive(s),
  };
}

/**
 * 一覧に並ぶ全項目(cold が先、live が後)。
 * オペレーターを足すなら cold の Scenario を、自分のコードを確認するなら
 * live の LiveScenario を作って、対応する配列に追加するだけ。
 */
export const entries: VizEntry[] = [
  ...scenarios.map(coldEntry),
  ...liveScenarios.map(liveEntry),
];
