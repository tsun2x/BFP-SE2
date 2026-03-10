import dotenv from 'dotenv';
import { supabase } from '../supabaseClient.js';

dotenv.config();

const idNumber = process.argv[2];
if (!idNumber) {
  console.error('Usage: node scripts/inspectUser.js <ID_NUMBER>');
  process.exit(1);
}

async function main() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, id_number, first_name, last_name, phone_number, role, assigned_station_id, password')
      .eq('id_number', idNumber)
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('No user found for', idNumber);
      process.exit(0);
    }

    const user = data[0];
    console.log('User record:');
    console.log(JSON.stringify(user, null, 2));
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
