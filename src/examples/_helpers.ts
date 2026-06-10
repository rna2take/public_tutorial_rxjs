import { map, merge, timer } from 'rxjs';
import type { Observable, SchedulerLike } from 'rxjs';

/**
 * [時刻ms, 値] の配列から、その通りに emit してから完了する cold observable を作る。
 * 各値を「指定時刻に 1 回だけ発火するタイマー」にして merge することで実現する。
 * 渡されたスケジューラを使うので、VirtualTimeScheduler 上で同期実行できる。
 */
export function timeline<T>(
  scheduler: SchedulerLike,
  entries: ReadonlyArray<readonly [number, T]>,
): Observable<T> {
  return merge(...entries.map(([t, value]) => timer(t, scheduler).pipe(map(() => value))));
}
