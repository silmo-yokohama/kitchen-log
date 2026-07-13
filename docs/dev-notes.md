# 開発メモ（環境・実装のハマりどころ）

後続の開発セッションが同じ壁で時間を溶かさないための記録。ルールではなく既知の事実集。

## この開発機（Windows 11）の環境固有

- **Astroのデフォルトポート4321は使えない**（`listen EACCES ::1:4321`。Windowsの除外ポート帯と衝突）。`npm run dev/preview -- --port 8899` のように別ポートを指定する
- `python` コマンドは **Python 2系**。`open(..., encoding=)` は不可（`io.open`を使う）、print文の挙動・ソース内非ASCIIに注意
- `npm run xxx --prefix viewer` は**リポジトリルートから**実行する。`viewer/` の中で使うと `viewer/viewer/package.json` を探しに行く
- Bashツールの作業ディレクトリは呼び出し間で持続する。`cd`したまま忘れると相対パスが狂う

## 実装の要注意ポイント

- **YouTube埋め込みはRefererヘッダ必須**（2025年〜）。`file://`で直接開くと**エラー153**になる。ローカル確認は必ずHTTPサーバー経由。実装は `VideoModal.astro`（enablejsapi=1 + postMessageでpause/resume、iframeは破棄せず隠す）
- **数字だけセリフ体**の仕組みは `global.css` の `@font-face` + `unicode-range`（`local(Georgia)`）。Georgiaが無い端末（Android等）ではゴシックにフォールバックする仕様
- Astroは**インライン要素内のテンプレート改行を空白として描画する**。`<strong>` 内の材料名＋分量は1行で書かないと「塩 で調える」のような余分な空白が出る（`StepSections.astro` にコメントあり）
- 小さな`<script>`はAstroがHTMLにインライン化するため、`dist/_astro/` にJSファイルが無くても正常
- レーダーチャートの座標系（中心・基準リング・外周・軸数）は `lib/nutrition-reference.ts` が単一の情報源。コンポーネント側に座標をハードコードしない（基準リングとデータ多角形がずれて「グラフが嘘をつく」ため）
- 「1食の目安」`MEAL_REFERENCE` の導出過程・出典は同ファイル冒頭コメントに記録（食事摂取基準2025、2026-07-13裏取り済み）

## デプロイ（未実施）

- Cloudflare Pages: root=`viewer`、build=`npm run build`、出力=`dist`
- Cloudflare Access で陽平さん＋パートナーのメールのみ許可（Step0設計書のNFR）
- ダッシュボード操作が必要なためユーザーと共同で行う
