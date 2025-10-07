# Discord Bot - WordPress連携

このDiscordボットは、サーバーからユーザーが退会した際にWordPressサイトに通知を送信します。

## 機能

- Discordサーバーからの退会イベントを監視
- WordPressサイトへの自動通知
- HMAC-SHA256による署名認証
- タイムスタンプ検証とリトライ機能

## 設定パラメータ

### dry_run（テスト実行モード）

**用途**: 実際の処理を実行せずに動作確認を行う

**設定値**:
- `true` - テスト実行（実際の削除は行わない）
- `false` - 本番実行（実際に削除処理を実行）

**現在の設定**: `false`（本番実行）

**変更方法**:
```javascript
// index.js 157行目
const result = await notifyWordPressUserDeletion(discordUserId, 'soft', true); // dry_run: true
```

### mode（削除の種類）

**用途**: WordPress側での削除処理の種類を指定

**設定値**:
- `'soft'` - ソフトデリート（論理削除）
- `'hard'` - ハードデリート（物理削除）

**現在の設定**: `'soft'`（ソフトデリート）

**変更方法**:
```javascript
// index.js 157行目
const result = await notifyWordPressUserDeletion(discordUserId, 'hard', false); // mode: 'hard'
```

## 削除モードの詳細

### ソフトデリート（soft）
- データは完全に削除されない
- 論理的に無効化される
- 復元可能
- データベースには残るが、無効フラグが立てられる

### ハードデリート（hard）
- データが完全に削除される
- 復元不可能
- データベースから物理的に削除

## 環境変数

```bash
DISCORD_TOKEN=your_discord_bot_token
DISCORD_BOT_SECRET=your_hmac_secret_key
WORDPRESS_ENDPOINT=https://your-site.com/wp-json/discord/v1/deprovision
```

## WordPressエンドポイント

デフォルト: `https://minlight.work/discord-bot-only-connect/wp-json/discord/v1/deprovision`

## 動作フロー

1. Discordサーバーからユーザーが退会
2. `guildMemberRemove`イベントが発火
3. WordPressエンドポイントにPOSTリクエスト送信
4. HMAC-SHA256署名による認証
5. WordPress側でユーザー削除処理実行

## ログ出力例

```
👋 username#1234 が退会しました
📤 WordPressに通知中: 123456789012345678 (mode: soft, dry_run: false)
✅ WordPress通知成功: 123456789012345678
✅ username#1234 のWordPressユーザー削除処理が完了しました
```

## 注意事項

- キック、BAN、自発的退出すべて同じ処理が実行されます
- 現在は退会理由の区別は行っていません
- タイムスタンプエラーが発生した場合は自動的にリトライします
