import './style.css';
import { entries } from './examples';
import { DiagramPlayer, type PlayState } from './render/diagram';
import type { VizEntry } from './core/types';

const listEl = document.getElementById('scenario-list') as HTMLElement;
const stageEl = document.getElementById('stage') as HTMLElement;

let current: DiagramPlayer | null = null;
let activeBtn: HTMLButtonElement | null = null;
// 記録は非同期(live は実時間)。素早く切り替えたとき、古い記録結果を捨てるためのトークン。
let loadToken = 0;

/** "merge — 説明" を ["merge", "説明"] に分ける。 */
function splitTitle(title: string): [string, string] {
  const idx = title.indexOf(' — ');
  return idx === -1 ? [title, ''] : [title.slice(0, idx), title.slice(idx + 3)];
}

function buildList(): void {
  for (const entry of entries) {
    const [name, sub] = splitTitle(entry.title);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scenario-link';

    const nameEl = document.createElement('span');
    nameEl.className = 'scenario-link__name';
    nameEl.textContent = name;

    const subEl = document.createElement('span');
    subEl.className = 'scenario-link__sub';
    subEl.textContent = sub;

    const tag = document.createElement('span');
    tag.className = `scenario-link__tag scenario-link__tag--${entry.kind}`;
    tag.textContent = entry.kind === 'live' ? '実時間' : '仮想時間';

    btn.append(nameEl, subEl, tag);
    btn.addEventListener('click', () => selectEntry(entry, btn));
    listEl.appendChild(btn);
  }
}

function selectEntry(entry: VizEntry, btn: HTMLButtonElement): void {
  if (activeBtn === btn) return;
  activeBtn?.classList.remove('is-active');
  btn.classList.add('is-active');
  activeBtn = btn;
  void renderEntry(entry);
}

async function renderEntry(entry: VizEntry): Promise<void> {
  current?.destroy();
  current = null;
  stageEl.replaceChildren();

  const [name, sub] = splitTitle(entry.title);

  // 見出し + 説明
  const head = document.createElement('div');
  head.className = 'scenario-head';
  const h2 = document.createElement('h2');
  const code = document.createElement('code');
  code.textContent = name;
  const subSpan = document.createElement('span');
  subSpan.className = 'scenario-head__sub';
  subSpan.textContent = sub;
  h2.append(code, subSpan);
  const summary = document.createElement('p');
  summary.className = 'scenario-summary';
  summary.textContent = entry.summary;
  head.append(h2, summary);

  // 操作ボタン(記録完了まで無効)
  const controls = document.createElement('div');
  controls.className = 'controls';

  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn btn--primary';
  playBtn.textContent = '▶ 再生';
  playBtn.disabled = true;

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn';
  resetBtn.textContent = '↺ リセット';
  resetBtn.disabled = true;

  // live は毎回実時間で走らせ直すため、再記録ボタンを出す。
  let rerecordBtn: HTMLButtonElement | null = null;
  if (entry.kind === 'live') {
    rerecordBtn = document.createElement('button');
    rerecordBtn.type = 'button';
    rerecordBtn.className = 'btn';
    rerecordBtn.textContent = '⟳ 再記録';
    rerecordBtn.disabled = true;
  }

  const speedLabel = document.createElement('label');
  speedLabel.className = 'speed';
  speedLabel.append('速度');
  const speedSel = document.createElement('select');
  for (const v of [0.5, 1, 2]) {
    const opt = document.createElement('option');
    opt.value = String(v);
    opt.textContent = `${v}×`;
    if (v === 1) opt.selected = true;
    speedSel.appendChild(opt);
  }
  speedLabel.appendChild(speedSel);

  controls.append(playBtn, resetBtn);
  if (rerecordBtn) controls.append(rerecordBtn);
  controls.append(speedLabel);

  // 凡例
  const legend = document.createElement('div');
  legend.className = 'legend';
  legend.innerHTML = `
    <span class="legend__item"><span class="legend__dot legend__dot--source"></span>入力 / 観測点</span>
    <span class="legend__item"><span class="legend__dot legend__dot--output"></span>出力</span>
    <span class="legend__item"><span class="legend__bar"></span>完了</span>`;

  // 図の描画先
  const diagramWrap = document.createElement('div');
  diagramWrap.className = 'diagram-wrap';

  // ソースコード
  const codeBlock = document.createElement('pre');
  codeBlock.className = 'code';
  const codeContent = document.createElement('code');
  codeContent.textContent = entry.code;
  codeBlock.appendChild(codeContent);

  stageEl.append(head, controls, legend, diagramWrap, codeBlock);

  const setControlsEnabled = (enabled: boolean): void => {
    playBtn.disabled = !enabled;
    resetBtn.disabled = !enabled;
    if (rerecordBtn) rerecordBtn.disabled = !enabled;
  };

  // 記録 → プレイヤー生成。cold は一瞬、live は実時間。
  const load = async (): Promise<void> => {
    const token = ++loadToken;
    current?.destroy();
    current = null;
    setControlsEnabled(false);
    diagramWrap.replaceChildren(makeLoading(entry.kind));

    const recorded = await entry.load();
    if (token !== loadToken) return; // 別シナリオ / 再記録に切り替わっていたら破棄

    diagramWrap.replaceChildren();
    const player = new DiagramPlayer(diagramWrap, recorded, (state) =>
      syncPlayButton(state, playBtn),
    );
    current = player;
    setControlsEnabled(true);
    syncPlayButton(player.playState, playBtn);
  };

  playBtn.addEventListener('click', () => {
    if (!current) return;
    if (current.playState === 'playing') current.pause();
    else current.play();
  });
  resetBtn.addEventListener('click', () => current?.reset());
  speedSel.addEventListener('change', () => current?.setSpeed(Number(speedSel.value)));
  rerecordBtn?.addEventListener('click', () => void load());

  await load();
}

function makeLoading(kind: VizEntry['kind']): HTMLElement {
  const div = document.createElement('div');
  div.className = 'loading';
  div.textContent = kind === 'live' ? '⏱ 実時間で記録中…' : '記録中…';
  return div;
}

function syncPlayButton(state: PlayState, playBtn: HTMLButtonElement): void {
  if (state === 'playing') playBtn.textContent = '⏸ 一時停止';
  else if (state === 'done') playBtn.textContent = '▶ もう一度';
  else playBtn.textContent = '▶ 再生';
}

buildList();
listEl.querySelector<HTMLButtonElement>('.scenario-link')?.click();
