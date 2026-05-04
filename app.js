// State management
let electionData = [];
let partyTotals = {};

// Selectors
const tallyList = document.getElementById('tallyList');
const topPartyCards = document.getElementById('topPartyCards');
const constituencySelect = document.getElementById('constituencySelect');
const constituencyGrid = document.getElementById('constituencyGrid');
const searchInput = document.getElementById('searchInput');
const detailModal = document.getElementById('detailModal');
const modalBody = document.getElementById('modalBody');
const closeModal = document.getElementById('closeModal');
const lastUpdatedEl = document.getElementById('lastUpdated');
const refreshTimerEl = document.getElementById('refreshTimer');

const totalWonEl = document.getElementById('totalWon');
const totalLeadingEl = document.getElementById('totalLeading');
const totalTotalEl = document.getElementById('totalTotal');

let countdown = 30;

const PARTY_MAP = {
    'TVK': { name: 'Tamilaga Vettri Kazhagam - TVK', color: 'var(--color-tvk)' },
    'ADMK': { name: 'All India Anna Dravida Munnetra Kazhagam - ADMK', color: 'var(--color-admk)' },
    'DMK': { name: 'Dravida Munnetra Kazhagam - DMK', color: 'var(--color-dmk)' },
    'PMK': { name: 'Pattali Makkal Katchi - PMK', color: 'var(--color-pmk)' },
    'INC': { name: 'Indian National Congress - INC', color: 'var(--color-inc)' },
    'CPI(M)': { name: 'Communist Party of India (Marxist) - CPI(M)', color: 'var(--color-cpim)' },
    'VCK': { name: 'Viduthalai Chiruthaigal Katchi - VCK', color: 'var(--color-vck)' },
    'CPI': { name: 'Communist Party of India - CPI', color: '#ef4444' },
    'BJP': { name: 'Bharatiya Janata Party - BJP', color: '#f97316' },
    'IUML': { name: 'Indian Union Muslim League - IUML', color: '#10b981' },
    'DMDK': { name: 'Desiya Murpokku Dravida Kazhagam - DMDK', color: '#334155' },
    'AMMKMNKZ': { name: 'Amma Makkal Munnetra Kazagam - AMMK', color: '#911578' }
};

// Initialization
async function init() {
    try {
        const data = ELECTION_DATA;
        const tnData = data.S22;
        if (!tnData) throw new Error("Tamil Nadu data not found");

        electionData = tnData.chartData; 
        
        processData();
        renderTopCards();
        renderTable();
        renderGrid(electionData);
        populateDropdown();

        await renderMap();
        startCountdown();

    } catch (error) {
        console.error("Error loading data:", error);
        tallyList.innerHTML = `<tr><td colspan="4" class="error">Failed to load data.</td></tr>`;
    }
}

function processData() {
    partyTotals = {};
    electionData.forEach(item => {
        const code = item[0];
        const partyInfo = PARTY_MAP[code] || { name: code, color: item[4] };
        const name = partyInfo.name;
        
        if (!partyTotals[name]) {
            partyTotals[name] = { 
                won: 0, 
                leading: 1, 
                total: 1, 
                color: partyInfo.color,
                shortCode: code
            };
        } else {
            partyTotals[name].leading++;
            partyTotals[name].total++;
        }
    });
}

function renderTopCards() {
    const majorParties = ['TVK', 'ADMK', 'DMK', 'PMK', 'INC', 'CPI(M)', 'VCK'];
    
    topPartyCards.innerHTML = majorParties.map(code => {
        const name = PARTY_MAP[code]?.name;
        const info = partyTotals[name] || { total: 0, color: PARTY_MAP[code]?.color || '#cbd5e1' };
        return `
            <div class="party-summary-card" style="background-color: ${info.color}">
                <div class="name">${code}</div>
                <div class="count">${info.total}</div>
            </div>
        `;
    }).join('');
}

function renderTable() {
    const sorted = Object.entries(partyTotals).sort((a, b) => b[1].total - a[1].total);
    
    let sumWon = 0, sumLeading = 0, sumTotal = 0;

    tallyList.innerHTML = sorted.map(([name, info]) => {
        sumWon += info.won;
        sumLeading += info.leading;
        sumTotal += info.total;
        
        return `
            <tr>
                <td class="party-name-cell">${name}</td>
                <td class="won-col">${info.won}</td>
                <td class="leading-col">${info.leading}</td>
                <td class="total-col">${info.total}</td>
            </tr>
        `;
    }).join('');

    totalWonEl.textContent = sumWon;
    totalLeadingEl.textContent = sumLeading;
    totalTotalEl.textContent = sumTotal;
}

function populateDropdown() {
    const sortedConst = Object.entries(TAMIL_NADU_CONSTITUENCIES)
        .sort((a, b) => a[1].localeCompare(b[1]));
        
    constituencySelect.innerHTML = '<option value="">Select Constituency</option>' + 
        sortedConst.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');

    constituencySelect.onchange = (e) => {
        if (e.target.value) showDetails(parseInt(e.target.value));
    };
}

