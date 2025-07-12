import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../constants/supabase';
import { AuthState, AuthContextType, AuthUser } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  });

  useEffect(() => {
    // Initialize auth state
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email!,
            email_confirmed_at: session.user.email_confirmed_at,
            created_at: session.user.created_at!,
          };
          
          setState({
            user: authUser,
            loading: false,
            initialized: true,
          });
          
          // Store session in AsyncStorage
          await AsyncStorage.setItem('userSession', JSON.stringify(session));
        } else {
          setState({
            user: null,
            loading: false,
            initialized: true,
          });
          
          // Remove session from AsyncStorage
          await AsyncStorage.removeItem('userSession');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const initializeAuth = async () => {
    try {
      // Try to get existing session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          email_confirmed_at: session.user.email_confirmed_at,
          created_at: session.user.created_at!,
        };
        
        setState({
          user: authUser,
          loading: false,
          initialized: true,
        });
      } else {
        setState({
          user: null,
          loading: false,
          initialized: true,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      setState({
        user: null,
        loading: false,
        initialized: true,
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false }));
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      return { error: 'An unexpected error occurred' };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false }));
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      setState(prev => ({ ...prev, loading: false }));
      return { error: 'An unexpected error occurred' };
    }
  };

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('userSession');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      return { error: 'An unexpected error occurred' };
    }
  };

  const value: AuthContextType = {
    user: state.user,
    loading: state.loading,
    initialized: state.initialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 