require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // 退会・参加を検知するために必須
  ],
});

// WordPressエンドポイントの設定
const WORDPRESS_ENDPOINT = process.env.WORDPRESS_ENDPOINT || 'https://minlight.work/discord-bot-only-connect/wp-json/discord/v1/deprovision';
const DISCORD_BOT_SECRET = process.env.DISCORD_BOT_SECRET;

// HMAC-SHA256署名を生成する関数
function generateSignature(discordUserId, timestamp) {
  const message = `${discordUserId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', DISCORD_BOT_SECRET)
    .update(message)
    .digest('hex');
  return signature;
}

// WordPressエンドポイントにユーザー削除を通知する関数
async function notifyWordPressUserDeletion(discordUserId, mode = 'soft', dryRun = false) {
  try {
    // リクエスト送信直前にタイムスタンプを生成（±5分の有効期限を考慮）
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(discordUserId, timestamp);

    const requestBody = {
      discord_user_id: discordUserId,
      ts: timestamp,
      sig: signature,
      mode: mode,
      dry_run: dryRun
    };

    // デバッグ情報を追加（タイムスタンプの有効期限も表示）
    const now = new Date();
    const timestampDate = new Date(timestamp * 1000);
    const timeDiff = Math.abs(now.getTime() - timestampDate.getTime()) / 1000;
    
    console.log(`📤 WordPressに通知中: ${discordUserId} (mode: ${mode}, dry_run: ${dryRun})`);
    console.log(`🔍 デバッグ情報:`, {
      timestamp: timestamp,
      timestampDate: timestampDate.toISOString(),
      currentTime: now.toISOString(),
      timeDifference: `${timeDiff}秒`,
      isValidRange: timeDiff <= 300 ? '✅ 有効範囲内' : '❌ 範囲外',
      signature: signature.substring(0, 16) + '...',
      endpoint: WORDPRESS_ENDPOINT
    });

    const response = await axios.post(WORDPRESS_ENDPOINT, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10秒のタイムアウト
    });

    console.log(`✅ WordPress通知成功: ${discordUserId}`, response.data);
    return { success: true, data: response.data };

  } catch (error) {
    // タイムスタンプエラーの場合はリトライを試行
    if (error.response?.status === 403 && 
        error.response?.data?.message?.includes('Timestamp is out of range')) {
      console.log(`🔄 タイムスタンプエラーのためリトライ中: ${discordUserId}`);
      
      // 少し待ってから新しいタイムスタンプでリトライ
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        const retryTimestamp = Math.floor(Date.now() / 1000);
        const retrySignature = generateSignature(discordUserId, retryTimestamp);
        
        const retryRequestBody = {
          discord_user_id: discordUserId,
          ts: retryTimestamp,
          sig: retrySignature,
          mode: mode,
          dry_run: dryRun
        };
        
        console.log(`🔄 リトライ送信中: ${discordUserId} (新しいタイムスタンプ: ${retryTimestamp})`);
        
        const retryResponse = await axios.post(WORDPRESS_ENDPOINT, retryRequestBody, {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        });
        
        console.log(`✅ WordPress通知成功（リトライ）: ${discordUserId}`, retryResponse.data);
        return { success: true, data: retryResponse.data };
        
      } catch (retryError) {
        console.error(`❌ WordPress通知エラー（リトライ後）: ${discordUserId}`, {
          message: retryError.message,
          status: retryError.response?.status,
          data: retryError.response?.data,
        });
        return { success: false, error: retryError.message };
      }
    }
    
    console.error(`❌ WordPress通知エラー: ${discordUserId}`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    return { success: false, error: error.message };
  }
}

client.once('clientReady', (c) => {
  console.log(`✅ Bot ready: ${c.user.tag}`);
  
  // 環境変数の確認
  if (!DISCORD_BOT_SECRET) {
    console.warn('⚠️ DISCORD_BOT_SECRETが設定されていません');
  }
  if (!process.env.DISCORD_TOKEN) {
    console.warn('⚠️ DISCORD_TOKENが設定されていません');
  }
});

// サーバー退会イベント
client.on('guildMemberRemove', async (member) => {
  const discordUserId = member.user?.id || member.id;
  const userTag = member.user?.tag || discordUserId;
  
  console.log(`👋 ${userTag} が退会しました`);

  // WordPressに通知
  if (DISCORD_BOT_SECRET) {
    // 本番環境では dry_run: false に変更
    const result = await notifyWordPressUserDeletion(discordUserId, 'soft', true);
    
    if (result.success) {
      console.log(`✅ ${userTag} のWordPressユーザー削除処理が完了しました`);
    } else {
      console.error(`❌ ${userTag} のWordPressユーザー削除処理に失敗しました`);
    }
  } else {
    console.warn('⚠️ DISCORD_BOT_SECRETが設定されていないため、WordPressへの通知をスキップしました');
  }
});

client.login(process.env.DISCORD_TOKEN);