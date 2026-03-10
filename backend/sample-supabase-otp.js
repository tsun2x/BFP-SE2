import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase project URL and anon key
const supabase = createClient('https://vcqhpwnhuzaoqfatwang.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcWhwd25odXphb3FmYXR3YW5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjU2ODcsImV4cCI6MjA4ODY0MTY4N30.74ZcsODbQuS3_sZ-mKSKxdlQg5r3vGfk3Z31xOChI40');

// Call this function with the user's email to send an OTP/magic link
async function sendOtp(email) {
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) {
    // Handle error (show message to user)
    console.error(error.message);
  } else {
    // Success (tell user to check their email)
    alert('Check your email for the login link!');
  }
}