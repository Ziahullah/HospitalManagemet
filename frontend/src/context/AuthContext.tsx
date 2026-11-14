import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, clearTokens, saveTokens } from '../services/api';
import type { Tokens, User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (tokens: Tokens) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      setIsLoading(false);
      return;
    }
    authApi.me().then(setUser).catch(clearTokens).finally(() => setIsLoading(false));
  }, []);

  const loginWithTokens = useCallback(async (tokens: Tokens) => {
    saveTokens(tokens);
    setUser(await authApi.me());
  }, []);

  const login = useCallback(
    async (email: string, password: string) => loginWithTokens(await authApi.login(email, password)),
    [loginWithTokens],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithTokens, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
