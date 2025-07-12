import { useState, useEffect } from 'react';
import { supabase } from '../constants/supabase';
import { useAuth } from './useAuth';
import type {
  User,
  UserUpdate,
  Drink,
  DrinkInsert,
  DrinkUpdate,
  Entry,
  EntryInsert,
  EntryUpdate,
  EntryWithDrink,
  DailyStats,
  CaffeineMetabolism,
  ApiResponse,
  ApiListResponse,
} from '../types/database';

// User Profile Hooks
export const useUserProfile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: UserUpdate): Promise<ApiResponse<User>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', authUser.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      setProfile(data);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to update profile' };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [authUser]);

  return { profile, loading, updateProfile, refetch: fetchProfile };
};

// Drinks Hooks
export const useDrinks = () => {
  const { user: authUser } = useAuth();
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDrinks = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('drinks')
        .select('*')
        .or(`user_id.eq.${authUser.id},is_public.eq.true`)
        .order('name');

      if (error) {
        console.error('Error fetching drinks:', error);
        return;
      }

      setDrinks(data || []);
    } catch (error) {
      console.error('Error fetching drinks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDrink = async (drink: DrinkInsert): Promise<ApiResponse<Drink>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('drinks')
        .insert({ ...drink, user_id: authUser.id })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      setDrinks(prev => [...prev, data]);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to add drink' };
    }
  };

  const updateDrink = async (id: string, updates: DrinkUpdate): Promise<ApiResponse<Drink>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('drinks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      setDrinks(prev => prev.map(drink => drink.id === id ? data : drink));
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to update drink' };
    }
  };

  const deleteDrink = async (id: string): Promise<ApiResponse<boolean>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('drinks')
        .delete()
        .eq('id', id)
        .eq('user_id', authUser.id);

      if (error) {
        return { data: null, error: error.message };
      }

      setDrinks(prev => prev.filter(drink => drink.id !== id));
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete drink' };
    }
  };

  useEffect(() => {
    fetchDrinks();
  }, [authUser]);

  return { drinks, loading, addDrink, updateDrink, deleteDrink, refetch: fetchDrinks };
};

// Entries Hooks
export const useEntries = (date?: string) => {
  const { user: authUser } = useAuth();
  const [entries, setEntries] = useState<EntryWithDrink[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      let query = supabase
        .from('entries')
        .select(`
          *,
          drink:drinks(*)
        `)
        .eq('user_id', authUser.id)
        .order('timestamp', { ascending: false });

      if (date) {
        query = query.gte('timestamp', `${date}T00:00:00.000Z`)
                    .lt('timestamp', `${date}T23:59:59.999Z`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching entries:', error);
        return;
      }

      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async (entry: EntryInsert): Promise<ApiResponse<Entry>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('entries')
        .insert({ ...entry, user_id: authUser.id })
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Refresh entries after adding
      fetchEntries();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to add entry' };
    }
  };

  const updateEntry = async (id: string, updates: EntryUpdate): Promise<ApiResponse<Entry>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('entries')
        .update(updates)
        .eq('id', id)
        .eq('user_id', authUser.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      // Refresh entries after updating
      fetchEntries();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to update entry' };
    }
  };

  const deleteEntry = async (id: string): Promise<ApiResponse<boolean>> => {
    if (!authUser) return { data: null, error: 'User not authenticated' };

    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .eq('user_id', authUser.id);

      if (error) {
        return { data: null, error: error.message };
      }

      setEntries(prev => prev.filter(entry => entry.id !== id));
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: 'Failed to delete entry' };
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [authUser, date]);

  return { entries, loading, addEntry, updateEntry, deleteEntry, refetch: fetchEntries };
};

// Daily Stats Hook
export const useDailyStats = (date?: string) => {
  const { user: authUser } = useAuth();
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_daily_caffeine_intake', {
        user_uuid: authUser.id,
        target_date: date || new Date().toISOString().split('T')[0],
      });

      if (error) {
        console.error('Error fetching daily stats:', error);
        return;
      }

      setStats(data[0] || null);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [authUser, date]);

  return { stats, loading, refetch: fetchStats };
};

// Caffeine Metabolism Hook
export const useCaffeineMetabolism = (hoursBack: number = 24) => {
  const { user: authUser } = useAuth();
  const [metabolism, setMetabolism] = useState<CaffeineMetabolism[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetabolism = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_caffeine_metabolism', {
        user_uuid: authUser.id,
        hours_back: hoursBack,
      });

      if (error) {
        console.error('Error fetching caffeine metabolism:', error);
        return;
      }

      setMetabolism(data || []);
    } catch (error) {
      console.error('Error fetching caffeine metabolism:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetabolism();
  }, [authUser, hoursBack]);

  return { metabolism, loading, refetch: fetchMetabolism };
};

// Real-time subscriptions
export const useRealtimeEntries = (userId: string) => {
  const [entries, setEntries] = useState<EntryWithDrink[]>([]);

  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('entries')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('Real-time entry change:', payload);
          // Handle real-time updates
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return { entries };
}; 