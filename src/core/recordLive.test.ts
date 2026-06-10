import { describe, expect, it } from 'vitest';
import { recordLive } from './recordLive';
import { promiseAllExample } from '../examples/promiseAll';
import { errorHandlingExample } from '../examples/errorHandling';
import type { Emission, RecordedLane, RecordedScenario } from './types';

function laneByLabel(recorded: RecordedScenario, label: string): RecordedLane {
  const lane = recorded.lanes.find((l) => l.label === label);
  if (!lane) throw new Error(`lane not found: ${label}`);
  return lane;
}

function firstNext(lane: RecordedLane): Emission {
  const emission = lane.emissions.find((e) => e.kind === 'next');
  if (!emission) throw new Error(`no next emission in lane: ${lane.label}`);
  return emission;
}

describe('recordLive は本物の Promise を実時間で実行して記録する', () => {
  it('Promise.all は両方解決後(遅い方=500ms付近)に [A,B] を出す', async () => {
    const recorded = await recordLive(promiseAllExample);

    const a = firstNext(laneByLabel(recorded, 'taskA'));
    const b = firstNext(laneByLabel(recorded, 'taskB'));
    const all = firstNext(laneByLabel(recorded, 'Promise.all'));

    // 値は本物の Promise が返したものそのまま
    expect(a.value).toBe('A');
    expect(b.value).toBe('B');
    expect(all.value).toBe('[A,B]');

    // A(300ms)は B(500ms)より先に解決する
    expect(a.time).toBeLessThan(b.time);
    // Promise.all は遅い方(B)が解決してから出る。実時間なので誤差を許容して比較。
    expect(all.time).toBeGreaterThanOrEqual(a.time);
    expect(Math.abs(all.time - b.time)).toBeLessThan(150);
  });

  it('失敗する処理はエラー(×)として記録され、catchError が回復値を流す', async () => {
    const recorded = await recordLive(errorHandlingExample);

    // risky$ は reject されるのでエラーとして記録される
    const risky = laneByLabel(recorded, 'risky$');
    expect(risky.emissions.some((e) => e.kind === 'error')).toBe(true);

    // catchError がエラーを受けて回復値を流す
    const safe = firstNext(laneByLabel(recorded, 'catchError'));
    expect(safe.value).toBe('recovered: boom');
  });
});
