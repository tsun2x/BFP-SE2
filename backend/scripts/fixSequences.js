import { supabase } from '../supabaseClient.js';

async function fixSequences() {
  try {
    console.log('Fixing auto-increment sequences...');

    // Fix station_readiness sequence
    const { data: readinessResult, error: readinessError } = await supabase
      .rpc('exec_sql', {
        sql: "SELECT setval('station_readiness_readiness_id_seq', (SELECT COALESCE(MAX(readiness_id), 0) + 1 FROM station_readiness))"
      });

    if (readinessError) {
      console.log('Could not use RPC, trying direct SQL approach...');
      // Alternative: fetch max and log it
      const { data: maxData, error: maxError } = await supabase
        .from('station_readiness')
        .select('readiness_id', { count: 'exact' })
        .order('readiness_id', { ascending: false })
        .limit(1);
      
      if (maxData && maxData.length > 0) {
        console.log('Max readiness_id in table:', maxData[0]?.readiness_id);
        console.log('Sequence needs to be reset to:', (maxData[0]?.readiness_id || 0) + 1);
      }
    } else {
      console.log('✓ station_readiness sequence fixed');
    }

    console.log('\nTo manually fix in Supabase SQL Editor, run:');
    console.log("SELECT setval('station_readiness_readiness_id_seq', (SELECT COALESCE(MAX(readiness_id), 0) + 1 FROM station_readiness));");

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixSequences();
