import { VirtualTimeScheduler } from 'rxjs';
import { formatValue } from './format';
import type {
  Emission,
  LaneRole,
  RecordedLane,
  RecordedScenario,
  Scenario,
  StreamDef,
} from './types';

/**
 * シナリオを VirtualTimeScheduler 上で同期的に実行し、
 * 各ストリームが「いつ・何を」emit したかを記録する。
 *
 * 実時間を待たずに全タイムラインが確定するので、再生は何度でも・任意の速度で行える。
 * 使っているのは本物の RxJS オペレーターなので、挙動はライブラリそのまま。
 *
 * 【記録方式 / cold 専用】各レーンを「独立に購読」して記録する。
 * cold ストリームは購読ごとに同じ動きをするため、これで表示と実態が一致する。
 *
 * 【hot / 本物の Promise / 任意の非同期コード】これらはこの同期実行では捕まえられない
 * (Promise は仮想時計では解決しない、hot は購読タイミングで見える値が変わる)。
 * その場合は recordLive()(実時間で実際に走らせ、tap で観測する)を使う。
 * 戻り値の型(RecordedScenario)は共通なので、描画側(diagram.ts)は両方で使い回せる。
 */
export function record(scenario: Scenario): RecordedScenario {
  const scheduler = new VirtualTimeScheduler();
  // interval など完了しないストリームでも flush() が止まるよう、仮想時間の上限を設ける。
  scheduler.maxFrames = scenario.duration;

  const { sources, output } = scenario.build(scheduler);

  const targets: Array<{ def: StreamDef; role: LaneRole }> = [
    ...sources.map((def) => ({ def, role: 'source' as const })),
    { def: output, role: 'output' as const },
  ];

  // flush() の前に全ストリームを購読しておく(購読時点でスケジューラに発火が予約される)。
  const lanes: RecordedLane[] = targets.map(({ def, role }) => {
    const emissions: Emission[] = [];
    def.obs.subscribe({
      next: (v) =>
        emissions.push({ time: scheduler.now(), value: formatValue(v), kind: 'next' }),
      error: (e) =>
        emissions.push({ time: scheduler.now(), value: formatValue(e), kind: 'error' }),
      complete: () => emissions.push({ time: scheduler.now(), value: '', kind: 'complete' }),
    });
    return { id: def.id, label: def.label, role, emissions };
  });

  // ここで初めて仮想時間が進み、予約された発火が同期的に実行される。
  scheduler.flush();

  return { duration: scenario.duration, lanes };
}
