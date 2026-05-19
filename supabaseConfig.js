import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zdtqiwvxhudmhxbfowbt.supabase.co'
const supabaseKey = 'sb_publishable_muGpzbhl7vVWOO3mXeDQzw_9oIznt-g'

export const supabase = createClient(supabaseUrl, supabaseKey)