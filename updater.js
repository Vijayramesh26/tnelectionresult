const fs = require('fs');
const https = require('https');

const DATA_URL = 'https://results.eci.gov.in/ResultAcGenMay2026/election-json-S22-live.json';
const OUTPUT_FILE = './data.js';
const INTERVAL = 30000; // 30 seconds

const { execSync } = require('child_process');

function fetchData() {
    console.log(`[${new Date().toLocaleTimeString()}] Fetching live data...`);
    
    let body = '';
    try {
        body = execSync(`curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" "${DATA_URL}"`).toString();
        
        // Validate JSON
        JSON.parse(body);
        console.log(`[${new Date().toLocaleTimeString()}] Successfully fetched from ECI`);
    } catch (e) {
        console.error('ECI API blocked or failed. Using local fallback...');
        if (fs.existsSync('./election_full.json')) {
            body = fs.readFileSync('./election_full.json', 'utf8');
        } else {
            console.error('Local fallback file not found.');
            return;
        }
    }

    try {
        const content = `const ELECTION_DATA = ${body};`;
        fs.writeFileSync(OUTPUT_FILE, content);
        console.log(`[${new Date().toLocaleTimeString()}] Successfully updated data.js`);
    } catch (e) {
        console.error('Error writing to data.js:', e.message);
    }
}

// Initial fetch
fetchData();

// Set interval
setInterval(fetchData, INTERVAL);

console.log(`Updater started. Polling ECI every ${INTERVAL/1000}s...`);
console.log(`Make sure to keep this running and refresh your browser dashboard.`);