async function renderMap() {
    const container = d3.select('#mapContainer');
    container.html(''); 

    const svg = container.append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 500 600`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

    const tooltip = d3.select('body').append('div')
        .attr('class', 'map-tooltip')
        .style('display', 'none');

    try {
        const geoData = TN_MAP_DATA;
        const projection = d3.geoMercator().fitSize([500, 600], geoData);
        const path = d3.geoPath().projection(projection);

        svg.selectAll('.map-path')
            .data(geoData.features)
            .enter()
            .append('path')
            .attr('class', 'map-path')
            .attr('d', path)
            .attr('fill', d => {
                const acNo = d.properties.AC_NO;
                const result = electionData.find(item => item[2] === acNo);
                if (result) {
                    const code = result[0];
                    return PARTY_MAP[code]?.color || result[4];
                }
                return '#cbd5e1';
            })
            .on('mouseover', (event, d) => {
                const acNo = parseInt(d.properties.AC_NO);
                const result = electionData.find(item => parseInt(item[2]) === acNo);
                const name = TAMIL_NADU_CONSTITUENCIES[acNo] || d.properties.AC_NAME;
                
                tooltip.style('display', 'block')
                    .html(`
                        <div style="font-weight: 800; color: var(--accent-color); font-size: 1rem; margin-bottom: 0.5rem">${name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary)">#${acNo}</div>
                        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1)">
                            <div style="font-size: 0.75rem; color: var(--text-secondary)">LEADING</div>
                            <div style="font-weight: 700; margin-top: 0.25rem">${result ? result[3] : 'Awaiting Data'}</div>
                            <div style="font-weight: 800; color: ${result ? (PARTY_MAP[result[0]]?.color || result[4]) : '#94a3b8'}; margin-top: 0.25rem">
                                ${result ? (PARTY_MAP[result[0]]?.name || result[0]) : '-'}
                            </div>
                        </div>
                    `);
            })
            .on('mousemove', (event) => {
                tooltip.style('left', (event.pageX + 20) + 'px').style('top', (event.pageY - 20) + 'px');
            })
            .on('mouseout', () => tooltip.style('display', 'none'))
            .on('click', (event, d) => showDetails(d.properties.AC_NO));

    } catch (err) {
        console.error("Map error:", err);
    }
}

function renderGrid(data) {
    constituencyGrid.innerHTML = data.map((item, index) => {
        const id = item[2];
        const name = TAMIL_NADU_CONSTITUENCIES[id] || `Constituency ${id}`;
        const code = item[0];
        const color = PARTY_MAP[code]?.color || item[4];
        // Add staggered delay
        const delay = (index % 12) * 0.05;
        return `
            <div class="const-card" onclick="showDetails(${id})" style="animation-delay: ${delay}s">
                <div class="const-name">${name}</div>
                <div class="candidate-party">
                    <span class="candidate-name">${item[3]}</span>
                    <span class="party-label" style="color: ${color}">${code}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Search
searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = electionData.filter(item => {
        const name = (TAMIL_NADU_CONSTITUENCIES[item[2]] || "").toLowerCase();
        return name.includes(term) || item[2].toString().includes(term);
    });
    renderGrid(filtered);
});

// Modal
window.showDetails = (id) => {
    const item = electionData.find(i => parseInt(i[2]) === parseInt(id));
    if (!item) return;
    const name = TAMIL_NADU_CONSTITUENCIES[id] || `Constituency ${id}`;
    const code = item[0];
    const color = PARTY_MAP[code]?.color || item[4];
    
    modalBody.innerHTML = `
        <h2 style="margin-bottom: 2rem; background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${name}</h2>
        <div style="display: flex; flex-direction: column; gap: 2rem">
            <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--glass-border)">
                <div style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.5rem; font-weight: 600; letter-spacing: 0.1em">CANDIDATE</div>
                <div style="font-size: 1.75rem; font-weight: 800; color: #fff">${item[3]}</div>
            </div>
            <div style="background: rgba(255,255,255,0.03); padding: 1.5rem; border-radius: 20px; border: 1px solid var(--glass-border)">
                <div style="color: var(--text-secondary); font-size: 0.8rem; margin-bottom: 0.5rem; font-weight: 600; letter-spacing: 0.1em">PARTY</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: ${color}">${PARTY_MAP[code]?.name || code}</div>
            </div>
            <div style="background: linear-gradient(45deg, #10b981, #059669); padding: 1.5rem; border-radius: 20px; text-align: center; font-weight: 900; color: #fff; box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.3)">
                STATUS: LEADING
            </div>
        </div>
    `;
    detailModal.style.display = 'flex';
};

closeModal.onclick = () => detailModal.style.display = 'none';
window.onclick = (e) => { if (e.target === detailModal) detailModal.style.display = 'none' };

function startCountdown() {
    lastUpdatedEl.textContent = `Last Updated at ${new Date().toLocaleTimeString()} on ${new Date().toLocaleDateString()}`;
    setInterval(() => {
        countdown--;
        if (refreshTimerEl) refreshTimerEl.textContent = `Refreshing in ${countdown}s`;
        if (countdown <= 0) location.reload();
    }, 1000);
}

// Wait for the dynamically loaded data to be ready
function startApp() {
    if (typeof ELECTION_DATA !== 'undefined') {
        init();
    } else {
        setTimeout(startApp, 50); // Check again in 50ms
    }
}

startApp();
