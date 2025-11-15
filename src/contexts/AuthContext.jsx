import { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      db.users.get(parseInt(storedUserId)).then((userData) => {
        if (userData) {
          setUser(userData);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const userData = await db.users.where('email').equals(email).first();
    if (userData && userData.password === password) {
      setUser(userData);
      localStorage.setItem('userId', userData.id.toString());
      return { success: true };
    }
    return { success: false, error: 'Email ou senha incorretos' };
  };

  const register = async (name, email, password) => {
    const existingUser = await db.users.where('email').equals(email).first();
    if (existingUser) {
      return { success: false, error: 'Email já cadastrado' };
    }
    const id = await db.users.add({
      name,
      email,
      password,
      createdAt: new Date(),
    });
    const userData = await db.users.get(id);
    setUser(userData);
    localStorage.setItem('userId', id.toString());
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

