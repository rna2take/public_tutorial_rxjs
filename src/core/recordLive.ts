import { Subscription, tap } from 'rxjs';
import type { Observable } from 'rxjs';
import { formatValue } from './format';
import type { LaneRole, LiveScenario, Probe, RecordedLane, RecordedScenario } from './types';

const END_PADDING = 150; // 最後の発火の後、少し余白をとってから再生を終える(ms)
const MIN_DURATION = 300; // 何も流れなくても再生窓が潰れないよう下限を設ける(ms)

/**
 * シナリオを「実時間」で実際に走らせ、発火を記録する。
 *
 * 本物の Promise.all / setTimeout / fetch / hot ストリームなどを含む任意のコードを、
 * 書いたままの挙動で確認できる(cold 専用の record() と違い、実物を実行する)。
 *
 * 記録には実時間がかかる(例: 500ms かかる処理は 500ms 待つ)。
 * 記録が終われば、戻り値の RecordedScenario から何度でも・任意の速度で再生できる。
 *
 * 観測は probe() が差し込む tap だけで行うため、root を 1 本にして途中を probe で
 * 観測すれば、購読は 1 回きり。Promise の副作用や hot の共有が二重に走ることはない。
 */
export function recordLive(scenario: LiveScenario): Promise<RecordedScenario> {
  const start = performance.now();
  const lanes: RecordedLane[] = [];

  const probe: Probe = <T>(
    label: string,
    source: Observable<T>,
    role: LaneRole = 'source',
  ): Observable<T> => {
    const lane: RecordedLane = { id: `lane-${lanes.length}`, label, role, emissions: [] };
    lanes.push(lane);
    const stamp = () => performance.now() - start;
    return source.pipe(
      tap({
        next: (v) => lane.emissions.push({ time: stamp(), value: formatValue(v), kind: 'next' }),
        error: (e) => lane.emissions.push({ time: stamp(), value: formatValue(e), kind: 'error' }),
        complete: () => lane.emissions.push({ time: stamp(), value: '', kind: 'complete' }),
      }),
    );
  };

  const roots = scenario.run(probe);
  const rootList: Array<Observable<unknown>> = Array.isArray(roots) ? roots : [roots];

  const buildResult = (): RecordedScenario => {
    const times = lanes.flatMap((l) => l.emissions.map((e) => e.time));
    const maxT = times.length > 0 ? Math.max(...times) : 0;
    const duration = Math.max(Math.ceil(maxT) + END_PADDING, MIN_DURATION);
    return { duration, lanes };
  };

  return new Promise<RecordedScenario>((resolve) => {
    const sub = new Subscription();
    let pending = rootList.length;
    let settled = false;

    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      sub.unsubscribe();
      resolve(buildResult());
    };

    // root が全部 complete / error したら終了。
    const onSettled = (): void => {
      if (--pending <= 0) finish();
    };

    // 完了しない root(interval 等)に備えた打ち切り。
    const timeoutId = setTimeout(finish, scenario.timeout);

    if (rootList.length === 0) {
      finish();
      return;
    }

    for (const root of rootList) {
      sub.add(root.subscribe({ next: () => {}, error: onSettled, complete: onSettled }));
    }
  });
}
