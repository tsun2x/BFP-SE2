import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { supabase } from '../supabaseClient.js';

dotenv.config();

const [, , idNumber, newPassword] = process.argv;

if (!idNumber || !newPassword) {
  console.error('Usage: node scripts/resetPassword.js <ID_NUMBER> <NEW_PASSWORD>');
  process.exit(1);
}

async function main() {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { data, error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('id_number', idNumber)
      .select('user_id, id_number, role');

    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.log('No user found for', idNumber);
      process.exit(0);
    }

    console.log('Password updated for user:', data[0]);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
