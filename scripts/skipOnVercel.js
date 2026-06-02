#!/usr/bin/env node
// Exits with code 0 on Vercel so the prebuild step is skipped cleanly.
// The actual prebuild (prewarmWeeklyReportCache) relies on local JSON files
// that are gitignored and not available in CI/Vercel build environments.
if (process.env.VERCEL) {
  console.log('Vercel environment detected – skipping prebuild cache warm-up.');
  process.exit(0);
}
