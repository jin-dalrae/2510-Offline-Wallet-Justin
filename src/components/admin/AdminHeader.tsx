import { useAdminAuth } from '../../hooks/useAdminAuth';
import { useWallet } from '../../hooks/useWallet';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const wallet = useWallet();
  const { logout } = useAdminAuth(wallet.accountName || '');
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Admin logged out');
    navigate('/dashboard');
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Admin badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-full text-sm font-bold">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            ADMIN
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Account info */}
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-slate-900">
              {wallet.accountName || 'Admin'}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : ''}
            </p>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-all"
            title="Logout from admin"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
