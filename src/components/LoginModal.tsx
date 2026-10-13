import React, { useState, useRef } from 'react';
import { AuthUser, UserRole } from '../types';
import { 
  Sprout, 
  FlaskConical, 
  Wheat, 
  LineChart, 
  SlidersHorizontal, 
  ShieldCheck, 
  User, 
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

interface LoginModalProps {
  onLoginSuccess: (user: AuthUser) => void;
}

interface DefaultAccount {
  username: string;
  role: UserRole;
  name: string;
  description: string;
  icon: React.FC<any>;
}

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  {
    username: 'laboratoriya',
    role: 'laboratoriya',
    name: 'Laboratoriýa Hünärmeni',
    description: 'Drip/Drenaj pH, EC barlaglary we suw analizleri',
    icon: FlaskConical,
  },
  {
    username: 'operator',
    role: 'operator',
    name: 'Operator (Suwaryş)',
    description: 'Gündelik suwaryş mukdary, daşky gurşaw görkezijileri',
    icon: Sprout,
  },
  {
    username: 'agronom',
    role: 'agronom',
    name: 'Baş Agronom',
    description: 'Ösümlik biometriýasy, hasyl we hepdelik kriteriýalar',
    icon: Wheat,
  },
  {
    username: 'monitoring',
    role: 'monitoring',
    name: 'Monitoring & Analitika',
    description: 'Statistika, grafikler, tendensiýalar we umumy gözegçilik',
    icon: LineChart,
  },
  {
    username: 'redaktor',
    role: 'redaktor',
    name: 'Redaktor / Dolandyryjy',
    description: 'Baza ýazgylaryny düzetmek, tassyklamak we arhiw CSV',
    icon: SlidersHorizontal,
  },
];

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState<string>('laboratoriya');
  const [password, setPassword] = useState<string>(''); // Blank by default - user MUST enter password
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  const loginUser = (user: AuthUser) => {
    try {
      localStorage.setItem('parnik_auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    onLoginSuccess(user);
  };

  // When clicking an account card: select the username, clear password and error, and focus password input
  const handleSelectAccount = (acc: DefaultAccount) => {
    setUsername(acc.username);
    setPassword('');
    setError(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanPassword) {
      setError('Açar sözi (parol) boş bolup bilmeýär! Parolyňyzy giriziň.');
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. First try server-side strict authentication
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password: cleanPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'OK' && data.user) {
          loginUser(data.user);
          return;
        }
      } else if (res.status === 401 || res.status === 400) {
        const data = await res.json().catch(() => null);
        setError(data?.message || 'Açar sözi (parol) nädogry! Dogry paroly giriziň.');
        setIsSubmitting(false);
        return;
      }
      throw new Error('Server response not OK');
    } catch (err: any) {
      console.warn('Serwer bilen aragatnaşyk ýagdaýy barlanýar:', err);

      // Client-side fallback check if offline or local server connection timed out
      const matched = DEFAULT_ACCOUNTS.find(
        (a) => a.username.toLowerCase() === cleanUsername
      );

      const savedCustomPass = localStorage.getItem(`parnik_user_pass_${cleanUsername}`);
      const isPasswordValid = (savedCustomPass && cleanPassword === savedCustomPass) || cleanPassword === '123456';

      if (matched && isPasswordValid) {
        const fallbackUser: AuthUser = {
          id: `usr_${matched.username}`,
          username: matched.username,
          name: matched.name,
          role: matched.role,
        };
        loginUser(fallbackUser);
        return;
      }

      setError('Serwer bilen aragatnaşyk ýok ýa-da parol nädogry! Parolyňyzy barlap gaýtadan synanyşyň.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = DEFAULT_ACCOUNTS.find((a) => a.username === username);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white p-6 relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center text-emerald-200 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">PARNIK BELENT AGRO</h1>
              <p className="text-xs text-emerald-200">Goragly Hasabat & Dolandyryş Ulgamyna Giriş</p>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed mt-2">
            Her bölümiň paneline diňe degişli açar sözi (parol) girizilende girişe rugsat berilýär.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Step 1: Select Account */}
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <User className="w-4 h-4 text-emerald-600" />
              1. Hasabyňyzy (Roluňyzy) Saýlaň:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEFAULT_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isSelected = username === acc.username;
                return (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className={`flex items-start text-left p-3 rounded-xl border transition-all text-xs group cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50/80 text-emerald-950 font-medium shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg border mr-2.5 shrink-0 transition ${
                        isSelected
                          ? 'bg-emerald-600 border-emerald-700 text-white'
                          : 'bg-white border-slate-200 text-slate-600 group-hover:text-emerald-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold flex items-center justify-between">
                        <span className="truncate">{acc.name}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {acc.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                2. Açar Sözüni (Parol) Ýazyň:
              </label>
              {selectedAccount && (
                <span className="text-[11px] text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                  {selectedAccount.name}
                </span>
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ulanyjy Ady (Login):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="laboratoriya, agronom, operator..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Açar Sözi (Parol):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={`${selectedAccount?.name || 'Ulanyjy'} üçin paroly ýazyň...`}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Gizle' : 'Görkez'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Parol barlanýar...' : 'Ulgama Giriş Et'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>* Deslapky standart parol: <strong className="font-mono text-slate-700">123456</strong></span>
              <span className="text-emerald-700 font-medium">Paneliň içinden paroly çalyşyp bilersiňiz</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
