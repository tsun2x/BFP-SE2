import { supabase } from '../supabaseClient.js';

async function main() {
  // 1. Widen id_number column via raw SQL
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE public.users ALTER COLUMN id_number TYPE varchar(100);`
  });
  if (e1) {
    console.log('rpc exec_sql not available, trying direct SQL via REST...');
    // Fallback: use supabase SQL editor isn't available from client
    // We'll just shorten the id_number prefix instead
  } else {
    console.log('Column widened OK');
  }

  // 2. Delete duplicate row 17 (same phone as row 19, row 19 has proper format)
  const { error: e2 } = await supabase.from('users').delete().eq('user_id', 17);
  console.log('Delete row 17:', e2 ? e2.message : 'OK');

  // 3. Try to set id_number for rows 20 and 22 (short prefix if column still narrow)
  for (const [uid, identifier] of [[20, 'alvarezjuanitasss@gmail.com'], [22, 'markosumo15@gmail.com']]) {
    // Try long form first
    let { error } = await supabase.from('users').update({ id_number: `CIV_${identifier}` }).eq('user_id', uid);
    if (error && error.message.includes('too long')) {
      // Truncate to fit in 20 chars — use hash-like short id
      const short = identifier.slice(0, 16);
      ({ error } = await supabase.from('users').update({ id_number: `CIV_${short}` }).eq('user_id', uid));
    }
    console.log(`Row ${uid}:`, error ? error.message : 'OK');
  }

  // 4. Verify
  const { data } = await supabase.from('users').select('user_id, email, phone_number, id_number').eq('role', 'end_user');
  console.log('\nAll end_user rows:');
  data.forEach(u => console.log(u.user_id, '|', u.email, '|', u.phone_number, '|', u.id_number));
}

main().catch(console.error);
