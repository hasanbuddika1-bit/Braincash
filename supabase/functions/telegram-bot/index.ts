import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_TELEGRAM_ID = 5419054691;
const WELCOME_PHOTO_FILENAME = 'files_10647109-2026-06-19T11-55-14-664Z-file_00000000bac07208b0ae09c6a7b5a75b.webp';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message?: {
      message_id: number;
      chat: {
        id: number;
      };
    };
    data?: string;
  };
  my_chat_member?: {
    chat: {
      id: number;
      type: string;
      title?: string;
      username?: string;
    };
    from: {
      id: number;
    };
    new_chat_member: {
      user: {
        id: number;
      };
      status: string;
    };
  };
  chat_member?: {
    chat: {
      id: number;
      type: string;
      username?: string;
    };
    from: {
      id: number;
    };
    new_chat_member: {
      user: {
        id: number;
      };
      status: string;
    };
  };
}

// Supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

// Telegram Bot API helpers
async function sendMessage(botToken: string, chatId: number | string, text: string, keyboard?: object) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (keyboard) {
    body.reply_markup = keyboard;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json();
}

async function sendPhoto(botToken: string, chatId: number | string, photoUrl: string, caption: string, keyboard?: object) {
  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

  const body: Record<string, unknown> = {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'HTML',
  };

  if (keyboard) {
    body.reply_markup = keyboard;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json();
}

async function answerCallbackQuery(botToken: string, callbackId: string, text?: string) {
  const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function getChatMember(botToken: string, chatId: number | string, userId: number): Promise<{ status: string } | null> {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${chatId}&user_id=${userId}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.ok && data.result) {
    return { status: data.result.status };
  }

  return null;
}

// Main keyboard
function getMainKeyboard() {
  const miniAppUrl = "https://t.me/Brain_cashbot/braincash";
  return {
    inline_keyboard: [
      [{ text: "🧠 Open Mini App", web_app: { url: miniAppUrl } }],
      [{ text: "💳 Payment", callback_data: "payment" }, { text: "🌍 Community", callback_data: "community" }],
      [{ text: "📜 History", callback_data: "history" }, { text: "💸 Withdraw", callback_data: "withdraw" }],
    ],
  };
}

// Get or create user with IP tracking
async function getOrCreateUser(
  supabase: ReturnType<typeof getSupabaseClient>,
  telegramUser: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  },
  referredBy?: string,
  clientIp?: string
) {
  let { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single();

  if (error?.code === 'PGRST116' || !user) {
    const referralCode = 'BC' + telegramUser.id.toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    // Check for existing accounts with same IP
    let shouldSuspend = false;
    if (clientIp) {
      const { data: existingAccounts } = await supabase
        .from('users')
        .select('id, telegram_id, is_banned')
        .eq('ip_address', clientIp)
        .neq('telegram_id', telegramUser.id);

      if (existingAccounts && existingAccounts.length > 0) {
        // Check if any existing account is not banned
        const activeAccounts = existingAccounts.filter(a => !a.is_banned);
        if (activeAccounts.length > 0) {
          shouldSuspend = true;
        }
      }
    }

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
        last_name: telegramUser.last_name,
        referral_code: referralCode,
        points: 0,
        total_earned: 0,
        total_withdrawn: 0,
        is_admin: telegramUser.id === ADMIN_TELEGRAM_ID,
        is_verified: false,
        ip_address: clientIp,
        is_banned: shouldSuspend,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return null;
    }

    user = newUser;

    // Send notification to admin about new user
    const botToken = await getBotToken(supabase);
    if (botToken) {
      await sendMessage(botToken, ADMIN_TELEGRAM_ID, `
🆕 <b>New User Registration</b>

👤 <b>User:</b> ${telegramUser.first_name || 'Unknown'} ${telegramUser.last_name || ''}
📱 <b>Username:</b> @${telegramUser.username || 'N/A'}
🆔 <b>Telegram ID:</b> ${telegramUser.id}
🌐 <b>IP:</b> ${clientIp || 'Unknown'}
⚠️ <b>Status:</b> ${shouldSuspend ? 'Suspended (duplicate IP)' : 'Active'}

${shouldSuspend ? '⚠️ Multiple accounts detected from same IP!' : ''}
      `);
    }

    // If suspended, notify user
    if (shouldSuspend) {
      if (botToken) {
        await sendMessage(botToken, telegramUser.id, `
⚠️ <b>Account Under Review</b>

Your account has been temporarily suspended for security reasons. Please contact support @braincashsupport if you believe this is an error.
        `);
      }
      return user; // Return suspended user
    }

    // Give welcome bonus to new user
    const welcomeBonus = 10;
    await supabase.rpc('add_points', {
      user_id: user.id,
      amount: welcomeBonus,
    });

    // Handle referral bonus if applicable
    if (referredBy && referredBy.startsWith('ref_')) {
      const referrerCode = referredBy.replace('ref_', '');

      // Check if referral is from same IP (block self-referrals)
      let isBlockedReferral = false;

      const { data: referrer } = await supabase
        .from('users')
        .select('id, ip_address')
        .eq('referral_code', referrerCode)
        .single();

      if (referrer) {
        if (clientIp && referrer.ip_address === clientIp) {
          isBlockedReferral = true;
        }

        if (referrer.id !== user.id && !isBlockedReferral) {
          // Add referral record
          await supabase.from('referrals').insert({
            referrer_id: referrer.id,
            referred_id: user.id,
            join_bonus: 50,
            task_bonus: 0,
            total_commission: 50,
          });

          // Update user's referred_by
          await supabase
            .from('users')
            .update({ referred_by: referrer.id })
            .eq('id', user.id);

          // Award join bonus to referrer
          await supabase.rpc('add_points', {
            user_id: referrer.id,
            amount: 50,
          });
        }
      }
    }
  }

  return user;
}

