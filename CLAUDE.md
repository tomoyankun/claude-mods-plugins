# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 目的

このリポジトリは、Claude Code の mod / プラグイン(パネル、ステータスライン、スラッシュコマンド、フックなど、Claude 自身のインターフェースや挙動を変更するもの)を作成するためのものです。

## 作業ルール

- ユーザーとのやり取りは、作成を始める前も含めて常に日本語で行う。
- mod やそのフックモジュールを作成・デバッグするときは `plugin-authoring` スキルを使う。
- `main` ブランチは保護されていて、直接 push できない。ブランチを切り、`gh pr create` で PR を作成してマージする。承認者は `tomoyankun` だけである(`.github/CODEOWNERS`)。
- mod のバージョンを上げるときは、次の3つを同じ値にする。手順は README の「リリース手順」に従う。
  - `plugin.json` の `version`
  - `.claude-plugin/marketplace.json` の `ref`
  - Git タグ

## 構成

各 mod は `mods/<mod名>/` に置く。

- `.claude-plugin/plugin.json` — マニフェスト
- `hooks/hooks.json` — `{ "modules": ["./register.tsx"] }`
- `hooks/register.tsx` — フックモジュール(`export const register: Register`)
- `hooks/*.test.ts` — テスト

`.claude-plugin/types/` は mod の読み込み時にエンジンが生成する(自身の `.gitignore` で除外される)。編集しない。

plugin-authoring スキルは新しい mod を、このリポジトリの外の `~/.claude/dev-mods/<セッションID>/<mod名>/` に書き出す。残したいものは `mods/` にコピーする。

## コマンド

```bash
claude plugin validate mods/<mod名>   # マニフェストとフックの検証
claude plugin test mods/<mod名>       # *.test.ts の実行
claude --plugin-dir mods/<mod名>      # mod を読み込んだ状態でセッション開始
```

## mod 一覧

- `usage-status` — 5時間・1週間の使用量制限とセッションのトークン使用量を、入力欄の上にゲージで常時表示する。80%以上は赤。`types/index.d.ts` に型契約がある。
