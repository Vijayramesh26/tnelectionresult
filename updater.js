const fs = require('fs');
const { execSync } = require('child_process');

// The official ECI Live JSON URL
const DATA_URL = 'https://results.eci.gov.in/ResultAcGenMay2026/election-json-S22-live.json';
const OUTPUT_FILE = './data.js';

function fetchData() {
    console.log(`[${new Date().toLocaleTimeString()}] Starting live fetch...`);
    
    let body = '';
    try {
        // We use curl with a User-Agent to look like a real browser
        body = execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" "${DATA_URL}"`).toString();
        
        // This line checks if the data we got is actually valid JSON
        JSON.parse(body);
        console.log(`[${new Date().toLocaleTimeString()}] Live data received successfully!`);
    } catch (e) {
        console.warn('ECI server is busy or blocking. Using local fallback data...');
        // If the live fetch fails, we use your sample data so the site doesn't break
        if (fs.existsSync('./election_full.json')) {
            body = fs.readFileSync('./election_full.json', 'utf8');
        } else {
            console.error('Critical: No data found (Live or Fallback).');
            process.exit(1);
        }
    }

    try {
        // We wrap the JSON in a JS variable so the browser can read it easily
        const content = `const ELECTION_DATA = ${body};`;
        fs.writeFileSync(OUTPUT_FILE, content);
        console.log(`[${new Date().toLocaleTimeString()}] Dashboard updated!`);
    } catch (e) {
        console.error('Error saving data:', e.message);
        process.exit(1);
    }
}

// Execute once and finish
fetchData();
