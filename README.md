# Claude Mod plugins

Claude Code の mod(プラグイン)を作るためのリポジトリです。

## mod 一覧

| mod | 内容 |
| --- | --- |
| `usage-status` | 5時間枠と1週間枠の使用量制限、およびセッションのトークン使用量を、入力欄の上にゲージで常時表示する。80%以上は赤で表示する |

5時間枠と1週間枠の値は、サブスクリプションを使っているときだけ表示されます。

## 設定手順

### 1. 前提

- Claude Code をインストールします。`claude` コマンドが使える状態にします。
- このリポジトリを clone します。

```bash
git clone https://github.com/tomoyankun/claude-mods-plugins
cd claude-mods-plugins
```

### 2. mod を読み込んで起動する

読み込む mod を `--plugin-dir` で指定して、セッションを開始します。

```bash
claude --plugin-dir mods/usage-status
```

毎回指定したくないときは、環境変数 `CLAUDE_CODE_PLUGIN_DIRS` を使います。区切り文字の詳細は、plugin-authoring スキルの `reference.md` を参照してください。

### 3. 動作を確認する

- `usage-status`: 入力欄の上に、使用量のゲージが表示されます。

### 4. 検証とテスト

```bash
claude plugin validate mods/<mod名>   # マニフェストとフックの検証
claude plugin test mods/<mod名>       # hooks/*.test.ts の実行
```

## 他のリポジトリ・環境への導入

リポジトリ直下の `.claude-plugin/marketplace.json` が、このリポジトリを marketplace として公開します。`mods/` 以下の mod を登録しています。

### 方法A: marketplace からインストールする(推奨)

Claude Code のプロンプトに、次のコマンドを入力します。

```
/plugin install usage-status --marketplace tomoyankun/claude-mods-plugins
```

初回は `Add marketplace?` と表示されます。`y` を選び、続けてスコープを選びます。

- **user スコープ**: どのリポジトリで開いたセッションでも、mod が有効になります。
- **project スコープ**: 導入先リポジトリの `.claude/settings.json` に、設定を記録します。チームで共有するときに使います。

インストール後は、同じセッションで mod が有効になります。

GitHub 以外から取得するときは、`tomoyankun/claude-mods-plugins` の代わりに、git の URL かローカルフォルダのパスを指定します。

導入先の `.claude/settings.json` に次の内容を書くと、そのリポジトリを開いて信頼したメンバー全員に、marketplace の追加と mod の有効化が案内されます。

```json
{
  "extraKnownMarketplaces": {
    "claude-mods-plugins": {
      "source": { "source": "github", "repo": "tomoyankun/claude-mods-plugins" }
    }
  },
  "enabledPlugins": {
    "usage-status@claude-mods-plugins": true
  }
}
```

このリポジトリの `.claude/settings.json` にも、同じ内容を置いています。

更新するときは、先に新しいバージョンをリリースします。手順は「開発」節の「リリース手順」を参照してください。リリース後に、導入先で次の操作を順に行います。

1. `claude plugin marketplace update claude-mods-plugins` を実行します。
2. `claude plugin update usage-status@claude-mods-plugins` を実行します。
3. `/reload-plugins` を実行します。

### 方法B: clone したフォルダを直接読み込む(開発・個人利用向け)

先にこのリポジトリを clone します。導入先で、絶対パスを指定して起動します。

```bash
cd /path/to/other-repo
claude --plugin-dir ~/projects/claude-mods-plugins/mods/usage-status
```

毎回指定したくないときは、`~/.claude/settings.json` の `env` に `CLAUDE_CODE_PLUGIN_DIRS` を書きます。値には、絶対パスを指定します。`~` を使えます。複数のパスは、パス区切り文字で連結します。プロジェクト側の settings には書けません。

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/projects/claude-mods-plugins/mods/usage-status"
  }
}
```

方法Bでは、Claude Code がフォルダを監視します。mod を編集すると、mod が再読み込みされます。

## 開発

### ホットリロード

`--plugin-dir` で起動したセッションでは、各ターンの終わりに、mod の編集が再読み込みされます。

plugin-authoring スキルが新しい mod を作るときは、`~/.claude/dev-mods/<セッションID>/<mod名>/` に書き出します。最初のファイルを書くと、「Enable hot reloading for this session?」と確認されます。`Enable for this session` を選ぶと、ホットリロードが有効になります。残す mod は、`mods/` にコピーします。

`claude -p` のように確認を表示できない環境では、ホットリロードを使えません。その環境では、セッションを再起動して反映します。

### ディレクトリ構成

```
mods/<mod名>/
├── .claude-plugin/plugin.json   # マニフェスト
├── .claude-plugin/types/        # エンジンが生成する(編集しない・git 管理外)
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # フックモジュール
├── hooks/*.test.ts              # テスト
└── types/index.d.ts             # $.state の型契約(必要な mod のみ)
```

### 出力スタイル

`.claude/output-styles/concise-ja.md` は、Claude の回答を Simplified Technical English (ASD-STE100) の考え方で書く出力スタイルです。文を短くし、曖昧な語を使いません。

`/output-style concise-ja` を実行すると、適用されます。新しく作ったスタイルは、セッションを再起動すると一覧に表示されます。

### リリース手順

`.claude-plugin/marketplace.json` は、mod を `git-subdir` 形式で、タグ(`ref`)に固定しています。`main` に push しても、利用者には新しい版が届きません。次の順でリリースします。

`main` は保護されていて、直接 push できません。すべての変更を PR で行います。

1. ブランチを切ります。`mods/<mod名>/.claude-plugin/plugin.json` の `version` を上げます。`version` が変わらないと、利用者側で更新が検知されません。
2. `.claude-plugin/marketplace.json` の該当 mod の `ref` を、新しいタグ名(例: `v0.8.0`)に書き換えます。
3. PR を作成して、マージします。
4. マージ後の `main` のコミットに、`ref` と同じ名前のタグを打ち、push します。タグが無い間は、その mod のインストールが失敗します。

   ```bash
   git switch main && git pull
   git tag -a v0.8.0 -m "usage-status 0.8.0"
   git push origin v0.8.0
   ```
5. 利用者に、「方法A」の更新操作(3つの手順)を案内します。
