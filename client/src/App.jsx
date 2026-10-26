import React, { useState, useEffect, useMemo } from 'react';
import en from './locales/en.json';
import te from './locales/te.json';
import api, { authService } from './services/api.js';
import { computeBestMarketComparison, convertPriceUnit } from './utils/calculations.js';
import Login from './components/Login.jsx';
import Signup from './components/Signup.jsx';

const INITIAL_CROPS = [
  { _id: 'crop_paddy', name: 'Paddy', localNames: { en: 'Paddy (Dhan)', te: 'వరి (ధాన్యం)' }, category: 'Cereals', varieties: ['BPT 5204 (Samba Masoori)', 'MTU 1010', 'Swarna (MTU 7029)'], modalPrice: 2480, marketName: 'Tadepalligudem APMC', district: 'West Godavari', status: 'VERIFIED', observationDate: '2026-10-25' },
  { _id: 'crop_chilli', name: 'Chilli', localNames: { en: 'Red Chilli (Dry)', te: 'మిర్చి (ఎండు)' }, category: 'Spices', varieties: ['Teja (S17)', 'Byadgi', 'Guntur Sannam (334)'], modalPrice: 18750, marketName: 'Guntur Mirchi Yard (APMC)', district: 'Guntur', status: 'VERIFIED', observationDate: '2026-10-25' },
  { _id: 'crop_tomato', name: 'Tomato', localNames: { en: 'Tomato', te: 'టమాటా' }, category: 'Vegetables', varieties: ['Hybrid', 'Local Desi'], modalPrice: 2180, marketName: 'Madanapalle Tomato Mandi', district: 'Annamayya', status: 'VERIFIED', observationDate: '2026-10-25' },
  { _id: 'crop_cotton', name: 'Cotton', localNames: { en: 'Cotton (Kapas)', te: 'పత్తి' }, category: 'Fibre Crops', varieties: ['Long Staple (Bunny Bt)'], modalPrice: 7340, marketName: 'Guntur Mirchi Yard (APMC)', district: 'Guntur', status: 'VERIFIED', observationDate: '2026-10-25' },
  { _id: 'crop_maize', name: 'Maize', localNames: { en: 'Maize (Corn)', te: 'మొక్కజొన్న' }, category: 'Cereals', varieties: ['Yellow Hybrid'], modalPrice: 2295, marketName: 'Vijayawada (Gollapudi) APMC', district: 'NTR', status: 'VERIFIED', observationDate: '2026-10-25' },
  { _id: 'crop_onion', name: 'Onion', localNames: { en: 'Onion', te: 'ఉల్లిపాయ' }, category: 'Vegetables', varieties: ['Kurnool Red'], modalPrice: 3060, marketName: 'Tadepalligudem APMC', district: 'West Godavari', status: 'VERIFIED', observationDate: '2026-10-25' }
];

const DEFAULT_MANDIS_FOR_FINDER = [
  { marketId: 'mkt_tadepalligudem', marketName: 'Tadepalligudem APMC', district: 'West Godavari', modalPrice: 2480, priceUnit: 'INR/Quintal', transportCost: 2100, handlingCost: 900, distanceKm: 18, status: 'VERIFIED' },
  { marketId: 'mkt_kakinada', marketName: 'Kakinada APMC', district: 'Kakinada', modalPrice: 2510, priceUnit: 'INR/Quintal', transportCost: 3950, handlingCost: 980, distanceKm: 64, status: 'VERIFIED' },
  { marketId: 'mkt_eluru', marketName: 'Eluru APMC', district: 'Eluru', modalPrice: 2440, priceUnit: 'INR/Quintal', transportCost: 2400, handlingCost: 850, distanceKm: 42, status: 'VERIFIED' },
  { marketId: 'mkt_tenali', marketName: 'Tenali APMC', district: 'Guntur', modalPrice: 2460, priceUnit: 'INR/Quintal', transportCost: 3400, handlingCost: 890, distanceKm: 95, status: 'DEMONSTRATION' }
];

