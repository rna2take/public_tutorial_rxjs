import { catchError, from, of } from 'rxjs';
import type { LiveScenario } from '../core/types';

// 指定ミリ秒後に失敗する(reject する)Promise。
const failAfter = (ms: number, message: string): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));

/**
 * 失敗する処理も含めて確認できることを示す例。
 * 成功・失敗・回復のどれもそのまま記録される(エラーは赤い × で表示)。
 */
export const errorHandlingExample: LiveScenario = {
  id: 'error-handling',
  title: 'エラーと回復 — 失敗する処理も確認できる',
  summary:
    '途中で失敗する処理(400ms で reject する Promise)を実際に走らせる。risky$ はエラー(赤い ×)で止まり、catchError がそれを受けて回復値を流す。成功も失敗もそのまま記録できる。',
  timeout: 2000,
  code: `const risky$ = from(failAfter(400, 'boom')); // 400ms で失敗

const safe$ = risky$.pipe(
  catchError((e) => of('recovered: ' + e.message)),
);`,
  run: (probe) => {
    const risky$ = from(failAfter(400, 'boom'));
    const safe$ = risky$.pipe(catchError((e) => of(`recovered: ${e.message}`)));
    return [
      probe('risky$', risky$), // 400ms でエラー
      probe('catchError', safe$, 'output'), // エラーを受けて回復値を流す
    ];
  },
};
