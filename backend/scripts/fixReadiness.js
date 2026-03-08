import { supabase } from '../supabaseClient.js';

async function fixReadiness() {
  // First, fix the sequence to avoid PK conflicts
  const { data: maxRow } = await supabase
    .from('station_readiness')
    .select('readiness_id')
    .order('readiness_id', { ascending: false })
    .limit(1);

  const maxId = maxRow?.[0]?.readiness_id || 0;
  console.log('Max readiness_id:', maxId);

  // Insert READY records for all substations
  for (const stationId of [2, 3, 4, 5]) {
    const { error } = await supabase
      .from('station_readiness')
      .insert({
        readiness_id: maxId + stationId,
        station_id: stationId,
        status: 'READY',
        readiness_percentage: 100,
      });

    if (error) {
      console.error(`Station ${stationId} error:`, error.message);
    } else {
      console.log(`Station ${stationId} set to READY`);
    }
  }

  // Verify
  const { data: latest } = await supabase
    .from('station_readiness')
    .select('station_id, status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(10);

  console.log('\nLatest readiness records:');
  latest?.forEach(r => console.log(`  Station ${r.station_id}: ${r.status} (${r.submitted_at})`));
}

fixReadiness().catch(console.error);
