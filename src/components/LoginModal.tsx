import React, { useState } from 'react';
import { UserCircle, Building, ArrowLeft, ArrowRight } from 'lucide-react';
import { signInWithGoogle, registerWithEmail, loginWithEmail } from '../lib/firebase';
import { toast } from 'react-hot-toast';

export function LoginModal({ onClose, onAdminLogin, onUserLogin }: { onClose: () => void, onAdminLogin: (adminData: any) => void, onUserLogin: (user: any) => void }) {
  const [flow, setFlow] = useState<'select' | 'user-auth' | 'admin-auth'>('select');
  const [authType, setAuthType] = useState<'login' | 'register'>('login');

  // User states
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Admin states
  const [adminName, setAdminName] = useState('');
  const [adminDept, setAdminDept] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleGoogle = async () => {
    try {
      const user = await signInWithGoogle();
      onUserLogin(user);
    } catch (err) {
      toast.error('Google sign in failed');
    }
  };

  const handleUserEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please fill all fields');
    try {
      if (authType === 'login') {
        const user = await loginWithEmail(email, password);
        onUserLogin(user);
      } else {
        if (!userName) return toast.error('Please provide a name');
        const user = await registerWithEmail(email, password, userName);
        onUserLogin({ ...user, name: userName });
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/invalid-credential' || (err.message && err.message.includes('INVALID_LOGIN_CREDENTIALS'))) {
        toast.error('Invalid email or password. If you are new, please register.');
      } else {
        toast.error(err.message || 'Authentication failed');
      }
    }
  };

  const handleAdminEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail || !adminPassword) return toast.error('Please fill all fields');
    try {
      if (authType === 'login') {
        const user = await loginWithEmail(adminEmail, adminPassword);
        onAdminLogin({ ...user, email: adminEmail, name: user.displayName || 'Admin', department: 'Unknown' });
      } else {
        if (!adminName || !adminDept) return toast.error('Please fill all admin details');
        const user = await registerWithEmail(adminEmail, adminPassword, adminName);
        onAdminLogin({ ...user, email: adminEmail, name: adminName, department: adminDept });
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-login-credentials' || err.code === 'auth/invalid-credential' || (err.message && err.message.includes('INVALID_LOGIN_CREDENTIALS'))) {
        toast.error('Invalid admin credentials. Please ensure you are registered.');
      } else {
        toast.error(err.message || 'Authentication failed');
      }
    }
  };

  if (flow === 'user-auth') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-8" onClick={e => e.stopPropagation()}>
          <button onClick={() => setFlow('select')} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm font-bold transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <UserCircle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Citizen Portal</h2>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
            <button
              onClick={() => setAuthType('login')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authType === 'login' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthType('register')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authType === 'register' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleUserEmailAuth} className="space-y-4 mb-6">
            {authType === 'register' && (
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="e.g. Aman Verma" />
              </div>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="citizen@example.com" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 dark:text-white transition-colors" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex justify-center">
              {authType === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
          </div>

          <button onClick={handleGoogle} type="button" className="w-full py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all cursor-pointer flex justify-center items-center gap-2">
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (flow === 'admin-auth') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden p-8" onClick={e => e.stopPropagation()}>
          <button onClick={() => setFlow('select')} className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm font-bold transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Building className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Municipal Admin</h2>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
            <button
              onClick={() => setAuthType('login')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authType === 'login' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthType('register')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${authType === 'register' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAdminEmailAuth} className="space-y-4">
            {authType === 'register' && (
              <>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Full Name</label>
                  <input type="text" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 dark:text-white transition-colors" placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Department</label>
                  <select value={adminDept} onChange={e => setAdminDept(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 dark:text-white transition-colors appearance-none">
                    <option value="" disabled>Select Department</option>
                    <option value="PWD Delhi">PWD Delhi</option>
                    <option value="Delhi Jal Board">Delhi Jal Board</option>
                    <option value="NDMC Utilities">NDMC Utilities</option>
                    <option value="Sanitation & Waste Management">Sanitation & Waste Management</option>
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Gov Email</label>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 dark:text-white transition-colors" placeholder="admin@newdelhi.gov.in" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Password</label>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 dark:text-white transition-colors" placeholder="••••••••" />
            </div>
            
            <button type="submit" className="w-full py-3 mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex justify-center">
              {authType === 'login' ? 'Log In' : 'Register Admin'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col md:flex-row" onClick={e => e.stopPropagation()}>
        
        {/* Citizen Portal */}
        <div className="flex-1 p-8 md:p-10 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => setFlow('user-auth')}>
          <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-6 border-4 border-blue-100 dark:border-blue-800/50 shadow-sm group-hover:scale-105 transition-transform">
            <UserCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Citizen Portal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-8 flex-1">
            Join your neighbors in reporting issues, verifying hazards, and earning civic XP.
          </p>
          <div className="w-full py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2">
            Continue as Citizen <ArrowRight className="h-4 w-4" />
          </div>
        </div>

        {/* Municipal Admin Portal */}
        <div className="flex-1 p-8 md:p-10 flex flex-col items-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => setFlow('admin-auth')}>
          <div className="h-16 w-16 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-6 border-4 border-purple-100 dark:border-purple-800/50 shadow-sm group-hover:scale-105 transition-transform">
            <Building className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">Municipal Admin</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed mb-8 flex-1">
            Authorized personnel only. Dispatch crews, resolve issues, and view analytic predictions.
          </p>
          <div className="w-full py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2">
            Access Dispatch Console <ArrowRight className="h-4 w-4" />
          </div>
        </div>
        
      </div>
    </div>
  );
}
