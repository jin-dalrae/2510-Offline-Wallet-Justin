import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function AdminLogin() {
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === '9809') {
            localStorage.setItem('admin_auth', 'true');
            toast.success('Admin access granted');
            navigate('/admin');
        } else {
            toast.error('Invalid password');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Admin Access</h2>
                    <p className="text-slate-500 mt-2">Enter passcode to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Passcode
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-slate-900 outline-none transition text-center text-2xl tracking-widest font-mono"
                            placeholder="••••"
                            maxLength={4}
                            autoFocus
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-900/10"
                    >
                        Unlock Dashboard
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/" className="text-sm text-slate-500 hover:text-slate-900">
                        ← Return to Wallet
                    </Link>
                </div>
            </div>
        </div>
    );
}
