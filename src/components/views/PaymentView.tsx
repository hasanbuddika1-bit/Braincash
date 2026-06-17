import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { supabase } from '../../lib/supabase';
import {
  Wallet,
  ArrowDownLeft,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';

const PACKAGES = [
  { points: 500, price: 0.05, bonus: 50, popular: false },
  { points: 1000, price: 0.10, bonus: 100, popular: false },
  { points: 2500, price: 0.25, bonus: 300, popular: true },
  { points: 5000, price: 0.50, bonus: 750, popular: false },
  { points: 10000, price: 1.00, bonus: 2000, popular: false },
];

export function PaymentView() {
  const { user, haptic, addPoints } = useApp();
  const [selectedPackage, setSelectedPackage] = useState<typeof PACKAGES[0] | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'usdt' | 'ton'>('usdt');
  const [copied, setCopied] = useState(false);
  const [tonPrice, setTonPrice] = useState(7.5);
  const [showQR, setShowQR] = useState(false);

  const DEPOSIT_WALLET_USDT = '0x1234567890abcdef1234567890abcdef12345678'; // Replace with actual wallet
  const DEPOSIT_WALLET_TON = 'EQD1234567890abcdef1234567890abcdef'; // Replace with actual wallet

  useEffect(() => {
    fetchPrices();
  }, []);

  async function fetchPrices() {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether,the-open-network&vs_currencies=usd'
      );
      const data = await response.json();
      setTonPrice(data['the-open-network']?.usd || 7.5);
    } catch {
      // Use default
    }
  }

  const copyAddress = () => {
    const address = paymentMethod === 'usdt' ? DEPOSIT_WALLET_USDT : DEPOSIT_WALLET_TON;
    navigator.clipboard.writeText(address);
    setCopied(true);
    haptic('success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePurchase = () => {
    if (!selectedPackage) return;

    haptic('light');

    if (window.Telegram?.WebApp?.openInvoice) {
      // Use Telegram Stars for payments
      const telegramPrice = selectedPackage.price * 100; // Convert to Telegram Stars
      window.Telegram.WebApp.openInvoice(`t.me/$${telegramPrice}`, (status) => {
        if (status === 'paid') {
          addPoints(selectedPackage.points + selectedPackage.bonus);
          haptic('success');
        }
      });
    } else {
      // Show crypto payment
      setShowQR(true);
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-['Orbitron'] text-white flex items-center gap-3">
          <span className="text-4xl">💳</span>
          Buy Points
        </h1>
        <p className="text-purple-300 mt-2">Get bonus points on every purchase!</p>
      </div>

      {/* Current Balance */}
      <div className="glass-card p-4 mb-6 bg-gradient-to-br from-purple-800/30 to-blue-800/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Current Balance</p>
            <p className="text-2xl font-bold text-white font-['Orbitron']">
              {user?.points?.toLocaleString() || 0}
              <span className="text-gold-400 text-sm ml-1">pts</span>
            </p>
          </div>
          <div className="text-5xl">💰</div>
        </div>
      </div>

      {/* Point Packages */}
      <div className="mb-6">
        <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Zap className="text-gold-400" size={20} />
          Select Package
        </h2>
        <div className="space-y-3">
          {PACKAGES.map((pkg, index) => (
            <button
              key={index}
              onClick={() => {
                haptic('light');
                setSelectedPackage(pkg);
              }}
              className={`w-full glass-card p-4 relative transition-all ${
                selectedPackage?.points === pkg.points
                  ? 'border-2 border-gold-400 shadow-neon-gold'
                  : 'hover:border-purple-500/50'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-2 right-4 badge-gold text-purple-900 text-xs">
                  BEST VALUE
                </div>
              )}

              <div className="flex items-center gap-4">
                <div className="text-4xl">💎</div>
                <div className="flex-1 text-left">
                  <p className="text-white font-bold text-xl">
                    {pkg.points.toLocaleString()} Points
                  </p>
                  {pkg.bonus > 0 && (
                    <p className="text-green-400 text-sm">+{pkg.bonus} bonus points!</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-gold-400 font-bold text-xl">${pkg.price.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">USDT/TON</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      {selectedPackage && (
        <div className="mb-6 animate-slide-up">
          <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="text-blue-400" size={20} />
            Payment Method
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                haptic('light');
                setPaymentMethod('usdt');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'usdt'
                  ? 'border-gold-400 bg-gold-400/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-3xl mb-2">💎</div>
              <p className="text-white font-semibold">USDT</p>
              <p className="text-gray-400 text-xs">BEP20 Network</p>
            </button>
            <button
              onClick={() => {
                haptic('light');
                setPaymentMethod('ton');
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                paymentMethod === 'ton'
                  ? 'border-blue-400 bg-blue-400/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-3xl mb-2">🚀</div>
              <p className="text-white font-semibold">TON</p>
              <p className="text-gray-400 text-xs">${tonPrice.toFixed(2)}</p>
            </button>
          </div>
        </div>
      )}

      {/* Purchase Button */}
      {selectedPackage && (
        <button onClick={handlePurchase} className="btn-neon-gold w-full mb-6">
          <Wallet className="w-5 h-5 mr-2" />
          Pay ${selectedPackage.price.toFixed(2)}
        </button>
      )}

      {/* Security Info */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Shield className="text-green-400" size={24} />
          <h3 className="text-white font-semibold">Secure Payment</h3>
        </div>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Instant delivery after payment
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            Encrypted transactions
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-400">✓</span>
            24/7 support available
          </li>
        </ul>
      </div>

      {/* QR Modal */}
      {showQR && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="modal-content text-center max-w-sm w-[90%]">
            <div className="text-5xl mb-4">💳</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Send {selectedPackage.price.toFixed(2)} {paymentMethod.toUpperCase()}
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              to the address below
            </p>

            <div className="bg-white p-4 rounded-xl mb-4 inline-block">
              <QrCode size={150} className="text-purple-900" />
            </div>

            <div className="glass-card p-3 mb-4">
              <p className="text-gray-400 text-xs mb-1">Wallet Address</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs text-white break-all">
                  {paymentMethod === 'usdt' ? DEPOSIT_WALLET_USDT : DEPOSIT_WALLET_TON}
                </code>
                <button onClick={copyAddress} className="text-gold-400">
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-yellow-400 mb-4">
              <Clock size={16} />
              <span className="text-sm">Payment expires in 30 minutes</span>
            </div>

            <button onClick={() => setShowQR(false)} className="btn-neon w-full">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