// Check and complete task via chat membership
async function checkAndCompleteTask(supabase: ReturnType<typeof getSupabaseClient>, userId: number, chatId: number | string) {
  // Find task linked to this chat
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_active', true);

  for (const task of tasks || []) {
    if (task.link?.includes(chatId.toString()) || task.link?.includes('@' + task.link?.split('/').pop())) {
      // Check if user already completed this task
      const { data: existing } = await supabase
        .from('task_completions')
        .select('*')
        .eq('user_id', userId)
        .eq('task_id', task.id)
        .single();

      if (!existing) {
        // Complete the task
        await supabase.from('task_completions').insert({
          user_id: userId,
          task_id: task.id,
          status: 'completed',
        });

        // Award points
        await supabase.rpc('add_points', {
          user_id: userId,
          amount: task.reward_points,
        });

        return task;
      }
    }
  }

  return null;
}

// Get bot token from database or environment
async function getBotToken(supabase: ReturnType<typeof getSupabaseClient>): Promise<string | null> {
  // First try environment variable
  let token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (token) return token;

  // Fall back to database settings
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'bot_token')
      .single();
    return data?.value || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = getSupabaseClient();
    const botToken = await getBotToken(supabase);

    if (!botToken) {
      console.error("Bot token not configured");
      return new Response(JSON.stringify({ error: "Bot token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get mini app URL from settings
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'mini_app_url')
      .single();

    const miniAppBaseUrl = settings?.value || (Deno.env.get("MINI_APP_URL") || "https://braincash.app");
    const miniAppUrl = "https://t.me/Brain_cashbot/braincash";

    const body: TelegramUpdate = await req.json();

    // Handle /start command
    if (body.message?.text?.startsWith("/start")) {
      const chatId = body.message.chat.id;
      const telegramUser = body.message.from;
      const startParam = body.message.text.split(" ")[1] || "";

      if (!telegramUser) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getOrCreateUser(supabase, telegramUser, startParam);

      const referralCode = user?.referral_code || ('BC' + telegramUser.id.toString(36).toUpperCase());
      const welcomePhotoUrl = `${miniAppBaseUrl}/images/${WELCOME_PHOTO_FILENAME}`;

      // Send welcome photo with caption
      const welcomeCaption = `
🧠 <b>Welcome to Brain Cash!</b>

Play games, watch ads, complete tasks and earn real cash rewards!

💰 <b>500 Points = $0.05 USDT</b>
📺 Watch ads to earn 4-8 points
🎮 Play 7+ puzzle games
👥 Invite friends for 50 pts + 10% commission
💳 Withdraw to USDT or TON (GRAM)

<b>Your referral link:</b>
https://t.me/Brain_cashbot/braincash?startapp=ref_${referralCode}

📢 <b>Join our community:</b>
• Channel: @brain_cach_channel
• Group: @braincashgroup
• Payments: @braincashpayment
      `;

      // Try to send photo first, fallback to message
      const photoResult = await sendPhoto(botToken, chatId, welcomePhotoUrl, welcomeCaption, getMainKeyboard());
      if (!photoResult.ok) {
        await sendMessage(botToken, chatId, welcomeCaption, getMainKeyboard());
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle /balance command
    if (body.message?.text?.startsWith("/balance")) {
      const chatId = body.message.chat.id;
      const telegramUser = body.message.from;

      if (!telegramUser) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getOrCreateUser(supabase, telegramUser);
      const points = user?.points || 0;
      const usdValue = (points * 0.0001).toFixed(4);

      await sendMessage(botToken, chatId, `
💰 <b>Your Balance</b>

🧠 <b>Points:</b> ${points.toLocaleString()}
💵 <b>USD Value:</b> $${usdValue}

<i>Open the Mini App to earn more!</i>
      `, getMainKeyboard());

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle /referral command
    if (body.message?.text?.startsWith("/referral")) {
      const chatId = body.message.chat.id;
      const telegramUser = body.message.from;

      if (!telegramUser) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = await getOrCreateUser(supabase, telegramUser);
      const referralCode = user?.referral_code || ('BC' + telegramUser.id.toString(36).toUpperCase());

      await sendMessage(botToken, chatId, `
👥 <b>Referral Program</b>

🔗 <b>Your Referral Link:</b>
https://t.me/Brain_cashbot/braincash?startapp=ref_${referralCode}

🎁 <b>Rewards:</b>
• +50 pts when friend joins
• +50 pts when friend completes tasks
• +50 pts when friend watches 10 ads
• 10% lifetime commission on all earnings

<i>Share your link and start earning!</i>
      `, {
        inline_keyboard: [
          [{ text: "📤 Share Link", switch_inline_query: `Join Brain Cash and earn crypto! Use my link: https://t.me/Brain_cashbot/braincash?startapp=ref_${referralCode}` }],
          [{ text: "🧠 Open Mini App", web_app: { url: "https://t.me/Brain_cashbot/braincash" } }],
        ],
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle /withdraw command
    if (body.message?.text?.startsWith("/withdraw")) {
      const chatId = body.message.chat.id;

      await sendMessage(botToken, chatId, `
💸 <b>Withdraw Your Earnings</b>

💰 <b>Minimum:</b> $0.05 USDT (500 points)
💱 <b>Currencies:</b> USDT (BEP20), TON
📉 <b>Fee:</b> $0.01 + 5%

<i>Open the Mini App to withdraw your earnings.</i>
      `, getMainKeyboard());

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle /help command
    if (body.message?.text?.startsWith("/help")) {
      const chatId = body.message.chat.id;

      await sendMessage(botToken, chatId, `
❓ <b>Brain Cash Help</b>

🎮 <b>How to Earn:</b>
• Play games and earn 4-8 points per game
• Watch ads for instant points
• Complete Telegram tasks
• Invite friends for bonus + commission

💰 <b>Points Value:</b>
500 points = $0.05 USDT

💳 <b>Withdrawal:</b>
Minimum $0.05 to USDT or TON (GRAM) wallet

📢 <b>Official Channel:</b> @brain_cach_channel
👥 <b>Community Group:</b> @braincashgroup
💳 <b>Payment Channel:</b> @braincashpayment
      `, getMainKeyboard());

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle callback queries
    if (body.callback_query) {
      const callbackId = body.callback_query.id;
      const chatId = body.callback_query.message?.chat.id;
      const userId = body.callback_query.from.id;
      const callbackData = body.callback_query.data;

      await answerCallbackQuery(botToken, callbackId);

      if (callbackData === "payment") {
        await sendMessage(botToken, chatId!, `
💳 <b>Buy Points</b>

💎 <b>500 pts</b> - $0.05 USDT
💎 <b>1000 pts</b> - $0.10 USDT (+100 bonus)
💎 <b>2500 pts</b> - $0.25 USDT (+300 bonus) ⭐ <i>BEST VALUE</i>
💎 <b>5000 pts</b> - $0.50 USDT (+750 bonus)

Click below to purchase with crypto or Telegram Stars.
        `, {
          inline_keyboard: [
            [{ text: "🧠 Open Mini App", web_app: { url: "https://t.me/Brain_cashbot/braincash" } }],
          ],
        });
      } else if (callbackData === "community") {
        await sendMessage(botToken, chatId!, `
🌍 <b>Join Our Community!</b>

📢 <b>Official Channel:</b> @brain_cach_channel
👥 <b>Community Group:</b> @braincashgroup
💳 <b>Payment Channel:</b> @braincashpayment
        `, {
          inline_keyboard: [
            [{ text: "📢 Join Channel", url: "https://t.me/brain_cach_channel" }],
            [{ text: "👥 Join Group", url: "https://t.me/braincashgroup" }],
            [{ text: "💳 Payment Channel", url: "https://t.me/braincashpayment" }],
            [{ text: "🧠 Open Mini App", web_app: { url: "https://t.me/Brain_cashbot/braincash" } }],
          ],
        });
      } else if (callbackData === "history") {
        await sendMessage(botToken, chatId!, `
📜 <b>Your History</b>

View your complete transaction history in the Mini App including:
• Ad views
• Game sessions
• Task completions
• Referral bonuses
• Withdrawals
        `, {
          inline_keyboard: [
            [{ text: "🧠 Open Mini App", web_app: { url: "https://t.me/Brain_cashbot/braincash" } }],
          ],
        });
      } else if (callbackData === "withdraw") {
        await sendMessage(botToken, chatId!, `
💸 <b>Withdraw</b>

💰 <b>Minimum:</b> $0.05 USDT
💱 <b>Currencies:</b> USDT (BEP20), TON
📉 <b>Fee:</b> $0.01 + 5%

Open the Mini App to withdraw your earnings.
        `, {
          inline_keyboard: [
            [{ text: "🧠 Open Mini App", web_app: { url: "https://t.me/Brain_cashbot/braincash" } }],
          ],
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle chat member updates (for task auto-verification)
    if (body.my_chat_member || body.chat_member) {
      const update = body.my_chat_member || body.chat_member;
      const chatId = update!.chat.id;
      const chatUsername = update!.chat.username;
      const userId = update!.new_chat_member.user.id;
      const status = update!.new_chat_member.status;

      if (status === 'member' || status === 'administrator' || status === 'creator') {
        // User joined the chat - check for task completion
        const user = await getOrCreateUser(supabase, {
          id: userId,
          first_name: '',
        });

        if (user) {
          // Try to complete task by chat ID or username
          if (chatUsername) {
            await checkAndCompleteTask(supabase, user.id, chatUsername);
          }
          await checkAndCompleteTask(supabase, user.id, chatId);
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing update:", error);
    return new Response(JSON.stringify({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
