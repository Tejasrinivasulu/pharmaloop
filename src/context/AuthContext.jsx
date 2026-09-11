import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';
const AuthContext = createContext(null);
export function roleHome(role) {
    switch (role) {
        case 'Pharmacy':
            return '/pharmacy';
        case 'Distributor':
            return '/distributor';
        case 'Manufacturer':
            return '/manufacturer';
        case 'Admin':
            return '/admin';
    }
}
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }
        api('/api/auth/me')
            .then((r) => setUser(r.user))
            .catch(() => {
            clearToken();
            setUser(null);
        })
            .finally(() => setLoading(false));
    }, []);
    const login = useCallback(async (email, password, role) => {
        const res = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password, role }),
        });
        setToken(res.token);
        setUser(res.user);
        return res.user;
    }, []);
    const logout = useCallback(() => {
        clearToken();
        setUser(null);
    }, []);
    const value = useMemo(() => ({
        user,
        loading,
        login,
        logout,
        dashboardPath: user ? roleHome(user.role) : '/login',
    }), [user, loading, login, logout]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
