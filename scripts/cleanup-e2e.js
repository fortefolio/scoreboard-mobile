const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

const TEST_EMAIL = process.env.TEST_EMAIL || "gmail@chucknorris.com";
const TEST_PASSWORD = process.env.TEST_PASSWORD || "123qwe";

async function main() {
  console.log("=== ScoreBoard E2E Post-Test Cleanup ===");
  console.log(`Connecting to Supabase at: ${SUPABASE_URL}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // Sign in as test user to satisfy RLS deletion policies
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (authError || !authData.user) {
    console.error("Failed to sign in as test user for cleanup:", authError?.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Signed in as: ${TEST_EMAIL} (${userId})`);

  // 1. Delete test matches
  const { data: matches, error: fetchMatchesErr } = await supabase
    .from("matches")
    .select("id, participants, sport_type")
    .eq("organizer_id", userId);

  if (!fetchMatchesErr && matches) {
    const testMatches = matches.filter((m) => {
      const p1 = (m.participants?.[0]?.name || "").toLowerCase();
      const p2 = (m.participants?.[1]?.name || "").toLowerCase();
      return (
        p1.includes("e2e") ||
        p2.includes("e2e") ||
        p1.includes("benfica") ||
        p2.includes("porto")
      );
    });

    if (testMatches.length > 0) {
      const matchIds = testMatches.map((m) => m.id);
      console.log(`Found ${testMatches.length} test match(es) to clean up:`, matchIds);
      const { error: delMatchesErr } = await supabase
        .from("matches")
        .delete()
        .in("id", matchIds);

      if (delMatchesErr) {
        console.error("Error deleting test matches:", delMatchesErr.message);
      } else {
        console.log("Successfully cleaned up test matches.");
      }
    } else {
      console.log("No lingering test matches found.");
    }
  }

  // 2. Delete test tournaments
  const { data: tournaments, error: fetchTournamentsErr } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("organizer_id", userId);

  if (!fetchTournamentsErr && tournaments) {
    const testTournaments = tournaments.filter((t) => {
      const name = (t.name || "").toLowerCase();
      return name.includes("e2e") || name.includes("maestro");
    });

    if (testTournaments.length > 0) {
      const tourIds = testTournaments.map((t) => t.id);
      console.log(`Found ${testTournaments.length} test tournament(s) to clean up:`, tourIds);
      const { error: delTourErr } = await supabase
        .from("tournaments")
        .delete()
        .in("id", tourIds);

      if (delTourErr) {
        console.error("Error deleting test tournaments:", delTourErr.message);
      } else {
        console.log("Successfully cleaned up test tournaments.");
      }
    } else {
      console.log("No lingering test tournaments found.");
    }
  }

  console.log("=== Cleanup Completed Successfully ===");
}

main().catch((err) => {
  console.error("Unexpected error during cleanup:", err);
  process.exit(1);
});
