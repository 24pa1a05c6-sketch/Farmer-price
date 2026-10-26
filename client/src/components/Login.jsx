import React, { useState } from 'react';
import { authService } from '../services/api.js';

export default function Login({ onAuthSuccess, onNavigateToSignup, onNavigateToHome, lang = 'en' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage(lang === 'te' ? 'దయచేసి ఇమెయిల్ మరియు పాస్‌వర్డ్ నమోదు చేయండి.' : 'Please enter your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.login({ email: email.trim(), password });
      setIsLoading(false);
      if (res.data?.success && res.data?.user) {
        if (rememberMe) {
          localStorage.setItem('kisansetu_saved_email', email.trim());
        } else {
          localStorage.removeItem('kisansetu_saved_email');
        }
        onAuthSuccess(res.data.user);
      }
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.message || (lang === 'te' ? 'లాగిన్ విఫలమైంది. దయచేసి వివరాలను సరిచూసుకోండి.' : 'Authentication failed. Please verify your email and password.');
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#202820] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl border border-[#B68A57]/30 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">
        {/* Left Side: Editorial Agricultural Hero Rail */}
        <div className="lg:col-span-5 relative bg-[#10271F] text-[#F7F4EC] p-8 sm:p-10 flex flex-col justify-between overflow-hidden">
          <img
            src="/images/auth-banner.jpg"
            alt="Andhra Pradesh Paddy Terraces"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#10271F] via-[#10271F]/80 to-transparent" />

          {/* Top Brand Identity */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#79A86B] text-[#10271F] font-bold text-lg flex items-center justify-center shadow-md">
                KS
              </span>
              <div>
                <span className="font-bold tracking-wider text-xl font-display">KISANSETU</span>
                <span className="block text-[11px] text-[#C8D5C0] font-sans">
                  {lang === 'te' ? 'రైతు మార్కెట్ వేదిక' : 'Farmer Crop Price Tracker & Market Intelligence'}
                </span>
              </div>
            </div>
          </div>

          {/* Middle Value Props */}
          <div className="relative z-10 my-8 space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display leading-tight text-[#F7F4EC]">
              {lang === 'te' ? 'మీ పంట. మీ మార్కెట్. మీ నిర్ణయం.' : 'KNOW YOUR PRICE. GROW YOUR PROFIT.'}
            </h2>
            <p className="text-sm text-[#E9E0D2] leading-relaxed">
              {lang === 'te'
                ? 'ఆంధ్రప్రదేశ్ మార్కెట్ యార్డులలో రోజువారీ మోడల్ ధరలు మరియు నికర లాభాలను లెక్కించండి.'
                : 'Access verified daily APMC modal prices, compare net realizations, and protect your harvest value.'}
            </p>
            <div className="space-y-2 pt-2 text-xs text-[#C8D5C0]">
              <div className="flex items-center gap-2">
                <span className="text-[#79A86B] font-bold">✓</span>
                <span>{lang === 'te' ? 'అధికారిక AGMARKNET e-NAM రేట్లు' : 'Official AGMARKNET e-NAM benchmark rates'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#79A86B] font-bold">✓</span>
                <span>{lang === 'te' ? 'రవాణా ఖర్చులను మినహాయించిన నికర గణన' : 'Accurate transport & hamali cost deductions'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#79A86B] font-bold">✓</span>
                <span>{lang === 'te' ? 'లక్ష్య ధర హెచ్చరికలు & నోటిఫికేషన్లు' : 'Custom target price watch alerts'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Back Button */}
          <div className="relative z-10">
            <button
              type="button"
              onClick={onNavigateToHome}
              className="text-xs text-[#E9E0D2] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              ← {lang === 'te' ? 'మార్కెట్ ధరల పేజీకి తిరిగి వెళ్లండి' : 'Back to Market Explorer'}
            </button>
          </div>
        </div>

        {/* Right Side: Clean Farmer Login Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-[#F7F4EC]/50">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#163B2B]/10 text-[#163B2B] text-xs font-semibold uppercase tracking-wider mb-2">
                {lang === 'te' ? 'రైతు లాగిన్' : 'Farmer Sign In'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#163B2B] tracking-tight">
                {lang === 'te' ? 'మీ ఖాతాలోకి ప్రవేశించండి' : 'Welcome Back'}
              </h1>
              <p className="text-sm text-[#72796F] mt-1">
                {lang === 'te'
                  ? 'మీ మార్కెట్ అలర్ట్‌లు మరియు భద్రపరిచిన పంటల వివరాలను వీక్షించండి.'
                  : 'Enter your credentials to access your saved crops, alerts, and personalized mandi insights.'}
              </p>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 shadow-sm">
                <span className="font-bold text-sm shrink-0">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1.5">
                  {lang === 'te' ? 'ఇమెయిల్ చిరునామా' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farmer@example.com"
                  autoComplete="email"
                  className="w-full px-4 py-3 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider">
                    {lang === 'te' ? 'పాస్‌వర్డ్' : 'Password'}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#72796F] hover:text-[#163B2B] p-1 font-mono transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-[#72796F]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#C8D5C0] text-[#163B2B] focus:ring-[#79A86B]"
                  />
                  <span>{lang === 'te' ? 'నన్ను గుర్తుంచుకో' : 'Remember me'}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#163B2B] text-[#F7F4EC] font-semibold text-sm hover:bg-[#10271F] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{lang === 'te' ? 'ప్రవేశిస్తోంది...' : 'Signing in...'}</span>
                  </>
                ) : (
                  <span>{lang === 'te' ? 'లాగిన్ అవ్వండి' : 'Sign In to KisanSetu'}</span>
                )}
              </button>
            </form>

            {/* Signup Callout */}
            <div className="pt-4 border-t border-[#E9E0D2] text-center text-xs text-[#72796F]">
              <span>{lang === 'te' ? 'ఖాతా లేదా?' : "Don't have an account yet?"} </span>
              <button
                type="button"
                onClick={onNavigateToSignup}
                className="font-bold text-[#163B2B] hover:text-[#79A86B] transition-colors underline ml-1"
              >
                {lang === 'te' ? 'ఉచిత రైతు ఖాతాను ప్రారంభించండి' : 'Create a free Farmer Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
