# RxJS Visualizer

RxJS のストリームが **「いつ・どの順で・並行に」** 流れるかを、マーブル図のアニメーションで可視化するツールです。2 つの使い方があります。

1. **仮想時間モード（cold）** — 純粋な RxJS オペレーターの挙動を学ぶ。一瞬で計算するので待ち時間ゼロ・完全に再現可能。
2. **実時間モード（live）** — **自分が書いた任意のコードを実際に走らせて**、意図どおり動くかを目で確認する。RxJS のどんな組み合わせでも、本物の Promise / async-await / `setTimeout` / `fetch` / エラー / hot ストリームでも、`run()` に書いたものはそのまま動く（`Promise.all` はその一例にすぎない）。

どちらも本物の RxJS / Promise を動かした結果を、再生ヘッド付きのタイムラインで再生します（フェイクのアニメーションではありません）。

## 収録している例

### 仮想時間モード（cold・RxJS オペレーター学習）

| オペレーター | 学べること |
| --- | --- |
| `merge` | 複数ストリームを並行に合流（時刻はそのまま） |
| `concat` | 前が完了してから次を流す（直列化） |
| `combineLatest` | 各ストリームの最新値を組み合わせる |
| `switchMap` | 新しい値が来たら前の内側ストリームをキャンセル |
| `debounceTime` | 値が落ち着くまで待って間引く |

### 実時間モード（live・任意のコードの動作確認）

`run()` に書いたコードを実際に走らせて記録する。下表は**多様さを示すための一例**で、これらに限らない。

| 例 | 内容 |
| --- | --- |
| `Promise.all` | 本物の `Promise.all` を実行し、両方解決後に結果が出る様子を確認 |
| `RxJS × Promise` | ストリームの各値を Promise に渡し `mergeMap` で並行実行 |
| エラーと回復 | 途中で失敗する処理（reject）を実行し、`catchError` で回復する様子を確認 |
| `async / await` | `defer` の中の普通の async/await コードを確認（RxJS でなくてもよい） |

## 開発

前提: Node.js は最新 LTS を使用。バージョンは `.node-version` に固定しています（現在 24.16.0 / Krypton）。nodenv なら `nodenv install` で導入できます。CI も `.node-version` を参照するので、ローカルと一致します。

```bash
npm install      # 依存をインストール
npm run dev      # 開発サーバ（http://localhost:5173）
npm test         # 発火の時刻・順序を検証（Vitest）
npm run build    # 型チェック + 本番ビルド（dist/ に出力）
npm run preview  # ビルド結果をローカルで確認
```

挙動は `src/core/recorder.test.ts`（cold）と `src/core/recordLive.test.ts`（live・本物の Promise.all）で検証しています（CI でも実行されます）。

## アーキテクチャ

RxJS のロジック・記録・座標計算・描画を分離しているので、人がレビュー・拡張しやすい構成です。記録方式が 2 つ（cold / live）あっても、描画側は共通の `RecordedScenario` だけを見ます。

```
src/
  core/
    types.ts       … 共通の型定義
    format.ts      … emit 値を表示文字列へ変換
    recorder.ts    … 【cold】仮想時間で RxJS を一瞬で実行し発火を記録
    recordLive.ts  … 【live】実時間で実際に走らせ、probe(tap) で発火を記録
  render/
    diagram.ts     … 記録結果を SVG 描画し、再生ヘッドをアニメーション（DOM のみ）
  examples/
    _helpers.ts    … [時刻, 値] からストリームを作るヘルパー（cold 用）
    merge.ts ...   … cold オペレーターの定義
    promiseAll.ts  … live シナリオ（本物の Promise.all）。自分のコードの雛形にもなる
    index.ts       … cold / live を VizEntry として一覧化
  app.ts           … 上記を組み立てる薄い UI 層（記録は非同期、live は実時間）
```

### 新しいオペレーターを追加する（cold）

1. `src/examples/` に `xxx.ts` を作り、`Scenario` を 1 つ export する
2. `src/examples/index.ts` の `scenarios` 配列に追加する

### 自分のコードの動作を確認する（live）

**任意のコード**（RxJS の任意の組み合わせ・本物の Promise・async/await・`setTimeout`・`fetch`・エラーなど）を、書いたまま走らせて確認できます。

1. `src/examples/` に `LiveScenario` を作る。`run(probe)` の中に確認したいコードを書き、**見たいストリームを `probe('ラベル', 観測対象)` で囲む**（`tap` を差し込むだけなので挙動は変わらない）
2. `src/examples/index.ts` の `liveScenarios` 配列に追加する

```ts
export const myCheck: LiveScenario = {
  id: 'my-check',
  title: 'My check — 確認したい処理',
  summary: '...',
  timeout: 2000, // この時間で記録を打ち切る
  code: '/* 画面に表示するコード片 */',
  run: (probe) => {
    const a = delay(300, 'A'); // 本物の Promise でも何でもよい
    const out$ = from(Promise.all([a, delay(500, 'B')]));
    return probe('Promise.all', out$, 'output');
  },
};
```

雛形は `src/examples/promiseAll.ts` を参照。実時間で動かすため、記録には実際の秒数がかかります（`timeout` で上限を設定）。

## GitHub Pages への公開

`main` ブランチへ push すると、`.github/workflows/deploy.yml` が自動でビルドして Pages へデプロイします。

初回だけ、リポジトリの **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」** に設定してください。

公開 URL: `https://rna2take.github.io/public_tutorial_rxjs/`

> リポジトリ名を変えた場合は、`vite.config.ts` の `base` を `/<新しいリポジトリ名>/` に合わせてください。

## 制限と今後の予定

- **live は実時間**: 本物の非同期を動かすため、記録に実際の秒数がかかります（`fetch` のように時間で動かない処理も、待ち時間ぶんだけ素直に待ちます）。完全な再現性はなく、実行ごとに数 ms の揺れが出ます（`再記録` で取り直せます）。
- **Node とブラウザの違い**: 値・順序・ロジック（Promise の解決順、async/await、RxJS オペレーターの意味）は仕様で決まっており Node でもブラウザでも同じです（cold はそもそも実時間を使わない純粋計算なので、Vitest の検証結果がそのままブラウザに当てはまります）。違うのは live の実時間タイミングだけで、特に **ブラウザは非アクティブなタブでタイマーを間引く** ため、live を記録する間はタブを前面にしておいてください。`requestAnimationFrame`（animationFrameScheduler）はブラウザのみです。
- **hot / 共有ストリーム**（`Subject`・`share()`・DOM イベント）は live モードで扱えます（1 本の root を返し、共有点を `probe` で観測する）。同一シナリオ内で cold 方式と混在させないこと。

## ライセンス

[Apache License 2.0](./LICENSE)
