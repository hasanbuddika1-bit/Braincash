import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../Toast';
import { supabase } from '../../lib/supabase';
import { Ticket, Gift, ExternalLink, CheckCircle, X, Star, Zap } from 'lucide-react';

export function RewardCodeView() {
  const { user, haptic, setCurrentView, refreshUser } = useApp();
  const { success: showSuccess, error: showError } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [claimedCodes, setClaimedCodes] = useState<{ code: string; reward: number; claimed_at: string }[]>([]);

  useEffect(() => {
    loadClaimedCodes();
  }, [user?.id]);

  async function loadClaimedCodes() {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('reward_code_claims')
        .select('code_id, claimed_at, reward_codes!inner(code, reward_points)')
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false })
        .limit(20);

      const claims = (data || []).map((c: any) => ({
        code: c.reward_codes?.code || 'Unknown',
        reward: c.reward_codes?.reward_points || 0,
        claimed_at: c.claimed_at,
      }));
      setClaimedCodes(claims);
    } catch (err) {
      console.error('Error loading claimed codes:', err);
    }
  }

  async function handleClaim() {
    if (!user || !code.trim()) return;
    haptic('light');
    setLoading(true);

    try {
      const { data, error } = await supabase.rpc('claim_reward_code', {
        p_code: code.trim().toUpperCase(),
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success) {
        haptic('success');
        showSuccess(`+${result.reward} Points!`, 'Reward code claimed successfully!');
        setCode('');
        await refreshUser();
        loadClaimedCodes();
      } else {
        haptic('error');
        showError('Claim Failed', result.error || 'Invalid or expired code.');
      }
    } catch (err) {
      console.error('Error claiming code:', err);
      showError('Claim Failed', 'Could not claim this code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">🎁</span>
          Reward Code
        </h1>
        <p className="text-green-400 mt-2">Enter a code from our community channel to earn points!</p>
      </div>

      {/* Community Channel Link */}
      <div className="glass-card p-4 mb-6" style={{ background: 'linear-gradient(135deg, rgba(0,200,83,0.1), rgba(37,99,235,0.1))' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
            <Ticket className="text-white" size={24} />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold">Get Reward Codes</p>
            <p className="text-gray-400 text-sm">Join our community channel to get reward codes!</p>
          </div>
        </div>
        <a
          href="https://t.me/braincashgroup"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
        >
          <ExternalLink size={18} /> Open Community Channel
        </a>
      </div>

      {/* Code Input */}
      <div className="glass-card p-6 mb-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Gift className="text-gold-400" size={20} /> Enter Code
        </h3>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ENTER REWARD CODE"
          maxLength={30}
          className="w-full py-4 px-4 rounded-xl bg-white/10 text-white text-center text-2xl font-black tracking-widest placeholder-gray-500 placeholder:text-sm placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
          onKeyDown={(e) => e.key === 'Enter' && handleClaim()}
        />
        <button
          onClick={handleClaim}
          disabled={!code.trim() || loading}
          className={`w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 ${
            !code.trim() || loading ? 'opacity-50 bg-white/10 text-gray-400' : 'text-white'
          }`}
          style={code.trim() && !loading ? { background: 'linear-gradient(90deg, #00c853, #fbbf24)', color: '#080814', boxShadow: '0 0 20px rgba(0,200,83,0.5)' } : {}}
        >
          {loading ? 'Claiming...' : 'Claim Reward!'}
        </button>
      </div>

      {/* Claimed Codes History */}
      <div className="glass-card p-4">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="text-green-400" size={20} /> Your Claimed Codes
        </h3>
        {claimedCodes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 opacity-40">🎫</div>
            <p className="text-gray-400">No codes claimed yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claimedCodes.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Star className="text-gold-400" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-mono font-bold">{c.code}</p>
                  <p className="text-gray-500 text-xs">{new Date(c.claimed_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full" style={{ background: 'rgba(251,191,36,0.15)' }}>
                  <Zap className="text-gold-400" size={12} />
                  <span className="text-gold-400 font-bold text-sm">+{c.reward}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