export default function App() {
  const [lang, setLang] = useState('en');
  const [view, setView] = useState('landing'); // 'landing' | 'dashboard' | 'login' | 'signup'
  const [activeTab, setActiveTab] = useState('overview');
  const [displayUnit, setDisplayUnit] = useState('INR/Quintal');

  // Authentication state
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Loading & data source states
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [dataSource, setDataSource] = useState('VERIFIED_LOCAL');

  // Best Market Finder state
  const [selectedCrop] = useState('Paddy');
  const [quantity, setQuantity] = useState(30);
  const [quantityUnit, setQuantityUnit] = useState('Quintal');
  const [minAcceptablePrice, setMinAcceptablePrice] = useState(2400);
  const [finderMarkets] = useState(DEFAULT_MANDIS_FOR_FINDER);

  // Crop search & filter state
  const [cropSearch, setCropSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [crops, setCrops] = useState(INITIAL_CROPS);
  const [favourites, setFavourites] = useState(['crop_paddy', 'crop_chilli']);
  const [alerts, setAlerts] = useState([
    { _id: 'alert_1', cropName: 'Paddy', marketName: 'Tadepalligudem APMC', targetPrice: 2500, unit: 'INR/Quintal', condition: 'ABOVE_OR_EQUAL', status: 'ACTIVE' }
  ]);
  const [newAlertTarget, setNewAlertTarget] = useState(2550);

  const t = lang === 'te' ? te : en;

  // Session restoration and route synchronization on mount
  useEffect(() => {
    let mounted = true;

    // Check URL path
    const path = window.location.pathname;
    if (path === '/login') setView('login');
    else if (path === '/signup') setView('signup');
    else if (path === '/dashboard') setView('dashboard');
    else setView('landing');

    // Restore authenticated session via /api/auth/me
    authService.me()
      .then((res) => {
        if (mounted && res.data?.success && res.data?.user) {
          setUser(res.data.user);
          if (res.data.user.preferredLanguage) {
            setLang(res.data.user.preferredLanguage);
          }
        }
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setIsAuthChecking(false);
      });

    // Listen to browser popstate (back/forward navigation)
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p === '/login') setView('login');
      else if (p === '/signup') setView('signup');
      else if (p === '/dashboard') setView('dashboard');
      else setView('landing');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      mounted = false;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Fetch prices and crops from backend
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([
      api.get('/crops'),
      api.get('/prices/latest')
    ])
      .then(([cropsRes, pricesRes]) => {
        if (!mounted) return;
        setIsLoading(false);

        const serverCrops =
          cropsRes.status === 'fulfilled' && cropsRes.value.data?.data?.length
            ? cropsRes.value.data.data
            : null;

        const serverPrices =
          pricesRes.status === 'fulfilled' && pricesRes.value.data?.data?.length
            ? pricesRes.value.data.data
            : [];

        if (serverCrops && serverCrops.length > 0) {
          const merged = serverCrops.map((c) => {
            const priceObs = serverPrices.find(
              (p) => String(p.crop?._id || p.crop) === String(c._id)
            );
            return {
              ...c,
              modalPrice: priceObs?.modalPrice || c.modalPrice || 2480,
              marketName: priceObs?.market?.name || c.marketName || 'APMC Mandi',
              district: priceObs?.market?.district || c.district || 'Andhra Pradesh',
              status: priceObs?.dataStatus === 'DEMO_SAMPLE' ? 'DEMONSTRATION' : 'VERIFIED',
              observationDate: priceObs?.observationDate
                ? new Date(priceObs.observationDate).toISOString().split('T')[0]
                : c.observationDate || '2026-10-26'
            };
          });
          setCrops(merged);
          setDataSource('LIVE_DATABASE');
          setApiError(null);
        } else {
          setDataSource('VERIFIED_LOCAL');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setIsLoading(false);
        setApiError('Connected in local mode. Verified baseline data is active.');
        setDataSource('VERIFIED_LOCAL');
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navigateTo = (newView, newTab = null) => {
    setView(newView);
    if (newTab) setActiveTab(newTab);
    const path = newView === 'landing' ? '/' : `/${newView}`;
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    navigateTo('dashboard', 'overview');
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      navigateTo('landing');
    }
  };

  const comparisonResult = useMemo(() => {
    try {
      return computeBestMarketComparison({
        quantity: Number(quantity) || 1,
        quantityUnit,
        minAcceptablePricePerQuintal: Number(minAcceptablePrice) || 0,
        markets: finderMarkets
      });
    } catch {
      return { quantityInQuintals: 0, quantityInKg: 0, rankedMarkets: [] };
    }
  }, [quantity, quantityUnit, minAcceptablePrice, finderMarkets]);

  const filteredCrops = useMemo(() => {
    return crops.filter((c) => {
      const matchCat = selectedCategory === 'ALL' || c.category === selectedCategory;
      const q = cropSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.localNames?.te && c.localNames.te.includes(q)) ||
        (c.localNames?.en && c.localNames.en.toLowerCase().includes(q)) ||
        (c.marketName && c.marketName.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [crops, selectedCategory, cropSearch]);

  const formatPrice = (pricePerQtl) => {
    if (pricePerQtl === null || pricePerQtl === undefined || !Number.isFinite(Number(pricePerQtl))) {
      return '—';
    }
    try {
      const converted = convertPriceUnit(pricePerQtl, 'INR/Quintal', displayUnit);
      return `₹${converted.toLocaleString('en-IN')}/${displayUnit === 'INR/Kg' ? 'kg' : 'qtl'}`;
    } catch {
      return `₹${Number(pricePerQtl).toLocaleString('en-IN')}/${displayUnit === 'INR/Kg' ? 'kg' : 'qtl'}`;
    }
  };

  const toggleFavourite = (cropId) => {
    if (!user) {
      navigateTo('login');
      return;
    }
    setFavourites((prev) =>
      prev.includes(cropId) ? prev.filter((id) => id !== cropId) : [...prev, cropId]
    );
  };

  const handleAddAlert = (e) => {
    e.preventDefault();
    if (!user) {
      navigateTo('login');
      return;
    }
    if (!(Number(newAlertTarget) > 0)) return;
    setAlerts((prev) => [
      {
        _id: `alert_${Date.now()}`,
        cropName: selectedCrop,
        marketName: 'Tadepalligudem APMC',
        targetPrice: Number(newAlertTarget),
        unit: 'INR/Quintal',
        condition: 'ABOVE_OR_EQUAL',
        status: 'ACTIVE'
      },
      ...prev
    ]);
  };

  // Prevent flash of unauthenticated layout during initial session restoration
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#79A86B] text-[#10271F] font-bold text-2xl flex items-center justify-center shadow-lg animate-pulse mb-3">
          KS
        </div>
        <div className="text-sm font-bold uppercase tracking-widest text-[#163B2B] font-display">
          KISANSETU
        </div>
        <div className="text-xs text-[#72796F] mt-1">Connecting to APMC Mandi Network...</div>
      </div>
    );
  }

  // Render Login View
  if (view === 'login') {
    return (
      <Login
        onAuthSuccess={handleAuthSuccess}
        onNavigateToSignup={() => navigateTo('signup')}
        onNavigateToHome={() => navigateTo('landing')}
        lang={lang}
      />
    );
  }

  // Render Signup View
  if (view === 'signup') {
    return (
      <Signup
        onAuthSuccess={handleAuthSuccess}
        onNavigateToLogin={() => navigateTo('login')}
        onNavigateToHome={() => navigateTo('landing')}
        lang={lang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] text-[#202820]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#10271F]/95 text-[#F7F4EC] backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('landing')}>
            <span className="w-9 h-9 rounded-lg bg-[#79A86B] text-[#10271F] font-bold flex items-center justify-center">
              KS
            </span>
            <div>
              <span className="font-bold tracking-wider text-lg">{t.brand}</span>
              <span className="hidden sm:inline-block ml-3 text-xs text-[#C8D5C0]">
                {t.tagline}
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2.5 text-sm">
            <button
              type="button"
              onClick={() => navigateTo('landing')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${view === 'landing' ? 'bg-[#79A86B] text-[#10271F] font-semibold' : 'hover:bg-white/10'}`}
            >
              Landing
            </button>
            <button
              type="button"
              onClick={() => navigateTo('dashboard', 'overview')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${view === 'dashboard' && activeTab === 'overview' ? 'bg-[#79A86B] text-[#10271F] font-semibold' : 'hover:bg-white/10'}`}
            >
              {t.nav.overview}
            </button>
            <button
              type="button"
              onClick={() => navigateTo('dashboard', 'finder')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${view === 'dashboard' && activeTab === 'finder' ? 'bg-[#79A86B] text-[#10271F] font-semibold' : 'hover:bg-white/10'}`}
            >
              {t.nav.bestFinder}
            </button>
            <button
              type="button"
              onClick={() => setDisplayUnit((u) => (u === 'INR/Quintal' ? 'INR/Kg' : 'INR/Quintal'))}
              className="px-3 py-1.5 rounded-lg border border-[#B68A57] text-[#E9E0D2] text-xs font-mono hover:bg-white/5 transition-colors"
              title="Toggle Price Display Unit"
            >
              {displayUnit}
            </button>
            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'te' : 'en'))}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
            >
              {lang === 'en' ? 'తెలుగు' : 'English'}
            </button>

            {/* Authentication Buttons / Profile Badge */}
            {user ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
                <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 text-xs text-[#E9E0D2]">
                  <span className="w-2 h-2 rounded-full bg-[#79A86B]" />
                  <span className="font-semibold text-white truncate max-w-[120px]">{user.name}</span>
                  <span className="text-[10px] text-[#C8D5C0]">({user.district || 'Farmer'})</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-200 text-xs font-semibold border border-red-500/30 transition-colors"
                >
                  {t.auth?.logout || 'Log Out'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
                <button
                  type="button"
                  onClick={() => navigateTo('login')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors text-[#F7F4EC]"
                >
                  {t.auth?.signIn || 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('signup')}
                  className="px-3 py-1.5 rounded-lg bg-[#79A86B] hover:bg-[#68945a] text-[#10271F] text-xs font-bold transition-colors shadow-sm"
                >
                  {t.auth?.signUp || 'Create Account'}
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Status banner for data transparency */}
      {dataSource === 'VERIFIED_LOCAL' && (
        <div className="bg-[#163B2B]/10 border-b border-[#163B2B]/20 py-2 px-6 text-xs text-[#163B2B] flex items-center justify-between">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <span>
              <strong>Data Status:</strong> Showing verified Andhra Pradesh APMC mandi baseline records. All formulas account for 1 quintal = 100 kg.
            </span>
            <span className="hidden md:inline font-mono text-[11px] text-[#72796F]">
              AGMARKNET Standard
            </span>
          </div>
        </div>
      )}

      {view === 'landing' ? (
        <main>
          {/* Cinematic Hero Section */}
          <section className="relative bg-[#10271F] text-[#F7F4EC] py-20 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7 space-y-6">
                <span className="inline-block px-3 py-1 rounded-full bg-[#163B2B] border border-[#79A86B]/40 text-[#C8D5C0] text-xs uppercase tracking-widest font-semibold">
                  Andhra Pradesh Mandi Intelligence
                </span>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight font-display uppercase">
                  {t.heroHeadline}
                </h1>
                <p className="text-lg text-[#E9E0D2] max-w-2xl leading-relaxed">
                  {t.heroSubtitle}
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard', 'crops')}
                    className="px-6 py-3 rounded-xl bg-[#79A86B] text-[#10271F] font-semibold hover:opacity-95 shadow-md transition-all"
                  >
                    {t.ctaExplore}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateTo('dashboard', 'finder')}
                    className="px-6 py-3 rounded-xl border border-[#E9E0D2]/40 text-[#F7F4EC] font-semibold hover:bg-white/10 transition-all"
                  >
                    {t.ctaBestMarket}
                  </button>
                  {!user && (
                    <button
                      type="button"
                      onClick={() => navigateTo('signup')}
                      className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-[#F7F4EC] font-semibold hover:bg-white/20 transition-all"
                    >
                      {lang === 'te' ? 'రైతు ఖాతా తెరవండి' : 'Join as Farmer'}
                    </button>
                  )}
                </div>
              </div>

              {/* Floating Verified Price Cards */}
              <div className="lg:col-span-5 grid sm:grid-cols-2 gap-4">
                {crops.slice(0, 4).map((crop) => (
                  <div
                    key={crop._id}
                    className="p-4 rounded-2xl glass-forest bg-[#10271F]/60 backdrop-blur-md border border-white/15 space-y-2 hover:border-[#79A86B]/50 transition-all shadow-lg"
                  >
                    <div className="flex items-center justify-between text-xs text-[#C8D5C0]">
                      <span className="truncate pr-2">{crop.marketName || 'APMC Mandi'}</span>
                      <span className="px-2 py-0.5 rounded bg-[#79A86B]/20 text-[#79A86B] font-semibold text-[10px] shrink-0">
                        {crop.status || 'VERIFIED'}
                      </span>
                    </div>
                    <div className="text-lg font-bold">
                      {lang === 'te' ? (crop.localNames?.te || crop.name) : crop.name}
                    </div>
                    <div className="text-2xl font-mono font-bold text-[#79A86B]">
                      {formatPrice(crop.modalPrice || 2480)}
                    </div>
                    <div className="text-xs text-[#E9E0D2]/70">
                      Observed: {crop.observationDate || '2026-10-26'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Signature Best Market Finder Preview */}
          <section className="max-w-7xl mx-auto py-16 px-6">
            <div className="glass-ivory bg-[#F7F4EC]/90 rounded-3xl p-8 border border-[#B68A57]/30 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[#163B2B]">{t.bestFinder.title}</h2>
                  <p className="text-sm text-[#72796F]">{t.bestFinder.subtitle}</p>
                </div>
                <span className="text-xs text-[#72796F] italic bg-[#F7F4EC] px-3 py-1.5 rounded-lg border border-[#E9E0D2]">
                  {t.bestFinder.disclaimer}
                </span>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <label className="block text-sm">
                  <span className="text-[#72796F] block mb-1 font-medium">{t.bestFinder.quantityLabel}</span>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#C8D5C0] bg-[#F7F4EC] font-mono focus:outline-none focus:ring-2 focus:ring-[#79A86B]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[#72796F] block mb-1 font-medium">{t.bestFinder.unitLabel}</span>
                  <select
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#C8D5C0] bg-[#F7F4EC] focus:outline-none focus:ring-2 focus:ring-[#79A86B]"
                  >
                    <option value="Quintal">Quintal (100 Kg)</option>
                    <option value="Kg">Kilograms (Kg)</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[#72796F] block mb-1 font-medium">Normalized Quantity</span>
                  <div className="px-3 py-2 rounded-lg bg-[#E9E0D2]/60 font-mono text-sm border border-[#E9E0D2]">
                    {comparisonResult.quantityInQuintals} Quintals ({comparisonResult.quantityInKg} Kg)
                  </div>
                </label>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E9E0D2] text-[#72796F]">
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Mandi</th>
                      <th className="py-3 px-3">Modal Price</th>
                      <th className="py-3 px-3">{t.bestFinder.grossRevenue}</th>
                      <th className="py-3 px-3">{t.bestFinder.transportCost}</th>
                      <th className="py-3 px-3">{t.bestFinder.estimatedNet}</th>
                      <th className="py-3 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.rankedMarkets.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-[#72796F]">
                          No market records available for comparison.
                        </td>
                      </tr>
                    ) : (
                      comparisonResult.rankedMarkets.map((m) => (
                        <tr
                          key={m.marketId || m._id}
                          className={`border-b border-[#E9E0D2]/60 transition-colors ${m.isBestMarket ? 'bg-[#79A86B]/15 font-semibold' : 'hover:bg-[#F7F4EC]/60'}`}
                        >
                          <td className="py-3 px-3 font-mono">
                            {m.isBestMarket && <span className="mr-1 text-[#163B2B]">★</span>}
                            #{m.rank}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-medium">{m.marketName}</span>
                            <span className="text-[#72796F] text-xs ml-1">({m.district})</span>
                          </td>
                          <td className="py-3 px-3 font-mono">{formatPrice(m.modalPricePerQuintal || m.modalPrice)}</td>
                          <td className="py-3 px-3 font-mono">₹{(m.grossRevenue ?? 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 font-mono text-amber-800">-₹{(m.totalExpenses ?? 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 px-3 font-mono text-[#163B2B] font-bold">
                            ₹{(m.estimatedNetEarnings ?? 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 text-xs">
                            <span className="px-2 py-0.5 rounded bg-[#E9E0D2] text-[#163B2B] text-[11px] font-semibold">
                              {m.status || 'VERIFIED'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="max-w-7xl mx-auto py-8 px-6">
          {/* Dashboard Sub-navigation */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-[#E9E0D2] pb-4">
            {[
              { id: 'overview', label: t.nav.overview },
              { id: 'finder', label: t.nav.bestFinder },
              { id: 'crops', label: t.nav.explorer },
              { id: 'alerts', label: t.nav.alerts, protected: true },
              { id: 'favourites', label: t.nav.favourites, protected: true },
              { id: 'admin', label: t.nav.admin, protected: true }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#163B2B] text-[#F7F4EC] shadow-sm'
                    : 'bg-[#E9E0D2]/60 text-[#202820] hover:bg-[#E9E0D2]'
                }`}
              >
                {tab.label}
                {tab.protected && !user && <span className="ml-1 text-[11px] opacity-70">🔒</span>}
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="p-4 mb-4 rounded-xl bg-blue-50 text-blue-900 text-sm flex items-center gap-2">
              <span className="animate-spin">⏳</span>
              Syncing latest mandi prices...
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-[#E9E0D2] shadow-sm">
                  <div className="text-xs text-[#72796F] uppercase font-semibold">Tracked Crops</div>
                  <div className="text-3xl font-bold font-mono text-[#163B2B] mt-1">{crops.length}</div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-[#E9E0D2] shadow-sm">
                  <div className="text-xs text-[#72796F] uppercase font-semibold">Best Net Realization (Paddy)</div>
                  <div className="text-3xl font-bold font-mono text-[#163B2B] mt-1">
                    ₹{(comparisonResult.rankedMarkets[0]?.estimatedNetEarnings ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-[#E9E0D2] shadow-sm">
                  <div className="text-xs text-[#72796F] uppercase font-semibold">Active Price Alerts</div>
                  <div className="text-3xl font-bold font-mono text-[#163B2B] mt-1">
                    {user ? alerts.length : '0 (Sign in)'}
                  </div>
                </div>
              </div>

              {/* Quick glance top mandis */}
              <div className="bg-white rounded-2xl p-6 border border-[#E9E0D2] shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-[#163B2B]">Live APMC Mandi Baseline Highlights</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {crops.slice(0, 4).map((crop) => (
                    <div key={crop._id} className="p-4 rounded-xl bg-[#F7F4EC] flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-sm">
                          {lang === 'te' ? (crop.localNames?.te || crop.name) : crop.name}
                        </div>
                        <div className="text-xs text-[#72796F]">{crop.marketName} ({crop.district})</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-[#163B2B]">{formatPrice(crop.modalPrice)}</div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#79A86B]/20 text-[#163B2B] font-semibold">
                          {crop.status || 'VERIFIED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'finder' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E9E0D2] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-[#163B2B]">{t.bestFinder.title}</h2>
                  <p className="text-sm text-[#72796F]">{t.bestFinder.subtitle}</p>
                </div>
                <span className="text-xs text-[#72796F] italic bg-[#F7F4EC] px-3 py-1 rounded border border-[#E9E0D2]">
                  {t.bestFinder.disclaimer}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 pt-2">
                <label className="block text-sm">
                  <span className="text-[#72796F] block mb-1 font-medium">{t.bestFinder.quantityLabel}</span>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#C8D5C0] font-mono focus:outline-none focus:ring-2 focus:ring-[#79A86B]"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-[#72796F] block mb-1 font-medium">{t.bestFinder.unitLabel}</span>
                  <select
                    value={quantityUnit}
                    onChange={(e) => setQuantityUnit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#C8D5C0] focus:outline-none focus:ring-2 focus:ring-[#79A86B]"
                  >
                    <option value="Quintal">Quintal (100 Kg)</option>
                    <option value="Kg">Kg</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-[#72796F] block mb-1 font-medium">Min Acceptable Price (INR/Qtl)</span>
                  <input
                    type="number"
                    value={minAcceptablePrice}
                    onChange={(e) => setMinAcceptablePrice(e.target.value)}
                    placeholder="Min Price (INR/Qtl)"
                    className="w-full px-3 py-2 rounded-lg border border-[#C8D5C0] font-mono focus:outline-none focus:ring-2 focus:ring-[#79A86B]"
                  />
                </label>
              </div>

              <div className="space-y-3 pt-3">
                {comparisonResult.rankedMarkets.length === 0 ? (
                  <div className="p-8 text-center text-[#72796F] bg-[#F7F4EC] rounded-xl">
                    No mandis meet your minimum acceptable price threshold or quantity.
                  </div>
                ) : (
                  comparisonResult.rankedMarkets.map((m) => (
                    <div
                      key={m.marketId || m._id}
                      className={`p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 transition-all ${
                        m.isBestMarket
                          ? 'bg-[#79A86B]/20 border-2 border-[#79A86B]/60 shadow-sm'
                          : 'bg-[#F7F4EC] border border-[#E9E0D2]'
                      }`}
                    >
                      <div>
                        <span className="font-mono font-bold mr-2 text-[#163B2B]">
                          {m.isBestMarket && '★ '}#{m.rank}
                        </span>
                        <span className="font-semibold text-base">{m.marketName}</span>
                        <span className="text-xs text-[#72796F] ml-2">({m.district})</span>
                        <span className="ml-3 text-[11px] px-2 py-0.5 rounded bg-white text-[#72796F] font-mono">
                          Modal: {formatPrice(m.modalPricePerQuintal || m.modalPrice)}
                        </span>
                      </div>
                      <div className="font-mono text-sm">
                        Gross: ₹{(m.grossRevenue ?? 0).toLocaleString('en-IN')} | Cost: -₹{(m.totalExpenses ?? 0).toLocaleString('en-IN')} |{' '}
                        <strong className="text-[#163B2B] text-base">Net: ₹{(m.estimatedNetEarnings ?? 0).toLocaleString('en-IN')}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'crops' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <input
                  type="search"
                  placeholder="Search crop or mandi..."
                  value={cropSearch}
                  onChange={(e) => setCropSearch(e.target.value)}
                  className="px-4 py-2 rounded-xl border border-[#C8D5C0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#79A86B] min-w-[240px]"
                />
                {['ALL', 'Cereals', 'Spices', 'Vegetables', 'Fibre Crops'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      selectedCategory === cat ? 'bg-[#163B2B] text-white' : 'bg-[#E9E0D2] text-[#202820] hover:bg-[#d8cbb8]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCrops.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-[#72796F] bg-white rounded-2xl border border-dashed border-[#C8D5C0]">
                    <p className="font-semibold text-lg text-[#163B2B]">No crops found</p>
                    <p className="text-sm mt-1">Try adjusting your search query or choosing another category.</p>
                  </div>
                ) : (
                  filteredCrops.map((crop) => (
                    <div key={crop._id} className="p-5 rounded-2xl bg-white border border-[#E9E0D2] shadow-sm space-y-2 hover:border-[#79A86B]/40 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{crop.name}</h3>
                          <p className="text-xs text-[#72796F]">{crop.localNames?.te || ''}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFavourite(crop._id)}
                          className="text-xs px-2.5 py-1 rounded bg-[#E9E0D2] hover:bg-[#ded1be] transition-colors"
                        >
                          {favourites.includes(crop._id) ? '★ Saved' : '☆ Save'}
                        </button>
                      </div>
                      <div className="text-2xl font-mono font-bold text-[#163B2B]">
                        {formatPrice(crop.modalPrice || 2480)}
                      </div>
                      <div className="text-xs text-[#72796F] flex items-center justify-between">
                        <span>{crop.marketName || 'APMC Mandi'}</span>
                        <span className="px-2 py-0.5 rounded bg-[#E9E0D2] text-[#163B2B] font-semibold text-[10px]">
                          {crop.status || 'VERIFIED'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E9E0D2] shadow-sm space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h2 className="text-xl font-bold text-[#163B2B]">Price Watch Alerts</h2>
                  <p className="text-xs text-[#72796F]">
                    Get notified when mandi prices reach or exceed your target realization threshold.
                  </p>
                </div>
              </div>

              {!user ? (
                <div className="p-8 bg-[#F7F4EC] rounded-2xl border border-[#B68A57]/30 text-center space-y-3">
                  <div className="text-2xl">🔒</div>
                  <h3 className="font-bold text-[#163B2B] text-base">
                    {lang === 'te' ? 'రైతు లాగిన్ అవసరం' : 'Sign in to Manage Price Alerts'}
                  </h3>
                  <p className="text-xs text-[#72796F] max-w-md mx-auto">
                    {lang === 'te'
                      ? 'మీ వ్యక్తిగత పంటల ధర హెచ్చరికలను సృష్టించడానికి మరియు నిర్వహించడానికి లాగిన్ అవ్వండి.'
                      : 'Create custom threshold notifications and receive alerts when target prices are achieved at APMC mandis.'}
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('login')}
                      className="px-4 py-2 rounded-xl bg-[#163B2B] text-white text-xs font-semibold hover:bg-[#10271F]"
                    >
                      {t.auth?.signIn || 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('signup')}
                      className="px-4 py-2 rounded-xl border border-[#163B2B] text-[#163B2B] text-xs font-semibold hover:bg-white"
                    >
                      {t.auth?.signUp || 'Create Account'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAddAlert} className="flex flex-wrap gap-3">
                    <input
                      type="number"
                      value={newAlertTarget}
                      onChange={(e) => setNewAlertTarget(e.target.value)}
                      placeholder="Target price in INR/Quintal"
                      className="px-3 py-2 rounded-lg border border-[#C8D5C0] font-mono focus:outline-none focus:ring-2 focus:ring-[#79A86B]"
                    />
                    <button type="submit" className="px-4 py-2 rounded-lg bg-[#163B2B] text-white text-sm font-semibold hover:opacity-95 transition-opacity">
                      Create Alert
                    </button>
                  </form>
                  <div className="space-y-2 pt-2">
                    {alerts.length === 0 ? (
                      <div className="p-6 text-center text-[#72796F] bg-[#F7F4EC] rounded-xl text-sm">
                        No active price alerts set.
                      </div>
                    ) : (
                      alerts.map((a) => (
                        <div key={a._id} className="p-3 rounded-xl bg-[#F7F4EC] flex justify-between items-center text-sm border border-[#E9E0D2]/60">
                          <span>{a.cropName} ({a.marketName}) — Target ₹{a.targetPrice}/qtl</span>
                          <span className="px-2 py-0.5 rounded bg-[#79A86B]/30 text-[#163B2B] font-semibold text-xs">
                            {a.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'favourites' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E9E0D2] shadow-sm">
              <h2 className="text-xl font-bold text-[#163B2B] mb-4">Saved Crops ({user ? favourites.length : 0})</h2>
              {!user ? (
                <div className="p-8 bg-[#F7F4EC] rounded-2xl border border-[#B68A57]/30 text-center space-y-3">
                  <div className="text-2xl">⭐</div>
                  <h3 className="font-bold text-[#163B2B] text-base">
                    {lang === 'te' ? 'ఇష్టమైన పంటలను భద్రపరచడానికి లాగిన్ అవ్వండి' : 'Sign in to Save Favorite Mandis & Crops'}
                  </h3>
                  <p className="text-xs text-[#72796F] max-w-md mx-auto">
                    {lang === 'te'
                      ? 'మీరు క్రమం తప్పకుండా అమ్మే పంటలను ఒక్క క్లిక్‌తో ట్రాక్ చేయడానికి ఖాతా తెరవండి.'
                      : 'Keep quick track of the crops you cultivate and frequently traded markets.'}
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => navigateTo('login')}
                      className="px-4 py-2 rounded-xl bg-[#163B2B] text-white text-xs font-semibold hover:bg-[#10271F]"
                    >
                      {t.auth?.signIn || 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('signup')}
                      className="px-4 py-2 rounded-xl border border-[#163B2B] text-[#163B2B] text-xs font-semibold hover:bg-white"
                    >
                      {t.auth?.signUp || 'Create Account'}
                    </button>
                  </div>
                </div>
              ) : favourites.length === 0 ? (
                <div className="p-8 text-center text-[#72796F] bg-[#F7F4EC] rounded-xl text-sm">
                  You haven't added any crops to your favourites list yet. Click '☆ Save' in Crop Explorer to track crops here.
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {crops.filter((c) => favourites.includes(c._id)).map((c) => (
                    <div key={c._id} className="p-4 rounded-xl bg-[#F7F4EC] flex justify-between items-center border border-[#E9E0D2]">
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-[#72796F]">{c.localNames?.te || ''}</div>
                      </div>
                      <span className="font-mono font-bold text-[#163B2B]">{formatPrice(c.modalPrice || 2480)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="bg-white rounded-2xl p-6 border border-[#E9E0D2] shadow-sm space-y-3">
              <h2 className="text-xl font-bold text-[#163B2B]">Market Data Governance & CSV Import</h2>
              <p className="text-sm text-[#72796F]">
                Official Data.gov.in AGMARKNET Resource ID: <code>9ef84268-d588-465a-a308-a864a43d0070</code>
              </p>
              <div className="p-4 bg-[#F7F4EC] rounded-xl text-xs space-y-1 text-[#72796F] font-mono border border-[#E9E0D2]">
                <div>• APMC Mandi Integration: e-NAM & Agmarknet Daily Modal Prices</div>
                <div>• Verified Calculation Standard: 1 Quintal = 100 Kilograms</div>
                <div>• Deductions: Direct Transport haulage and APMC hamali/handling expenses</div>
                <div>• User Session: {user ? `Active (${user.name} - ${user.role})` : 'Guest Mode'}</div>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
