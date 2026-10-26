import React, { useState } from 'react';
import { authService } from '../services/api.js';

const AP_DISTRICTS = [
  'Guntur',
  'West Godavari',
  'East Godavari',
  'Kakinada',
  'Eluru',
  'NTR (Vijayawada)',
  'Krishna',
  'Kurnool',
  'Annamayya',
  'Prakasam',
  'Nellore',
  'Chittoor',
  'Visakhapatnam',
  'Vizianagaram',
  'Srikakulam'
];

export default function Signup({ onAuthSuccess, onNavigateToLogin, onNavigateToHome, lang = 'en' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('Guntur');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password strength evaluation
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const strengthScore = [hasMinLength, hasLetter, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (!password) return { label: '', color: 'bg-gray-200', text: '' };
    if (strengthScore <= 1) return { label: lang === 'te' ? 'బలహీనం' : 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    if (strengthScore === 2 || strengthScore === 3) return { label: lang === 'te' ? 'మధ్యస్థం' : 'Medium', color: 'bg-amber-500', text: 'text-amber-600' };
    return { label: lang === 'te' ? 'బలమైనది' : 'Strong', color: 'bg-emerald-600', text: 'text-emerald-600' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage(lang === 'te' ? 'దయచేసి మీ పూర్తి పేరు నమోదు చేయండి.' : 'Please enter your full name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage(lang === 'te' ? 'దయచేసి చెల్లుబాటు అయ్యే ఇమెయిల్ నమోదు చేయండి.' : 'Please provide a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage(lang === 'te' ? 'పాస్‌వర్డ్ కనీసం 8 అక్షరాలు ఉండాలి.' : 'Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(lang === 'te' ? 'పాస్‌వర్డ్‌లు సరిపోలడం లేదు.' : 'Passwords do not match.');
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage(lang === 'te' ? 'దయచేసి నిబంధనలు మరియు గోప్యతా విధానాన్ని అంగీకరించండి.' : 'Please agree to the terms and privacy policy to continue.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        district,
        preferredLanguage: lang,
        state: 'Andhra Pradesh'
      });
      setIsLoading(false);
      if (res.data?.success && res.data?.user) {
        onAuthSuccess(res.data.user);
      }
    } catch (err) {
      setIsLoading(false);
      const msg = err.response?.data?.message || (lang === 'te' ? 'నమోదు విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.' : 'Registration failed. Please check your details and try again.');
      setErrorMessage(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#202820] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-xl border border-[#B68A57]/30 overflow-hidden grid lg:grid-cols-12 min-h-[640px]">
        {/* Left Side: Agricultural Hero Rail */}
        <div className="lg:col-span-5 relative bg-[#10271F] text-[#F7F4EC] p-8 sm:p-10 flex flex-col justify-between overflow-hidden">
          <img
            src="/images/auth-banner.jpg"
            alt="Andhra Pradesh Farmland"
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
              {lang === 'te' ? 'ఆంధ్రప్రదేశ్ రైతులకు డిజిటల్ మార్కెట్ మద్దతు' : 'JOIN OVER 25,000+ ANDHRA PRADESH FARMERS'}
            </h2>
            <p className="text-sm text-[#E9E0D2] leading-relaxed">
              {lang === 'te'
                ? 'మీరు మీ పంటను మార్కెట్‌కు రవాణా చేసే ముందు సరైన ధరను మరియు నికర రాబడిని ఖచ్చితంగా తెలుసుకోండి.'
                : 'Calculate true take-home earnings before dispatching your harvest. Compare live APMC yards across districts with zero guesswork.'}
            </p>
            <div className="space-y-2 pt-2 text-xs text-[#C8D5C0]">
              <div className="flex items-center gap-2">
                <span className="text-[#79A86B] font-bold">✓</span>
                <span>{lang === 'te' ? 'ఉచిత రైతు సభ్యత్వం — దాచిన ఖర్చులు లేవు' : '100% Free for farmers — no hidden charges'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#79A86B] font-bold">✓</span>
                <span>{lang === 'te' ? 'మీ సమీప మండి తాజా రవాణా ఖర్చుల గణన' : 'Direct transport haulage & hamali deductions'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#79A86B] font-bold">✓</span>
                <span>{lang === 'te' ? 'వ్యక్తిగత పంటల ధర హెచ్చరికలు' : 'Track your specific crop varieties & mandis'}</span>
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

        {/* Right Side: Farmer Signup Form */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center bg-[#F7F4EC]/50 overflow-y-auto max-h-[85vh]">
          <div className="max-w-md w-full mx-auto space-y-5">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#163B2B]/10 text-[#163B2B] text-xs font-semibold uppercase tracking-wider mb-2">
                {lang === 'te' ? 'కొత్త ఖాతా నమోదు' : 'Farmer Registration'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#163B2B] tracking-tight">
                {lang === 'te' ? 'రైతు ఖాతా సృష్టించండి' : 'Create Your Account'}
              </h1>
              <p className="text-sm text-[#72796F] mt-1">
                {lang === 'te'
                  ? 'మీ మార్కెట్ అలర్ట్‌లు మరియు పంట ధరలను ట్రాక్ చేయడానికి వివరాలను నమోదు చేయండి.'
                  : 'Start tracking daily APMC prices and calculate net earnings across mandis.'}
              </p>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 shadow-sm">
                <span className="font-bold text-sm shrink-0">⚠️</span>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1">
                  {lang === 'te' ? 'పూర్తి పేరు' : 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1">
                    {lang === 'te' ? 'ఇమెయిల్ చిరునామా' : 'Email Address'} *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer@example.com"
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1">
                    {lang === 'te' ? 'మొబైల్ సంఖ్య' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9848022338"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1">
                  {lang === 'te' ? 'ఆంధ్రప్రదేశ్ జిల్లా' : 'Primary District'}
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm"
                >
                  {AP_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1">
                    {lang === 'te' ? 'పాస్‌వర్డ్' : 'Password'} *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#72796F] hover:text-[#163B2B]"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#163B2B] uppercase tracking-wider mb-1">
                    {lang === 'te' ? 'పాస్‌వర్డ్ నిర్ధారణ' : 'Confirm'} *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#72796F]">Strength:</span>
                    <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full flex-1 rounded-full ${strengthScore >= 1 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strengthScore >= 2 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strengthScore >= 3 ? strength.color : 'bg-transparent'}`} />
                    <div className={`h-full flex-1 rounded-full ${strengthScore >= 4 ? strength.color : 'bg-transparent'}`} />
                  </div>
                  <p className="text-[10px] text-[#72796F]">
                    {lang === 'te' ? 'కనీసం 8 అక్షరాలు, సంఖ్యలు మరియు చిహ్నాలు వాడండి.' : 'Use 8+ characters with mixed letters and numbers.'}
                  </p>
                </div>
              )}

              {/* Terms and Privacy Agreement Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#72796F]">
                  <input
                    type="checkbox"
                    required
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 rounded border-[#C8D5C0] text-[#163B2B] focus:ring-[#79A86B]"
                  />
                  <span>
                    {lang === 'te' ? (
                      <>
                        నేను కిసాన్‌సేతు యొక్క{' '}
                        <span className="text-[#163B2B] font-semibold">సేవా నిబంధనలు</span> మరియు{' '}
                        <span className="text-[#163B2B] font-semibold">గోప్యతా విధానాన్ని</span> అంగీకరిస్తున్నాను.
                      </>
                    ) : (
                      <>
                        I agree to KisanSetu's{' '}
                        <span className="text-[#163B2B] font-semibold">Terms of Service</span> and{' '}
                        <span className="text-[#163B2B] font-semibold">Privacy Policy</span> for mandi intelligence.
                      </>
                    )}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#163B2B] text-[#F7F4EC] font-semibold text-sm hover:bg-[#10271F] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{lang === 'te' ? 'ఖాతా సృష్టించబడుతోంది...' : 'Creating Account...'}</span>
                  </>
                ) : (
                  <span>{lang === 'te' ? 'రైతు ఖాతా నమోదు చేయండి' : 'Create Free Farmer Account'}</span>
                )}
              </button>
            </form>

            {/* Login Callout */}
            <div className="pt-3 border-t border-[#E9E0D2] text-center text-xs text-[#72796F]">
              <span>{lang === 'te' ? 'ఇప్పటికే ఖాతా ఉందా?' : 'Already have an account?'} </span>
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="font-bold text-[#163B2B] hover:text-[#79A86B] transition-colors underline ml-1"
              >
                {lang === 'te' ? 'లాగిన్ అవ్వండి' : 'Sign In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
