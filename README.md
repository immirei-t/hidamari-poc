# ひだまり（仮）PoC

高齢者の「人生・つながり・毎日の楽しみ」を支えるアプリの PoC（触れるプロトタイプ）。
要件: `../erika-requirement.txt`

**公開URL: https://immirei-t.github.io/hidamari-poc/** （スマホ可・Android Chrome 推奨）

## 起動

```bash
npm install
npm run dev      # http://localhost:5173
```

- PC で開くと、左に「デモの歩き方」、右にスマホ画面が出ます。
- 画面上部の **DEMO バー** で「はなこさん（本人）／よしこさん・たけしさん（友達）／エリカさん（サポーター）」を切り替えられます。1台で全フローを確認できます。
- 録音にはマイク許可が必要。録音後、音声をサーバー（Cloudflare Workers AI の Whisper large-v3-turbo）に送って文字にします（iPhone 含む全端末）。
- データはそのブラウザの IndexedDB にのみ保存（サーバー無し）。DEMO バー →「データを初期化」で初期状態に戻ります。

## 公開（GitHub Pages / gh-pages ブランチ）

```bash
npm run build
cd dist && touch .nojekyll && git init -b gh-pages && git add -A && git commit -m deploy   && git push -f https://github.com/immirei-t/hidamari-poc.git gh-pages && rm -rf .git
```

## 文字起こしサーバー（worker/）

- URL: https://hidamari-stt.hidamari-stt.workers.dev （`.env` の `VITE_STT_URL`）
- Cloudflare の個人アカウント（Immirei.t@gmail.com's Account）。無料枠内で動作。音声は文字起こしにだけ使い保存しない。
- ログインはプロジェクト専用（`worker/.wrangler-home`、PC 全体の wrangler ログインとは別）

```bash
npm --prefix worker run login    # 初回のみ
npm --prefix worker run deploy
```

## MVP 完成条件（要件 #43）との対応

| # | 条件 | PoC |
|---|---|---|
| 1 | アカウント作成 | ✅ 簡易（パスワード無し） |
| 2 | 高齢者プロフィール | ✅ 名前・呼び名・生年・写真・利用目的 |
| 3 | 質問が表示される | ✅ 日替わり。「ほかの質問にする」可 |
| 4–6 | 音声で回答・保存・文字起こし | ✅ 録音→聞く→録り直す→保存 |
| 7 | 思い出として見られる | ✅ 一覧・詳細・書き足し・削除 |
| 8 | 写真にエピソード | ✅ 写真→4つの質問に声で回答 |
| 9 | レシピ | ✅ 「どうやって作るの？」に話すだけで保存 |
| 10–11 | サポーターが質問→本人が回答 | ✅ 写真つき質問も可 |
| 12 | 今日のミッション | ✅ 日替わり・自動達成・ペナルティ無し・枯れない花 |
| 13 | 友達登録 | ✅ 招待コード / QR 表示 → 相手が承認 |
| 14–15 | メッセージ・音声/スタンプ返信 | ✅ 声・定型文・スタンプ・写真・文字 |

プライバシー（#40）: 承認制のサポーター／友達申請、友達解除、ブロック、通報、データ削除を実装。知らない人の検索は無し。

## 構成

- Vite + React + TypeScript（依存は最小限: `idb-keyval`, `qrcode`）
- `src/types.ts` … データモデル（1高齢者 ⇔ 複数サポーター、1サポーター ⇔ 複数高齢者 を最初から想定）
- `src/store.tsx` … 状態・永続化・セレクタ
- `src/lib/useVoiceRecorder.ts` … 録音 + 文字起こし
- `src/screens/*` … 各画面

## 本番化に向けた主な差し替えポイント（相談事項）

| 項目 | PoC | 本番候補 |
|---|---|---|
| アプリ形態 | Web（スマホブラウザ） | PWA のまま or React Native / Expo |
| 認証 | 簡易切り替え | Firebase Auth / Supabase Auth（電話番号・LINEログインなど高齢者向け） |
| DB | ブラウザ IndexedDB | Supabase(Postgres) / Firestore。行レベルの権限で「承認した人だけ」 |
| 音声・写真 | ブラウザ内 | S3 / Cloud Storage（署名付きURL・暗号化） |
| 文字起こし | Cloudflare Workers AI（Whisper）※許可サイトのみの簡易制限 | 同じ構成に認証を追加 |
| AI 整理 | 無し（レシピは文ごとに番号付けのみ） | LLM で材料・分量・手順の構造化、タイトル生成 |
| 通知 | 無し | プッシュ通知（「よしこさんからメッセージ」） |

## 既知の制約

- スマホではブラウザ内蔵の音声認識は使わない（録音が無音になるため）。文字起こしはサーバーのみ。
- スマホ実機は上の公開URLで試せます（HTTPS なのでマイク可）。
- 別の端末同士でのメッセージのやりとりは不可（サーバーが無いため）。
