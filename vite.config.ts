import { defineConfig } from 'vite';

// GitHub Pages（プロジェクトページ）では https://<user>.github.io/<repo>/ で配信されるため、
// 静的アセットの参照先をリポジトリ名のサブパスに合わせる。
// ローカル開発（npm run dev）では base は影響しない。
export default defineConfig({
  base: '/public_tutorial_rxjs/',
});
