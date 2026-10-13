# Claude Mod plugins

Claude Code の mod(プラグイン)を作るためのリポジトリです。

## mod 一覧

| mod | 内容 |
| --- | --- |
| `usage-status` | 5時間・1週間の使用量制限とセッションのトークン使用量を、入力欄の上にゲージで常時表示する。80%以上は赤 |

5時間・1週間の値は、サブスクリプションの利用時のみ表示されます。

## 設定手順

### 1. 前提

- Claude Code がインストールされていること(`claude` コマンドが使える)
- このリポジトリを clone 済みであること

```bash
git clone https://github.com/tomoyankun/claude-mods-plugins
cd claude-mods-plugins
```

### 2. mod を読み込んで起動する

読み込みたい mod を `--plugin-dir` で指定してセッションを開始します。

```bash
claude --plugin-dir mods/usage-status
```

毎回指定したくない場合は、環境変数 `CLAUDE_CODE_PLUGIN_DIRS` でも指定できます(区切り文字などの詳細は plugin-authoring スキルの `reference.md` を参照)。

### 3. 動作を確認する

- `usage-status`: 入力欄の上に使用量のゲージが表示されます。

### 4. 検証とテスト

```bash
claude plugin validate mods/<mod名>   # マニフェストとフックの検証
claude plugin test mods/<mod名>       # hooks/*.test.ts の実行
```

## 他のリポジトリ・環境への導入

リポジトリ直下の `.claude-plugin/marketplace.json` で、このリポジトリを marketplace として公開しています(`mods/` 以下の mod を登録)。

### 方法A: marketplace からインストール(推奨)

Claude Code のプロンプトで次を入力します。

```
/plugin install usage-status --marketplace tomoyankun/claude-mods-plugins
```

初回は `Add marketplace?` と聞かれるので `y`、続いてスコープを選びます。

- **user スコープ**: 以後、どのリポジトリで開いたセッションでも有効になります。
- **project スコープ**: 導入先リポジトリの `.claude/settings.json` に記録されます。チームで共有する場合に向きます。

インストール後はそのセッションですぐ有効になります。GitHub 以外のときは、`tomoyankun/claude-mods-plugins` の代わりに git の URL やローカルフォルダのパスも指定できます。

導入先の `.claude/settings.json` に次のように書くと、そのリポジトリを開いて信頼したチーム全員に、marketplace の追加と mod の有効化が案内されます。

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

このリポジトリ自身の `.claude/settings.json` にも同じ内容を置いています。

更新は、新しいバージョンをリリースしたあと(手順は「開発」節の「リリース手順」)、導入先で `claude plugin update <mod名>` を実行し、続けて `/reload-plugins` を実行します。

### 方法B: clone したフォルダを直接読み込む(開発・個人利用向け)

このリポジトリを clone しておき、導入先で絶対パスを指定して起動します。

```bash
cd /path/to/other-repo
claude --plugin-dir ~/projects/claude-mods-plugins/mods/usage-status
```

毎回指定したくない場合は、`~/.claude/settings.json` の `env` に `CLAUDE_CODE_PLUGIN_DIRS`(絶対パス、`~` 可、複数はパス区切り文字で連結)を書きます。プロジェクト側の settings には書けません。

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "~/projects/claude-mods-plugins/mods/usage-status"
  }
}
```

この方法ではフォルダが監視されるため、mod を編集すると再読み込みされます。

## 開発

### ホットリロード

`--plugin-dir` で起動したセッションでは、mod の編集が各ターンの終わりに再読み込みされます。

plugin-authoring スキルで新しく作る mod は `~/.claude/dev-mods/<セッションID>/<mod名>/` に書き出されます。このセッションでは、最初のファイルを書いたときに「Enable hot reloading for this session?」と確認されるので、`Enable for this session` を選ぶと有効になります。残したい mod は `mods/` にコピーしてください。

`claude -p` のように確認を出せない環境ではホットリロードは使えません。その場合はセッションを再起動すると反映されます。

### ディレクトリ構成

```
mods/<mod名>/
├── .claude-plugin/plugin.json   # マニフェスト
├── .claude-plugin/types/        # エンジンが生成(編集しない・git 管理外)
├── hooks/hooks.json             # { "modules": ["./register.tsx"] }
├── hooks/register.tsx           # フックモジュール
├── hooks/*.test.ts              # テスト
└── types/index.d.ts             # $.state の型契約(必要な mod のみ)
```

### リリース手順

`.claude-plugin/marketplace.json` は、mod を `git-subdir` 形式でタグ(`ref`)に固定しています。`main` に push しただけでは利用者に届かないので、リリースは次の順で行います。`main` は保護されていて直接 push できないため、変更は必ず PR 経由です。

1. ブランチを切り、`mods/<mod名>/.claude-plugin/plugin.json` の `version` を上げます。`version` が変わらないと、利用者側で更新が検知されません。
2. `.claude-plugin/marketplace.json` の該当 mod の `ref` を、新しいタグ名(例: `v0.8.0`)に書き換えます。
3. PR を作成してマージします。
4. マージ後の `main` のコミットに、`ref` と同じ名前のタグを打って push します。タグが無い間は、その mod のインストールに失敗します。

   ```bash
   git switch main && git pull
   git tag -a v0.8.0 -m "usage-status 0.8.0"
   git push origin v0.8.0
   ```
5. 利用者は `claude plugin marketplace update claude-mods-plugins` に続けて `claude plugin update usage-status@claude-mods-plugins` を実行し、`/reload-plugins` で反映します。
