import { describe, expect, it } from 'vitest';
import { record } from './recorder';
import { scenarios } from '../examples';
import type { Emission, RecordedScenario } from './types';

/** 発火を "時刻:値"(完了は "時刻:|")の文字列にして比較しやすくする。 */
function serialize(emissions: Emission[]): string[] {
  return emissions.map((e) => {
    if (e.kind === 'complete') return `${e.time}:|`;
    if (e.kind === 'error') return `${e.time}:#${e.value}`;
    return `${e.time}:${e.value}`;
  });
}

function recordById(id: string): RecordedScenario {
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario) throw new Error(`scenario not found: ${id}`);
  return record(scenario);
}

function lane(recorded: RecordedScenario, id: string): string[] {
  const found = recorded.lanes.find((l) => l.id === id);
  if (!found) throw new Error(`lane not found: ${id}`);
  return serialize(found.emissions);
}

describe('record() は本物の RxJS を仮想時間で実行し、設計どおりの時刻に発火する', () => {
  it('merge — 2 本を並行に合流し、発火時刻はそのまま保たれる', () => {
    const r = recordById('merge');
    expect(lane(r, 'out')).toEqual([
      '0:A0',
      '500:B0',
      '1000:A1',
      '1500:B1',
      '2000:A2',
      '2500:B2',
      '2500:|',
    ]);
  });

  it('concat — a$ が完了するまで b$ は流れず、b$ の値は後ろにずれる', () => {
    const r = recordById('concat');
    // 入力 b$ は本来 200/600/1000 に出る
    expect(lane(r, 'b')).toEqual(['200:B0', '600:B1', '1000:B2', '1000:|']);
    // 出力では a$ 完了(800)後にずれて流れる
    expect(lane(r, 'out')).toEqual([
      '0:A0',
      '400:A1',
      '800:A2',
      '1000:B0',
      '1400:B1',
      '1800:B2',
      '1800:|',
    ]);
  });

  it('combineLatest — 両方が出るまで沈黙し、以後は最新値の組を流す', () => {
    const r = recordById('combineLatest');
    expect(lane(r, 'out')).toEqual([
      '500:[A0,B0]',
      '1000:[A1,B0]',
      '1500:[A1,B1]',
      '2000:[A2,B1]',
      '2000:|',
    ]);
  });

  it('switchMap — q が来た瞬間 p の内側が打ち切られ、p3 は出ない', () => {
    const r = recordById('switchMap');
    expect(lane(r, 'out')).toEqual([
      '0:p0',
      '300:p1',
      '600:p2', // ← p3(900)は q(800)によりキャンセルされる
      '800:q0',
      '1100:q1',
      '1400:q2',
      '1700:q3',
      '2400:r0',
      '2700:r1',
      '3000:r2',
      '3300:r3',
      '3300:|',
    ]);
  });

  it('debounceTime — バーストは最後の 1 個に間引かれる(完了時は保留値を即時に流す)', () => {
    const r = recordById('debounceTime');
    expect(lane(r, 'out')).toEqual([
      '500:c', // a,b,c のバースト → c の 300ms 後
      '1300:e', // d,e のバースト → e の 300ms 後
      '1700:f', // 単発 f は source 完了時にそのまま流れる
      '1700:|',
    ]);
  });
});
