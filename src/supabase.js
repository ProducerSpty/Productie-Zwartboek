import { createClient } from '@supabase/supabase-js'

// Values can be overridden with Vercel / .env variables.
// The publishable (anon) key is designed to be public, but see README about RLS.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://hwbzthxnodnorjdnribt.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_uqYxo5YJqNn49C6WABH1gA_yp3IulM7'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TABLE = 'crm_data'

// Load every key in one round trip -> { key: data }
export async function loadAll() {
  const { data, error } = await supabase.from(TABLE).select('key, data')
  if (error) throw error
  const out = {}
  for (const row of data || []) out[row.key] = row.data
  return out
}

// Save one named blob
export async function saveKey(key, data) {
  const { error } = await supabase.from(TABLE).upsert({ key, data }, { onConflict: 'key' })
  if (error) throw error
}
