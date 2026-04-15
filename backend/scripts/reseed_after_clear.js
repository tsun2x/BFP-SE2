import { supabase } from "../supabaseClient.js";
import bcrypt from "bcrypt";

// Attempt an upsert and automatically retry if Supabase reports missing
// columns in the schema cache (PGRST204). Removes the missing keys
// from the records and retries so the reseed can succeed on trimmed schemas.
async function safeUpsert(table, records, onConflict) {
  let currentRecords = (records || []).map((r) => ({ ...r }));
  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .upsert(currentRecords, { onConflict });

    if (!error) {
      return { success: true, data, finalRecords: currentRecords };
    }

    // Handle Supabase schema-cache missing column error (PGRST204)
    if (String(error?.code) === "PGRST204" && error?.message) {
      const missing = [];
      const regex = /Could not find the '([^']+)' column/g;
      let m;
      while ((m = regex.exec(error.message)) !== null) {
        missing.push(m[1]);
      }

      if (!missing.length) {
        return { success: false, error };
      }

      // Remove missing keys from records and retry
      currentRecords = currentRecords.map((r) => {
        const copy = { ...r };
        missing.forEach((k) => delete copy[k]);
        return copy;
      });

      console.log(
        `[Reseed] Removed missing columns and retrying upsert on ${table}: ${missing.join(", ")}`,
      );
      continue;
    }

    return { success: false, error };
  }

  return { success: false, error: new Error("safeUpsert: retries exhausted") };
}

async function reseedAfterClear() {
  try {
    console.log("Starting reseed after database clear...");

    // 1. Insert fire_stations (if not already present)
    const { data: existingStations, error: checkError } = await supabase
      .from("fire_stations")
      .select("station_id")
      .limit(1);

    if (checkError) {
      console.error("Error checking fire_stations:", checkError);
    } else if (!existingStations || existingStations.length === 0) {
      console.log("No fire_stations found. Seeding...");
      const { error: stationError } = await supabase
        .from("fire_stations")
        .insert([
          {
            station_id: 1,
            station_name: "Zamboanga Central Fire Station",
            latitude: 6.9271,
            longitude: -122.0789,
            station_type: "main",
            contact_number: "+63917-555-0101",
            address: "Zamboanga City, Philippines",
          },
          {
            station_id: 2,
            station_name: "Zamboanga Downtown Station",
            latitude: 6.9234,
            longitude: -122.0732,
            station_type: "substation",
            contact_number: "+63917-555-0102",
            address: "Downtown, Zamboanga City",
          },
        ]);
      if (stationError)
        console.error("Error seeding fire_stations:", stationError);
      else console.log("✓ fire_stations seeded");
    } else {
      console.log("✓ fire_stations already exist");
    }

    // 2. Reseed station_current_status with readiness_status = 'READY' and is_online = true
    console.log("Reseeding station_current_status...");
    const { data: stations } = await supabase
      .from("fire_stations")
      .select("station_id");

    if (stations && stations.length > 0) {
      const statusRecords = stations.map((s) => ({
        station_id: s.station_id,
        readiness_status: "READY",
        readiness_percentage: 100,
        active_incident_count: 0,
        is_online: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: statusError } = await supabase
        .from("station_current_status")
        .upsert(statusRecords, { onConflict: "station_id" });
      if (statusError)
        console.error("Error seeding station_current_status:", statusError);
      else
        console.log(
          `✓ station_current_status seeded for ${stations.length} stations`,
        );
    }

    // 3. Reseed a test user (optional)
    console.log("Reseeding test users (with predictable passwords)...");
    // Use a known test password so you can login easily after reseed.
    const TEST_PASSWORD = "testpass123";
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const usersToInsert = [
      {
        // Let the DB assign numeric user_id (auto-increment). Use id_number as unique key.
        email: "admin@bfp.test",
        id_number: "ADM-001",
        role: "admin",
        full_name: "Test Admin",
        first_name: "Test",
        last_name: "Admin",
        phone_number: "+63917-000-0001",
        password: hashedPassword,
        // `is_active` may not exist in trimmed schemas; safeUpsert will remove it if missing
        is_active: true,
      },
      {
        email: "officer@station1.test",
        id_number: "OFF-001",
        role: "officer",
        assigned_station_id: 1,
        full_name: "Test Officer Station 1",
        first_name: "Test",
        last_name: "Officer",
        phone_number: "+63917-000-0101",
        password: hashedPassword,
        is_active: true,
      },
    ];

    // Upsert by unique `id_number` so we avoid inserting string user_id into int PK
    const userResult = await safeUpsert("users", usersToInsert, "id_number");

    if (!userResult.success) {
      console.error("Error seeding users:", userResult.error);
    } else {
      const finalRecords = userResult.finalRecords || usersToInsert;
      // If the password column was removed during retries, warn the operator
      const origHadPassword = usersToInsert.some(
        (r) => typeof r.password !== "undefined",
      );
      const finalHasPassword = finalRecords.some(
        (r) => typeof r.password !== "undefined",
      );
      if (origHadPassword && !finalHasPassword) {
        console.warn(
          "Users were inserted but the `password` column was missing from the schema — accounts were created without passwords.",
        );
        console.warn(
          "If you want logins, add a `password` column to `users` or create accounts via the app sign-up flow.",
        );
      }

      console.log(
        `✓ test users seeded/verified — login with email/password: admin@bfp.test/${TEST_PASSWORD} or officer@station1.test/${TEST_PASSWORD}`,
      );
    }

    console.log("✓ Reseed complete. Stations should now appear online.");
  } catch (error) {
    console.error("Reseed failed:", error);
  }
}

reseedAfterClear();
