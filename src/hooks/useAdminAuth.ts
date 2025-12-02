import { useState, useEffect } from 'react';
import { firebase } from '../lib/firebase';
import { AdminSession } from '../types/admin';

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  session: AdminSession | null;
  error: string | null;
}

export function useAdminAuth(username?: string) {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    isLoading: true,
    session: null,
    error: null,
  });

  useEffect(() => {
    checkAdminStatus();
  }, [username]);

  const checkAdminStatus = async () => {
    if (!username) {
      setState({
        isAdmin: false,
        isLoading: false,
        session: null,
        error: null,
      });
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Check if user has admin role
      const userRole = await firebase.getUserRole(username);

      if (userRole === 'admin') {
        // Check if session is still valid
        const session = getAdminSession();

        if (session && session.expiresAt > Date.now()) {
          setState({
            isAdmin: true,
            isLoading: false,
            session,
            error: null,
          });
        } else {
          // Create new session
          const newSession = await createAdminSession(username);
          setState({
            isAdmin: true,
            isLoading: false,
            session: newSession,
            error: null,
          });
        }
      } else {
        setState({
          isAdmin: false,
          isLoading: false,
          session: null,
          error: null,
        });
      }
    } catch (error) {
      setState({
        isAdmin: false,
        isLoading: false,
        session: null,
        error: (error as Error).message,
      });
    }
  };

  const createAdminSession = async (username: string): Promise<AdminSession> => {
    const session: AdminSession = {
      uid: username,
      username,
      role: 'admin',
      loginTime: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    };

    // Store session in localStorage
    localStorage.setItem('adminSession', JSON.stringify(session));

    // Log admin login to audit trail
    await firebase.logAdminAction({
      adminId: username,
      adminUsername: username,
      action: 'admin_login',
      targetType: 'system',
      targetId: 'admin_dashboard',
      details: {
        loginTime: session.loginTime,
      },
    });

    return session;
  };

  const getAdminSession = (): AdminSession | null => {
    const sessionStr = localStorage.getItem('adminSession');
    if (!sessionStr) return null;

    try {
      const session = JSON.parse(sessionStr) as AdminSession;
      return session;
    } catch {
      return null;
    }
  };

  const logout = async () => {
    if (state.session) {
      // Log admin logout
      await firebase.logAdminAction({
        adminId: state.session.username,
        adminUsername: state.session.username,
        action: 'admin_logout',
        targetType: 'system',
        targetId: 'admin_dashboard',
        details: {
          logoutTime: Date.now(),
          sessionDuration: Date.now() - state.session.loginTime,
        },
      });
    }

    // Clear session
    localStorage.removeItem('adminSession');
    setState({
      isAdmin: false,
      isLoading: false,
      session: null,
      error: null,
    });
  };

  const refreshSession = async () => {
    await checkAdminStatus();
  };

  return {
    ...state,
    logout,
    refreshSession,
  };
}
