import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_TELEGRAM_ID = 5419054691;
const WELCOME_PHOTO_FILENAME = 'files_10647109-2026-06-19T11-55-14-664Z-file_00000000bac07208b0ae09c6a7b5a75b.webp';
const MINI_APP_URL = "https://t.me/Brain_cashbot/braincash?startapp";
const COMMUNITY_CHANNEL = "https://t.me/brain_cach_channel";
const PAYMENT_CHANNEL = "https://t.me/braincashpayment";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string; language_code?: string; };
    chat: { id: number; type: string; };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string; };
    message?: { message_id: number; chat: { id: number; }; };
    data?: string;
  };
  my_chat_member?: {
    chat: { id: number; type: string; title?: string; username?: string; };
    from: { id: number; };
    new_chat_member: { user: { id: number; }; status: string; };
  };
  chat_member?: {
    chat: { id: number; type: string; username?: string; };
    from: { id: number; };
    new_chat_member: { user: { id: number; }; status: string; };
  };
}

function getSupabaseClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function sendMessage(botToken: string, chatId: number | string, text: string, keyboard?: object) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = keyboard;
  return (await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })).json();
}

async function sendPhoto(botToken: string, chatId: number | string, photoUrl: string, caption: string, keyboard?: object) {
  const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML' };
  if (keyboard) body.reply_markup = keyboard;
  return (await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })).json();
}

async function answerCallbackQuery(botToken: string, callbackId: string, text?: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function getChatMember(botToken: string, chatId: number | string, userId: number) {
  const data = await (await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`)).json();
  return data.ok ? { status: data.result.status } : null;
}

async function getChatAdmins(botToken: string, chatId: number | string) {
  const data = await (await fetch(`https://api.telegram.org/bot${botToken}/getChatAdministrators?chat_id=${chatId}`)).json();
  return data.ok ? data.result : [];
}

function getMainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }],
      [{ text: "💳 Payment", callback_data: "payment" }, { text: "🌍 Community", callback_data: "community" }],
      [{ text: "📜 History", callback_data: "history" }, { text: "💸 Withdraw", callback_data: "withdraw" }],
    ],
  };
}

async function getBotToken(supabase: ReturnType<typeof getSupabaseClient>): Promise<string | null> {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'bot_token').maybeSingle();
    if (data?.value && data.value.includes(':')) return data.value;
  } catch {}
  const envToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (envToken && envToken.includes(':')) return envToken;
  return null;
}

async function getOrCreateUser(supabase: ReturnType<typeof getSupabaseClient>, telegramUser: { id: number; first_name?: string; last_name?: string; username?: string; }, referredBy?: string) {
  let { data: user } = await supabase.from('users').select('*').eq('telegram_id', telegramUser.id).maybeSingle();

  if (!user) {
    const referralCode = 'BC' + telegramUser.id.toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    const { data: newUser } = await supabase.from('users').insert({
      telegram_id: telegramUser.id, username: telegramUser.username, first_name: telegramUser.first_name, last_name: telegramUser.last_name,
      referral_code: referralCode, points: 0, total_earned: 0, total_withdrawn: 0,
      is_admin: telegramUser.id === ADMIN_TELEGRAM_ID, is_verified: false, is_banned: false,
    }).select().maybeSingle();

    if (!newUser) return null;
    user = newUser;

    const botToken = await getBotToken(supabase);
    if (botToken) {
      try {
        // Get IP from request headers is not possible here, use registration_ip from DB
        const userIp = user.registration_ip || user.ip_address || 'N/A';
        await sendMessage(botToken, ADMIN_TELEGRAM_ID,
          `🆕 <b>New User Registration</b>\n\n` +
          `👤 <b>User:</b> ${telegramUser.first_name || 'Unknown'}\n` +
          `📱 <b>Username:</b> @${telegramUser.username || 'N/A'}\n` +
          `🆔 <b>Telegram ID:</b> ${telegramUser.id}\n` +
          `🌐 <b>IP Address:</b> <code>${userIp}</code>\n` +
          `🔗 <b>Referral Code:</b> ${referralCode}`
        );
      } catch (e) { console.error('Failed to send admin notification:', e); }
    }

    if (referredBy && referredBy.startsWith('ref_')) {
      const referrerCode = referredBy.replace('ref_', '');
      const { data: referrer } = await supabase.from('users').select('id, referral_blocked').eq('referral_code', referrerCode).maybeSingle();
      if (referrer && referrer.id !== user.id && !referrer.referral_blocked) {
        const { data: existingReferral } = await supabase.from('referrals').select('id').eq('referrer_id', referrer.id).eq('referred_id', user.id).maybeSingle();
        if (!existingReferral) {
          await supabase.from('referrals').insert({ referrer_id: referrer.id, referred_id: user.id, join_bonus: 20, task_bonus: 0, ad_bonus: 0, total_commission: 20, lifetime_commission: 0 });
          await supabase.from('users').update({ referred_by: referrer.id }).eq('id', user.id);
          await supabase.rpc('add_points', { user_id: referrer.id, amount: 20 });
          if (botToken) {
            try {
              await sendMessage(botToken, referrer.id, `🎉 <b>New Referral!</b>\n\n👤 <b>Referred user:</b> ${telegramUser.first_name || 'Anonymous'}\n💰 <b>Your bonus:</b> +20 pts\n\nKeep inviting friends to earn more!`, {
                inline_keyboard: [[{ text: "🧠 Open Brain Cash", web_app: { url: MINI_APP_URL } }]],
              });
            } catch (e) { console.error('Failed to send referral notification:', e); }
          }
        }
      }
    }
  }
  return user;
}

