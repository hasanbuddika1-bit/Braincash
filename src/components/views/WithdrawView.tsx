import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import { Wallet, ArrowUpRight, Clock, CheckCircle, XCircle, ExternalLink, Info } from 'lucide-react';
import type { Withdrawal } from '../../types';

const POINTS_TO_USD = 0.01;
const MIN_WITHDRAW = 0.05;
const WITHDRAW_FEE = 0.01;
const WITHDRAW_FEE_PERCENT = 5;

export function WithdrawView() {
  const { user, withdrawals, refreshWithdrawals, haptic } = useApp();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USDT' | 'TON'>('USDT');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [tonPrice, setTonPrice] = useState(7.5);
  const [usdtPrice, setUsdtPrice] = useState(1);

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,the-open-network&vs_currencies=usd');
      const data = await response.json();
      setUsdtPrice(data.tether?.usd || 1);
      setTonPrice(data['the-open-network']?.usd || 7.5);
    } catch {
      // Use defaults
    }
  }

  const userPoints = user?.points || 0;
  const usdValue = userPoints * POINTS_TO_USD;

  function calculateNet(usdAmount: number) {
    const fee = WITHDRAW_FEE + (usdAmount * WITHDRAW_FEE_PERCENT / 100);
    return usdAmount - fee;
  }

  const inputAmount = parseFloat(amount) || 0;
  const inputUSD = amount ? inputAmount * POINTS_TO_USD : 0;
  const fee = inputUSD ? WITHDRAW_FEE + (inputUSD * WITHDRAW_FEE_PERCENT / 100) : 0;
  const netAmount = inputUSD ? inputUSD - fee : 0;
  const isValid = inputUSD >= MIN_WITHDRAW && netAmount > 0 && walletAddress.length > 10;

  async function handleWithdraw() {
    if (!user || !isValid || loading) return;

    haptic('light');
    setLoading(true);

    try {
      const pointsToDeduct = Math.round(inputAmount);
      const currencyAmount = currency === 'USDT' ? netAmount : netAmount / tonPrice;

      // Create withdrawal request
      const { error: withdrawError } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount: netAmount,
        fee,
        net_amount: currencyAmount,
        currency,
        wallet_address: walletAddress,
        status: 'pending',
      });

      if (withdrawError) throw withdrawError;

      // Deduct points
      const { error: updateError } = await supabase
        .from('users')
        .update({
          points: user.points - pointsToDeduct,
          total_withdrawn: user.total_withdrawn + netAmount,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh
      await refreshWithdrawals();

      // Reset form
      setAmount('');
      setWalletAddress('');

      haptic('success');
    } catch (error) {
      console.error('Withdrawal error:', error);
      haptic('error');
    } finally {
      setLoading(false);
    }
  }

  const statusColors: Record<string, string> = {
    pending: 'text-yellow-400',
    approved: 'text-blue-400',
    rejected: 'text-red-400',
    completed: 'text-green-400',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="text-yellow-400" size={16} />,
    approved: <CheckCircle className="text-blue-400" size={16} />,
    rejected: <XCircle className="text-red-400" size={16} />,
    completed: <CheckCircle className="text-green-400" size={16} />,
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">💸</span>
          Withdraw
        </h1>
        <p className="text-purple-300 mt-2">Convert your points to crypto!</p>
      </div>

      {/* Balance Card */}
      <div className="glass-card p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 text-8xl opacity-10 transform translate-x-4 -translate-y-4">
          💰
        </div>

        <div className="relative z-10">
          <p className="text-gray-400 text-sm mb-1">Your Balance</p>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-4xl font-bold font-['Orbitron'] text-white">
              {userPoints.toLocaleString()}
            </h2>
            <span className="text-gold-400 font-semibold text-lg">pts</span>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="text-gray-400 text-sm">≈</span>
            <span className="text-2xl font-bold text-gold-400">${usdValue.toFixed(2)}</span>
            <span className="text-gray-400 text-sm">USD</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Info className="text-blue-400" size={14} />
            <span className="text-gray-400">100 pts = $0.01 USDT</span>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="glass-card p-4 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Wallet className="text-neon-blue" size={20} />
          Withdrawal Request
        </h3>

        {/* Points Input */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Points to Withdraw</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter points"
              className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              max={userPoints}
            />
            <button
              onClick={() => setAmount(userPoints.toString())}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-400 text-sm font-semibold"
            >
              MAX
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-1">Min: {Math.round(MIN_WITHDRAW / POINTS_TO_USD)} pts (${MIN_WITHDRAW})</p>
        </div>

        {/* Currency Selection */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Currency</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrency('USDT')}
              className={`p-4 rounded-xl border-2 transition-all ${
                currency === 'USDT'
                  ? 'border-gold-400 bg-gold-400/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="text-2xl mb-1">💎</div>
              <p className="text-white font-semibold">USDT</p>
              <p className="text-gray-400 text-xs">BEP20</p>
            </button>
            <button
              onClick={() => setCurrency('TON')}
              className={`p-4 rounded-xl border-2 transition-all ${
                currency === 'TON'
                  ? 'border-blue-400 bg-blue-400/10'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="text-2xl mb-1">🚀</div>
              <p className="text-white font-semibold">TON</p>
              <p className="text-gray-400 text-xs">${tonPrice.toFixed(2)}</p>
            </button>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">Wallet Address</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={`Enter your ${currency} wallet address`}
            className="w-full py-3 px-4 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
        </div>

        {/* Fee Breakdown */}
        {inputUSD > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-white/5 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">USD Value</span>
              <span className="text-white">${inputUSD.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Fee (${WITHDRAW_FEE} + {WITHDRAW_FEE_PERCENT}%)</span>
              <span className="text-red-400">-${fee.toFixed(3)}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex items-center justify-between">
              <span className="text-white font-semibold">You Receive</span>
              <span className="text-gold-400 font-bold">${netAmount.toFixed(2)}</span>
            </div>
            <div className="text-center text-gray-500 text-xs">
              ≈ {currency === 'USDT' ? netAmount.toFixed(4) : (netAmount / tonPrice).toFixed(4)} {currency}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleWithdraw}
          disabled={!isValid || loading}
          className={`btn-neon-gold w-full ${(!isValid || loading) ? 'opacity-50' : ''}`}
        >
          {loading ? 'Processing...' : 'Withdraw'}
        </button>
      </div>

      {/* History */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <ArrowUpRight className="text-neon-purple" size={20} />
          Withdrawal History
        </h3>

        {withdrawals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-50">💸</div>
            <p className="text-gray-400">No withdrawals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  w.status === 'completed' ? 'bg-green-500/20' :
                  w.status === 'rejected' ? 'bg-red-500/20' :
                  'bg-yellow-500/20'
                }`}>
                  {w.currency === 'USDT' ? '💎' : '🚀'}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">${w.amount.toFixed(2)} {w.currency}</p>
                  <p className="text-gray-400 text-sm truncate max-w-[150px]">
                    {w.wallet_address.slice(0, 8)}...{w.wallet_address.slice(-6)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {statusIcons[w.status]}
                    <span className={`text-sm ${statusColors[w.status]} capitalize`}>
                      {w.status}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {new Date(w.created_at).toLocaleDateString()}
                  </p>
                </div>
                {w.tx_id && (
                  <a
                    href={`https://${
                      w.currency === 'USDT' ? 'bscscan.com' : 'tonviewer.com'
                    }/tx/${w.tx_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
