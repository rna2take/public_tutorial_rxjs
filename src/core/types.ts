import type { Observable, SchedulerLike } from 'rxjs';

/** 発火の種類: 値(next) / 完了(complete) / エラー(error) */
export type EmissionKind = 'next' | 'complete' | 'error';

/** 1個の発火イベント。「いつ・何が」流れたかを表す。 */
export interface Emission {
  /** 仮想時間(ms)。シナリオ開始からの経過。 */
  time: number;
  /** 表示用の文字列。complete では空文字でよい。 */
  value: string;
  kind: EmissionKind;
}

/** レーンの役割: 入力ストリームか、演算後の出力か。 */
export type LaneRole = 'source' | 'output';

/** 録画済みの 1 レーン(= 1 本のタイムライン)。 */
export interface RecordedLane {
  id: string;
  label: string;
  role: LaneRole;
  emissions: Emission[];
}

/** record() の戻り値。全レーンの発火が確定した状態。 */
export interface RecordedScenario {
  /** 仮想時間の窓(ms)。 */
  duration: number;
  lanes: RecordedLane[];
}

/** まだ購読していないストリーム定義。 */
export interface StreamDef {
  id: string;
  label: string;
  obs: Observable<unknown>;
}

/** 1 シナリオが構築する入力群と出力。 */
export interface ScenarioGraph {
  sources: StreamDef[];
  output: StreamDef;
}

/**
 * 1 つの可視化シナリオ(オペレーターのデモ)。
 * build() は与えられたスケジューラ上でストリームを組み立てて返すだけで、購読はしない。
 * 購読・記録は recorder が行う。
 *
 * 【前提】この形は cold ストリーム専用。recorder が各レーンを独立に購読するため、
 * 何回購読しても同じ動きになる cold でないと、表示と実態が一致しない。
 * hot/共有ストリームや本物の Promise を含むコードは、LiveScenario + recordLive で扱う
 * (実時間で実際に走らせて記録する)。
 */
export interface Scenario {
  id: string;
  /** 例: "merge — 複数ストリームを並行に合流"。" — " の前が短い名前。 */
  title: string;
  /** 何が起きるかの説明。 */
  summary: string;
  /** 学習者に見せる RxJS のソースコード片。 */
  code: string;
  /** 仮想時間の窓(ms)。これを超える発火は記録されない。 */
  duration: number;
  build: (scheduler: SchedulerLike) => ScenarioGraph;
}

/**
 * 観測したいストリームを「記録対象」にする関数。
 * probe(label, source) は source をそのまま返しつつ、流れた値・完了・エラーを
 * 実時間のタイムスタンプ付きで記録する(tap を差し込むだけで挙動は一切変えない)。
 * role を 'output' にすると、図で出力として色分けされる。
 */
export type Probe = <T>(
  label: string,
  source: Observable<T>,
  role?: LaneRole,
) => Observable<T>;

/**
 * 実時間で実際に走らせて記録するシナリオ。
 * 本物の Promise.all / fetch / setTimeout / hot ストリームなど、何でも含められる
 * (cold 専用の Scenario と違い、モデルではなく実物を動かして確認するための形)。
 */
export interface LiveScenario {
  id: string;
  title: string;
  summary: string;
  code: string;
  /** 記録の最大時間(ms)。完了しないストリームでもここで打ち切る。 */
  timeout: number;
  /**
   * 観測したいストリームを probe() で包み、実際に購読して走らせる root を返す。
   * 複数あれば配列で返す。1 本の root を返し、途中の点を probe で観測してもよい
   * (その場合 1 回の購読で全観測点が記録され、hot や副作用も二重実行されない)。
   */
  run: (probe: Probe) => Observable<unknown> | Array<Observable<unknown>>;
}

/**
 * 一覧に並ぶ 1 項目。cold(仮想時間で一瞬)/ live(実時間で記録)を統一的に扱う。
 * load() は常に Promise を返すので、描画側は記録方式を意識しなくてよい。
 */
export interface VizEntry {
  id: string;
  title: string;
  summary: string;
  code: string;
  kind: 'cold' | 'live';
  load: () => Promise<RecordedScenario>;
}