async function checkAndCompleteTask(supabase: ReturnType<typeof getSupabaseClient>, userId: string, chatId: number | string, botToken: string) {
  const { data: tasks } = await supabase.from('tasks').select('*').eq('is_active', true);
  for (const task of tasks || []) {
    const chatUsername = task.link?.replace('https://t.me/', '').replace('@', '').replace('/', '');
    const linkMatches = task.link?.includes(chatId.toString()) || task.link?.includes('@' + chatId) || chatUsername === chatId;
    if (linkMatches) {
      const { data: existing } = await supabase.from('task_completions').select('*').eq('user_id', userId).eq('task_id', task.id).maybeSingle();
      if (!existing) {
        await supabase.from('task_completions').insert({ user_id: userId, task_id: task.id, status: 'completed' });
        await supabase.rpc('add_points', { user_id: userId, amount: task.reward_points });
        const { data: referral } = await supabase.from('referrals').select('referrer_id, task_bonus, join_bonus').eq('referred_id', userId).maybeSingle();
        if (referral && referral.task_bonus === 0) {
          await supabase.rpc('add_points', { user_id: referral.referrer_id, amount: 40 });
          await supabase.from('referrals').update({ task_bonus: 40, total_commission: 40 + (referral.join_bonus || 20) }).eq('referred_id', userId);
        }
        return task;
      }
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const supabase = getSupabaseClient();
    const botToken = await getBotToken(supabase);
    if (!botToken) return new Response(JSON.stringify({ error: "Bot token not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Set bot commands on first load
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: '🧠 Open Brain Cash Mini App' },
            { command: 'balance', description: '💰 Check your points balance' },
            { command: 'withdraw', description: '💸 Withdraw your earnings' },
            { command: 'help', description: '❓ Get help and instructions' },
            { command: 'referral', description: '👥 Get your referral link' },
          ],
        }),
      });
    } catch (e) { console.error('setMyCommands failed:', e); }

    const bodyText = await req.clone().text();
    if (!bodyText) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // ── Action endpoints (called from frontend) ──────────────────────────
    try {
      const bodyData = JSON.parse(bodyText);
      const action = bodyData.action;

      // Setup webhook (called manually to enable bot command replies)
      if (action === 'setup-webhook') {
        const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-bot`;
        const res = await (await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: functionUrl, allowed_updates: ['message', 'callback_query', 'my_chat_member', 'chat_member'] }),
        })).json();
        return new Response(JSON.stringify(res), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Delete webhook (stop receiving updates)
      if (action === 'delete-webhook') {
        const res = await (await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`)).json();
        return new Response(JSON.stringify(res), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get webhook info
      if (action === 'webhook-info') {
        const res = await (await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)).json();
        return new Response(JSON.stringify(res), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check membership
      if (action === 'check_membership') {
        const isMember = await getChatMember(botToken, bodyData.chat_id, bodyData.user_id);
        return new Response(JSON.stringify({ is_member: isMember?.status === 'member' || isMember?.status === 'administrator' || isMember?.status === 'creator' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check bot admin status
      if (action === 'check_bot_admin') {
        const admins = await getChatAdmins(botToken, bodyData.chat_id);
        const botId = (await (await fetch(`https://api.telegram.org/bot${botToken}/getMe`)).json())?.result?.id;
        const isBotAdmin = admins.some((a: any) => a.user.id === botId && (a.status === 'administrator' || a.status === 'creator'));
        return new Response(JSON.stringify({ is_bot_admin: isBotAdmin }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Broadcast message to all users + community channel
      if (action === 'broadcast') {
        const { message, image_url, button_text, button_url, admin_id } = bodyData;
        const keyboard = button_text && button_url ? { inline_keyboard: [[{ text: button_text, url: button_url }]] } : undefined;

        // Send to community channel
        try {
          if (image_url) await sendPhoto(botToken, COMMUNITY_CHANNEL.replace('https://t.me/', '@'), image_url, message, keyboard);
          else await sendMessage(botToken, COMMUNITY_CHANNEL.replace('https://t.me/', '@'), message, keyboard);
        } catch (e) { console.error('Channel send failed:', e); }

        // Send to all users in batches of 50 with Promise.all
        const { data: users } = await supabase.from('users').select('telegram_id').neq('is_banned', true).is('is_suspended', false);
        let sent = 0, failed = 0;
        const userList = users || [];
        const batchSize = 50;
        for (let i = 0; i < userList.length; i += batchSize) {
          const batch = userList.slice(i, i + batchSize);
          const results = await Promise.allSettled(batch.map(async (u: { telegram_id: number }) => {
            try {
              if (image_url) await sendPhoto(botToken, u.telegram_id, image_url, message, keyboard);
              else await sendMessage(botToken, u.telegram_id, message, keyboard);
              return true;
            } catch { return false; }
          }));
          for (const r of results) {
            if (r.status === 'fulfilled' && r.value) sent++;
            else failed++;
          }
        }

        await supabase.from('broadcast_log').insert({ admin_id, message, image_url, button_text, button_url, sent_count: sent, failed_count: failed });
        return new Response(JSON.stringify({ success: true, sent, failed }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify withdraw request to admin
      if (action === 'notify-admin-withdraw' && bodyData.withdraw_data) {
        const w = bodyData.withdraw_data;
        const method = 'USDT (BEP20)';
        await sendMessage(botToken, ADMIN_TELEGRAM_ID,
          `🧠💰 <b>New Withdrawal Request</b>\n\n` +
          `👤 <b>User:</b> ${w.user_name || 'Unknown'} (ID: ${w.user_telegram_id})\n` +
          `🔢 <b>Number of withdraw:</b> #${w.withdraw_number}\n` +
          `💵 <b>Amount USD:</b> ${w.amount.toFixed(4)}\n` +
          `💳 <b>Method:</b> ${method}\n` +
          `💸 <b>Withdraw fee:</b> ${w.fee.toFixed(4)}\n` +
          `✅ <b>Net (after fee):</b> ${w.net_amount.toFixed(4)} ${method}\n` +
          `📍 <b>Address:</b> <code>${w.wallet_address}</code>`,
          { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify admin about withdrawal approval
      if (action === 'notify-admin-withdraw-approve' && bodyData.withdraw_data) {
        const w = bodyData.withdraw_data;
        const method = 'USDT (BEP20)';
        const explorerUrl = w.tx_id ? `https://bscscan.com/tx/${w.tx_id}` : '';
        await sendMessage(botToken, ADMIN_TELEGRAM_ID,
          `✅ <b>Withdrawal Approved</b>

` +
          `👤 <b>User:</b> ${w.user_name || 'Unknown'} (ID: ${w.user_telegram_id})
` +
          `🔢 <b>Number of withdraw:</b> #${w.withdraw_number}
` +
          `💵 <b>Amount USD:</b> ${w.amount.toFixed(4)}
` +
          `💳 <b>Method:</b> ${method}
` +
          `💸 <b>Withdraw fee:</b> ${w.fee.toFixed(4)}
` +
          `✅ <b>Net (after fee):</b> ${w.net_amount.toFixed(4)} ${method}
` +
          `📍 <b>Address:</b> <code>${w.wallet_address}</code>
` +
          (w.tx_id ? `🔗 <b>TX ID:</b> <code>${w.tx_id}</code>` : ''),
          { inline_keyboard: explorerUrl ? [[{ text: "🔍 View Transaction", url: explorerUrl }], [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] : [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify withdraw approval to user + payment channel
      if (action === 'notify-withdraw-approve' && bodyData.user_telegram_id && bodyData.withdraw_data) {
        const w = bodyData.withdraw_data;
        const method = 'USDT (BEP20)';
        const explorerUrl = `https://bscscan.com/tx/${w.tx_id}`;

        // Try to get real user name from Telegram
        let userName = w.user_name || 'Unknown';
        try {
          const chatRes = await (await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${bodyData.user_telegram_id}`)).json();
          if (chatRes.ok) {
            const fn = chatRes.result.first_name || '';
            const ln = chatRes.result.last_name || '';
            const un = chatRes.result.username ? '@' + chatRes.result.username : '';
            userName = [fn, ln, un].filter(Boolean).join(' ') || userName;
          }
        } catch {}

        // Send to user
        await sendMessage(botToken, bodyData.user_telegram_id,
          `✅ <b>Withdrawal Approved!</b>\n\n` +
          `👤 <b>User:</b> ${userName}\n` +
          `🔢 <b>Number of withdraw:</b> #${w.withdraw_number}\n` +
          `💵 <b>Amount USD:</b> ${w.amount.toFixed(4)}\n` +
          `💳 <b>Method:</b> ${method}\n` +
          `💸 <b>Withdraw fee:</b> ${w.fee.toFixed(4)}\n` +
          `✅ <b>Net (after fee):</b> ${w.net_amount.toFixed(4)} ${method}\n` +
          `🔗 <b>TX ID:</b> <code>${w.tx_id}</code>`,
          { inline_keyboard: [
            [{ text: "🔍 View Transaction", url: explorerUrl }],
            [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }],
          ]}
        );

        // Send to payment channel
        try {
          await sendMessage(botToken, PAYMENT_CHANNEL.replace('https://t.me/', '@'),
            `✅ <b>Withdrawal Approved</b>\n\n` +
            `👤 <b>User:</b> ${userName} (ID: ${bodyData.user_telegram_id})\n` +
            `🔢 <b>Number of withdraw:</b> #${w.withdraw_number}\n` +
            `💵 <b>Amount:</b> ${w.amount.toFixed(4)}\n` +
            `💳 <b>Method:</b> ${method}\n` +
            `💸 <b>Fee:</b> ${w.fee.toFixed(4)}\n` +
            `✅ <b>Net balance:</b> ${w.net_amount.toFixed(4)} ${method}\n` +
            `📍 <b>Address:</b> <code>${w.wallet_address || 'N/A'}</code>\n` +
            `🔗 <b>TX ID:</b> <code>${w.tx_id}</code>`,
            { inline_keyboard: [
              [{ text: "🔍 View Transaction", url: explorerUrl }],
              [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }],
            ]}
          );
        } catch (e) { console.error('Payment channel send failed:', e); }

        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify withdraw rejection to user
      if (action === 'notify-withdraw-reject' && bodyData.user_telegram_id && bodyData.withdraw_data) {
        const w = bodyData.withdraw_data;
        const method = 'USDT (BEP20)';
        await sendMessage(botToken, bodyData.user_telegram_id,
          `❌ <b>Withdrawal Rejected</b>\n\n` +
          `🔢 <b>Number of withdraw:</b> #${w.withdraw_number}\n` +
          `💵 <b>Amount USD:</b> ${w.amount.toFixed(4)}\n` +
          `💳 <b>Method:</b> ${method}\n` +
          `❌ <b>Reason:</b> ${w.reject_reason || 'Not specified'}\n\n` +
          `💰 <b>Your points have been refunded.</b>`,
          { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify referral tier milestone
      if (action === 'notify-referral-tier' && bodyData.user_telegram_id && bodyData.tier_data) {
        const t = bodyData.tier_data;
        await sendMessage(botToken, bodyData.user_telegram_id,
          `🏆 <b>Referral Milestone Reached!</b>\n\n` +
          `🎉 You've reached <b>${t.active_refs} active referrals</b>!\n` +
          `💰 <b>Reward:</b> +${t.reward} pts\n\n` +
          `Keep inviting more friends to earn bigger rewards!`,
          { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // First-time mini app open welcome
      if (action === 'welcome' && bodyData.user_telegram_id) {
        const referralCode = bodyData.referral_code || '';
        await sendMessage(botToken, bodyData.user_telegram_id,
          `🧠 <b>Welcome to Brain Cash!</b>\n\n` +
          `Play games, watch ads, complete tasks and earn real cash rewards!\n\n` +
          `💰 500 Points = $0.05 USDT\n` +
          `📺 Watch ads to earn points\n` +
          `🎮 Play 8+ puzzle games\n` +
          `👥 Invite friends for 120 pts + 5% lifetime commission\n` +
          `💳 Withdraw to USDT (BEP20)\n\n` +
          `<b>Your referral link:</b>\n` +
          `<code>https://t.me/Brain_cashbot/braincash?startapp=ref_${referralCode}</code>`,
          { inline_keyboard: [
            [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }],
            [{ text: "📢 Join Community", url: COMMUNITY_CHANNEL }, { text: "💳 Payment Channel", url: PAYMENT_CHANNEL }],
          ]}
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify partner task approval
      if (action === 'notify-partner-approve' && bodyData.user_telegram_id) {
        await sendMessage(botToken, bodyData.user_telegram_id,
          `🤝 <b>Partner Task Approved!</b>\n\n` +
          `✅ Your partner task submission has been approved.\n` +
          `It will now appear as a Partner Task in the app.`,
          { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify referral (generic)
      if (action === 'notify-referral' && bodyData.user_telegram_id && bodyData.referral_data) {
        const r = bodyData.referral_data;
        await sendMessage(botToken, bodyData.user_telegram_id,
          `🎉 <b>New Referral!</b>\n\n` +
          `👤 <b>Referred user:</b> ${r.referred_name || 'Anonymous'}\n` +
          `💰 <b>Your bonus:</b> +${r.bonus || 20} pts\n\n` +
          `Keep inviting friends to earn more!`,
          { inline_keyboard: [[{ text: "🧠 Open Brain Cash", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Notify referral became active (10 ads watched)
      if (action === 'notify-referral-active' && bodyData.user_telegram_id && bodyData.referral_data) {
        const r = bodyData.referral_data;
        await sendMessage(botToken, bodyData.user_telegram_id,
          `🎉 <b>Referral Became Active!</b>\n\n` +
          `👤 <b>Referred user:</b> ${r.referred_name || 'Anonymous'}\n` +
          `📺 Watched 10 ads — referral is now active!\n` +
          `💰 <b>Ad bonus:</b> +${r.ad_bonus || 70} pts\n` +
          `🏆 <b>Total earned from this referral:</b> ${r.total_earned || 130} pts\n\n` +
          `Keep inviting more friends to earn bigger rewards!`,
          { inline_keyboard: [[{ text: "🧠 Open Brain Cash", web_app: { url: MINI_APP_URL } }]] }
        );
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

    } catch { /* Not JSON action, continue to Telegram update */ }

    // ── Telegram Update Handling ──────────────────────────────────────────
    const body: TelegramUpdate = JSON.parse(bodyText);
    const { data: settings } = await supabase.from('settings').select('value').eq('key', 'mini_app_url').maybeSingle();
    const miniAppBaseUrl = settings?.value || (Deno.env.get("MINI_APP_URL") || "https://braincash.app");

    // /start command
    if (body.message?.text?.startsWith("/start")) {
      const chatId = body.message.chat.id;
      const telegramUser = body.message.from;
      const startParam = body.message.text.split(" ")[1] || "";
      if (!telegramUser) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const user = await getOrCreateUser(supabase, telegramUser, startParam);
      if (!user) {
        await sendMessage(botToken, chatId, "❌ Error: Could not create or find your account.");
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const referralLink = `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.referral_code}`;
      const welcomeText = `🧠 <b>Welcome to Brain Cash!</b>\n\n` +
        `Play games, watch ads, complete tasks and earn real cash rewards!\n\n` +
        `💰 <b>500 Points = $0.05 USDT</b>\n` +
        `📺 Watch ads to earn points\n` +
        `🎮 Play 8+ puzzle games\n` +
        `👥 Invite friends: 120 pts + 5% lifetime commission\n` +
        `💳 Withdraw to USDT (BEP20)\n\n` +
        `🔗 <b>Your referral link:</b>\n<code>${referralLink}</code>`;

      // Always send text message (photo URL hosting is unreliable)
      const msgResult = await sendMessage(botToken, chatId, welcomeText, getMainKeyboard());
      if (!msgResult.ok) console.error('sendMessage failed for /start:', JSON.stringify(msgResult));
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // /balance
    if (body.message?.text?.startsWith("/balance")) {
      const chatId = body.message.chat.id;
      const telegramUser = body.message.from;
      if (!telegramUser) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const user = await getOrCreateUser(supabase, telegramUser);
      if (!user) { await sendMessage(botToken, chatId, "❌ Error: Could not access your account."); return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
      await sendMessage(botToken, chatId, `💰 <b>Your Balance</b>\n\n🧠 <b>Points:</b> ${user.points.toLocaleString()}\n💵 <b>USD Value:</b> $${(user.points * 0.0001).toFixed(4)}\n\n<i>Open the Mini App to earn more!</i>`, getMainKeyboard());
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // /referral
    if (body.message?.text?.startsWith("/referral")) {
      const chatId = body.message.chat.id;
      const telegramUser = body.message.from;
      if (!telegramUser) return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const user = await getOrCreateUser(supabase, telegramUser);
      if (!user) { await sendMessage(botToken, chatId, "❌ Error"); return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
      const referralLink = `https://t.me/Brain_cashbot/braincash?startapp=ref_${user.referral_code}`;
      await sendMessage(botToken, chatId, `👥 <b>Referral Program</b>\n\n🔗 <b>Your Referral Link:</b>\n<code>${referralLink}</code>\n\n🎁 <b>Rewards:</b>\n• +20 pts when friend joins\n• +40 pts when friend completes main tasks\n• +70 pts when friend watches 10 ads\n• 5% lifetime commission on all earnings\n• Total per active referral: 120 pts\n\n📊 <b>Referral Challenges (lifetime):</b>\n• 3 active refs = 50 pts\n• 5 active refs = 75 pts\n• 10 active refs = 150 pts\n• 50 active refs = 500 pts\n• 100 active refs = 1500 pts\n\n<i>Share your link and start earning!</i>`, {
        inline_keyboard: [
          [{ text: "📋 Copy Referral Link", copy_text: { text: referralLink } }],
          [{ text: "📤 Share Link", switch_inline_query: `Join Brain Cash and earn crypto! Use my link: ${referralLink}` }],
          [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }],
        ],
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // /withdraw
    if (body.message?.text?.startsWith("/withdraw")) {
      const chatId = body.message.chat.id;
      await sendMessage(botToken, chatId, `💸 <b>Withdraw Your Earnings</b>\n\n💰 <b>Minimum:</b> $0.05 USDT (500 points)\n💱 <b>Currency:</b> USDT (BEP20) only\n📉 <b>Fee:</b> $0.01 + 5%\n\n<i>Open the Mini App to withdraw your earnings.</i>`, getMainKeyboard());
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // /help
    if (body.message?.text?.startsWith("/help")) {
      const chatId = body.message.chat.id;
      await sendMessage(botToken, chatId, `❓ <b>Brain Cash Help</b>\n\n🎮 <b>How to Earn:</b>\n• Play games and earn 4-8 points per game\n• Watch ads for instant points\n• Complete Telegram tasks\n• Invite friends for bonus + commission\n\n💰 <b>Points Value:</b>\n500 points = $0.05 USDT\n\n💳 <b>Withdrawal:</b>\nMinimum $0.05 to USDT (BEP20) wallet\n\n📢 <b>Official Channel:</b> @brain_cach_channel\n💳 <b>Payment Channel:</b> @braincashpayment`, getMainKeyboard());
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Callback queries
    if (body.callback_query) {
      const callbackId = body.callback_query.id;
      const chatId = body.callback_query.message?.chat.id;
      const callbackData = body.callback_query.data;
      await answerCallbackQuery(botToken, callbackId);

      if (callbackData === "payment") {
        await sendMessage(botToken, chatId!, `💳 <b>Buy Points</b>\n\n💎 <b>500 pts</b> - $0.05 USDT\n💎 <b>1000 pts</b> - $0.10 USDT\n💎 <b>2500 pts</b> - $0.25 USDT ⭐\n💎 <b>5000 pts</b> - $0.50 USDT\n💎 <b>10000 pts</b> - $1.00 USDT\n\nClick below to purchase.`, { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] });
      } else if (callbackData === "community") {
        await sendMessage(botToken, chatId!, `🌍 <b>Join Our Community!</b>\n\n📢 <b>Official Channel:</b> @brain_cach_channel\n💳 <b>Payment Channel:</b> @braincashpayment`, {
          inline_keyboard: [
            [{ text: "📢 Join Channel", url: COMMUNITY_CHANNEL }, { text: "💳 Payment Channel", url: PAYMENT_CHANNEL }],
            [{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }],
          ],
        });
      } else if (callbackData === "history") {
        await sendMessage(botToken, chatId!, `📜 <b>Your History</b>\n\nView your complete transaction history in the Mini App.`, { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] });
      } else if (callbackData === "withdraw") {
        await sendMessage(botToken, chatId!, `💸 <b>Withdraw</b>\n\n💰 <b>Minimum:</b> $0.05 USDT\n💱 <b>Currency:</b> USDT (BEP20) only\n📉 <b>Fee:</b> $0.01 + 5%\n\nOpen the Mini App to withdraw.`, { inline_keyboard: [[{ text: "🧠 Open Mini App", web_app: { url: MINI_APP_URL } }]] });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fallback for any unrecognized message
    if (body.message?.text) {
      const chatId = body.message.chat.id;
      await sendMessage(botToken, chatId,
        `🧠 <b>Brain Cash Bot</b>\n\n` +
        `I'm here to help you earn crypto rewards! Here are the commands:\n\n` +
        `/start - Open Brain Cash\n` +
        `/balance - Check your balance\n` +
        `/referral - Get your referral link\n` +
        `/withdraw - Withdraw your earnings\n` +
        `/help - Get help\n\n` +
        `Or click the button below to open the Mini App!`,
        getMainKeyboard()
      );
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Chat member updates
    if (body.my_chat_member || body.chat_member) {
      const update = body.my_chat_member || body.chat_member;
      const chatId = update!.chat.id;
      const chatUsername = update!.chat.username;
      const userId = update!.new_chat_member.user.id;
      const status = update!.new_chat_member.status;
      if (status === 'member' || status === 'administrator' || status === 'creator') {
        const user = await getOrCreateUser(supabase, { id: userId, first_name: '' });
        if (user) {
          if (chatUsername) await checkAndCompleteTask(supabase, user.id, chatUsername, botToken);
          await checkAndCompleteTask(supabase, user.id, chatId, botToken);
        }
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
