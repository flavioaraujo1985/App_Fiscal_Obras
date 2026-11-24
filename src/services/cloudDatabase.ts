import { supabase } from './supabase';

const RECORD_ID = 'principal';

export const cloudDatabase = {
  async load() {
    const { data, error } = await supabase
      .from('fiscal_database')
      .select('payload')
      .eq('id', RECORD_ID)
      .single();

    if (error) {
      throw error;
    }

    return data?.payload ?? null;
  },

  async save(payload: unknown) {
    const { error } = await supabase
      .from('fiscal_database')
      .update({
        payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', RECORD_ID);

    if (error) {
      throw error;
    }
  },
};
