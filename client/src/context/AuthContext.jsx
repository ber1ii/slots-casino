import { createContext, useState, useContext, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);

    if(!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if(token) {
            authAPI
                .getMe()
                .then((res) => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const res = await authAPI.login(email, password);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
    };

    const register = async (username, email, password) => {
        const res = await authAPI.register(username, email, password);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    }

    const updateUser = (updates) => {
        setUser((prev) => ({ ...prev, ...updates }));
    };

    return (
        <AuthContext.Provider
            value={{ user, login, register, logout, updateUser, loading }}
        >
            {children}
        </AuthContext.Provider>
    );
};