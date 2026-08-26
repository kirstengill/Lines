import fetch from 'node-fetch';

async function checkSchema() {
  const url = 'https://brtvyputtflgvbzbvamm.supabase.co/rest/v1/';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydHZ5cHV0dFZsZ3ZiemJ2YW1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NDc0OTgsImV4cCI6MjEwMzMyMzQ5OH0.rSPuWILzCyD_lzdpDBYjIrvg-ms1NlbRId2wq7HzoBo';
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });
  const json: any = await res.json();
  console.log('Tables:', Object.keys(json.definitions || {}));
  for (const table of Object.keys(json.definitions || {})) {
    console.log(`Table ${table} properties:`, Object.keys(json.definitions[table]?.properties || {}));
  }
}
checkSchema();
