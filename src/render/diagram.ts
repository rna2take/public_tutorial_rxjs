import type { RecordedLane, RecordedScenario } from '../core/types';

const SVG_NS = 'http://www.w3.org/2000/svg';

// SVG 内部の座標系(viewBox)。実際の表示幅は CSS で 100% に伸縮させる。
const LABEL_W = 170; // 左側のラベル領域
const PLOT_W = 700; // タイムラインの描画幅
const PLOT_RIGHT_PAD = 36; // 矢印のはみ出し分
const LANE_H = 70; // 1 レーンの高さ
const TOP_PAD = 22;
const BOTTOM_PAD = 22;
const MARBLE_R = 16;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  return node;
}

/** 再生ヘッドが時刻を通過したら表示する要素(マーブル / 完了バー)。 */
interface Revealable {
  time: number;
  node: SVGElement;
}

export type PlayState = 'idle' | 'playing' | 'paused' | 'done';

/**
 * 録画済みシナリオを 1 個の SVG として描画し、再生ヘッドのアニメーションを制御する。
 * 描画(SVG 生成)と時間進行(requestAnimationFrame)だけを担当し、RxJS には依存しない。
 */
export class DiagramPlayer {
  private readonly svg: SVGSVGElement;
  private readonly playhead: SVGLineElement;
  private readonly revealables: Revealable[] = [];
  private readonly duration: number;

  private rafId = 0;
  private startReal = 0; // 再生開始時の実時刻(performance.now)
  private elapsed = 0; // 経過した仮想時間(ms)
  private speed = 1; // 仮想ms / 実ms
  private state: PlayState = 'idle';
  private readonly onState?: (state: PlayState) => void;

  constructor(
    container: HTMLElement,
    recorded: RecordedScenario,
    onState?: (state: PlayState) => void,
  ) {
    this.duration = recorded.duration;
    this.onState = onState;

    const width = LABEL_W + PLOT_W + PLOT_RIGHT_PAD;
    const height = TOP_PAD + recorded.lanes.length * LANE_H + BOTTOM_PAD;

    this.svg = svg('svg', {
      viewBox: `0 0 ${width} ${height}`,
      class: 'diagram',
      preserveAspectRatio: 'xMidYMid meet',
    });

    // 軸の先端に付ける矢印マーカー。
    const defs = svg('defs');
    const marker = svg('marker', {
      id: 'arrow',
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: 'auto',
    });
    marker.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#5b6678' }));
    defs.appendChild(marker);
    this.svg.appendChild(defs);

    recorded.lanes.forEach((lane, i) => {
      this.renderLane(lane, TOP_PAD + i * LANE_H);
    });

    // 再生ヘッド(全レーンを縦に貫く線)。最後に追加して最前面に置く。
    this.playhead = svg('line', {
      class: 'playhead',
      x1: LABEL_W,
      x2: LABEL_W,
      y1: TOP_PAD - 6,
      y2: height - BOTTOM_PAD + 6,
    });
    this.svg.appendChild(this.playhead);

    container.appendChild(this.svg);
    this.reset();
  }

  get playState(): PlayState {
    return this.state;
  }

  play(): void {
    if (this.state === 'playing') return;
    if (this.state === 'done') this.elapsed = 0;
    this.startReal = performance.now() - this.elapsed / this.speed;
    this.setState('playing');
    this.tick();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    cancelAnimationFrame(this.rafId);
    this.setState('paused');
  }

  reset(): void {
    cancelAnimationFrame(this.rafId);
    this.elapsed = 0;
    this.draw();
    this.setState('idle');
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    // 再生中に速度を変えても位置が飛ばないよう、開始時刻を逆算し直す。
    if (this.state === 'playing') {
      this.startReal = performance.now() - this.elapsed / this.speed;
    }
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.svg.remove();
  }

  private timeToX(time: number): number {
    return LABEL_W + (time / this.duration) * PLOT_W;
  }

  private renderLane(lane: RecordedLane, laneTop: number): void {
    const axisY = laneTop + LANE_H / 2;

    const label = svg('text', {
      x: LABEL_W - 18,
      y: axisY,
      class: `lane-label lane-label--${lane.role}`,
      'text-anchor': 'end',
      'dominant-baseline': 'middle',
    });
    label.textContent = lane.label;
    this.svg.appendChild(label);

    this.svg.appendChild(
      svg('line', {
        class: 'axis',
        x1: LABEL_W,
        y1: axisY,
        x2: LABEL_W + PLOT_W + 18,
        y2: axisY,
        'marker-end': 'url(#arrow)',
      }),
    );

    for (const emission of lane.emissions) {
      const x = this.timeToX(emission.time);

      if (emission.kind === 'complete') {
        const bar = svg('line', {
          class: 'complete',
          x1: x,
          x2: x,
          y1: axisY - 17,
          y2: axisY + 17,
        });
        this.svg.appendChild(bar);
        this.revealables.push({ time: emission.time, node: bar });
        continue;
      }

      // translate を持つ外側 <g> と、CSS で scale させる内側 <g> を分ける。
      // (CSS transform は SVG の transform 属性を上書きするため、役割を分離する)
      const positioned = svg('g', { transform: `translate(${x}, ${axisY})` });
      const marble = svg('g', { class: `marble marble--${lane.role}` });

      if (emission.kind === 'error') {
        marble.classList.add('marble--error');
        marble.appendChild(svg('line', { x1: -11, y1: -11, x2: 11, y2: 11 }));
        marble.appendChild(svg('line', { x1: -11, y1: 11, x2: 11, y2: -11 }));
      } else {
        marble.appendChild(svg('circle', { r: MARBLE_R }));
        const text = svg('text', {
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
        });
        text.textContent = emission.value;
        marble.appendChild(text);
      }

      positioned.appendChild(marble);
      this.svg.appendChild(positioned);
      this.revealables.push({ time: emission.time, node: marble });
    }
  }

  private tick = (): void => {
    this.elapsed = (performance.now() - this.startReal) * this.speed;
    if (this.elapsed >= this.duration) {
      this.elapsed = this.duration;
      this.draw();
      this.setState('done');
      return;
    }
    this.draw();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const t = this.elapsed;
    const x = this.timeToX(t);
    this.playhead.setAttribute('x1', String(x));
    this.playhead.setAttribute('x2', String(x));
    // 停止位置(t=0)では何も見せない。再生ヘッドが通過した発火だけを表示する。
    const live = t > 0;
    for (const item of this.revealables) {
      item.node.classList.toggle('is-visible', live && item.time <= t);
    }
  }

  private setState(state: PlayState): void {
    this.state = state;
    this.onState?.(state);
  }
}
