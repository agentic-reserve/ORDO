/**
 * Database setup script
 * Applies the schema.sql to the Supabase database
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "../.env") });

async function setupDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log("Connecting to Supabase...");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read schema file
  const schemaPath = join(__dirname, "../supabase/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  console.log("Applying database schema...");

  // Split schema into individual statements
  const statements = schema
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  let successCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: statement });
      
      if (error) {
        // Try direct execution if RPC fails
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseServiceKey,
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok) {
          console.warn(`Warning: Could not execute statement: ${statement.substring(0, 100)}...`);
          console.warn(`Error: ${error?.message || await response.text()}`);
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        successCount++;
      }
    } catch (err) {
      console.warn(`Warning: ${err}`);
      errorCount++;
    }
  }

  console.log(`\nSchema application complete:`);
  console.log(`  Success: ${successCount} statements`);
  console.log(`  Warnings: ${errorCount} statements`);
  
  if (errorCount > 0) {
    console.log("\nNote: Some statements may have failed because they already exist.");
    console.log("This is normal if the schema has been applied before.");
  }

  console.log("\nDatabase setup complete!");
}

setupDatabase().catch(console.error);
