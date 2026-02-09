// Skolberga HVB - Huvudapplikation (Apps Script version)
let measurements = [];
let editingRow = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('datum').valueAsDate = new Date();
    loadMeasurements();
});

// Google Apps Script functions
async function loadMeasurements() {
    try {
        showLoading(true);
        
        const response = await fetch(CONFIG.SCRIPT_URL);
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Okänt fel');
        }
        
        // Konvertera data till rätt format
        measurements = result.data.map((row, index) => ({
            row: index + 2, // +2 för header rad
            brukarId: row['Brukare-ID'] || '',
            datum: row['Datum'] || '',
            tillfalle: row['Mättillfälle'] || '',
            vasLivskvalitet: parseFloat(row['VAS Livskvalitet']) || 0,
            vasMaende: parseFloat(row['VAS Mående']) || 0,
            whodas: parseFloat(row['WHODAS']) || 0,
            audit: parseFloat(row['AUDIT']) || 0,
            dudit: parseFloat(row['DUDIT']) || 0,
            anteckningar: row['Anteckningar'] || '',
            registreradAv: row['Registrerad av'] || '',
            registreringsdatum: row['Registreringsdatum'] || '',
            timestamp: row['Timestamp'] || '',            id: row['ID'] || ''
        }));
        
        renderMeasurements();
        updateStats();
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading measurements:', error);
        showLoading(false);
        showToast('Fel vid laddning av data: ' + error.message);
    }
}

async function saveMeasurementToSheet(measurement) {
    try {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sparar...';
        
        const data = {
            action: 'save',
            brukarId: measurement.brukarId,
            datum: measurement.datum,
            tillfalle: measurement.tillfalle,
            vasLivskvalitet: measurement.vasLivskvalitet,
            vasMaende: measurement.vasMaende,
            whodas: measurement.whodas,
            audit: measurement.audit,
            dudit: measurement.dudit,
            anteckningar: measurement.anteckningar,
            registreradAv: measurement.registreradAv,
            registreringsdatum: measurement.registreringsdatum,
            id: measurement.id || new Date().getTime().toString(),
            rowIndex: editingRow || null
        };
        
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Okänt fel');
        }
        
        await loadMeasurements();
        showToast(editingRow ? 'Mätning uppdaterad' : 'Mätning sparad');
        closeForm();
        
    } catch (error) {
        console.error('Error saving measurement:', error);
        showToast('Fel vid sparande: ' + error.message);
    } finally {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Spara mätning';
    }
}

async function deleteMeasurementFromSheet(rowIndex) {
    if (!confirm('Är du säker på att du vill ta bort denna mätning?')) return;
    
    try {
        const data = {
            action: 'delete',
            rowIndex: rowIndex
        };
        
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Okänt fel');
        }
        
        await loadMeasurements();
        showToast('Mätning borttagen');
        
    } catch (error) {
        console.error('Error deleting measurement:', error);
        showToast('Fel vid borttagning: ' + error.message);
    }
}

// UI Functions
function showLoading(show) {
    document.getElementById('measurementsLoading').style.display = show ? 'block' : 'none';
    document.getElementById('measurementsContainer').style.display = show ? 'none' : 'block';
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tab).classList.add('active');
    event.target.classList.add('active');
    
    if (tab === 'stats') {
        updateStats();
    }
}

function openForm() {
    editingRow = null;
    document.getElementById('formTitle').textContent = 'Ny mätning';
    document.getElementById('measurementForm').reset();
    document.getElementById('datum').valueAsDate = new Date();
    document.getElementById('formModal').classList.add('active');
}

function closeForm() {
    document.getElementById('formModal').classList.remove('active');
    editingRow = null;
}

function editMeasurement(m) {
    editingRow = m.row;
    document.getElementById('formTitle').textContent = 'Redigera mätning';
    document.getElementById('brukarId').value = m.brukarId;
    document.getElementById('datum').value = m.datum;
    document.getElementById('tillfalle').value = m.tillfalle;
    document.getElementById('vasLivskvalitet').value = m.vasLivskvalitet;
    document.getElementById('vasMaende').value = m.vasMaende;
    document.getElementById('whodas').value = m.whodas;
    document.getElementById('audit').value = m.audit;
    document.getElementById('dudit').value = m.dudit;
    document.getElementById('anteckningar').value = m.anteckningar || '';
    document.getElementById('registreradAv').value = m.registreradAv;
    
    document.getElementById('formModal').classList.add('active');
}

function saveMeasurement(event) {
    event.preventDefault();
    
    const measurement = {
        id: editingRow ? measurements.find(m => m.row === editingRow)?.id : null,
        brukarId: document.getElementById('brukarId').value,
        datum: document.getElementById('datum').value,
        tillfalle: document.getElementById('tillfalle').value,
        vasLivskvalitet: parseFloat(document.getElementById('vasLivskvalitet').value),
        vasMaende: parseFloat(document.getElementById('vasMaende').value),
        whodas: parseFloat(document.getElementById('whodas').value),
        audit: parseFloat(document.getElementById('audit').value),
        dudit: parseFloat(document.getElementById('dudit').value),
        anteckningar: document.getElementById('anteckningar').value,
        registreradAv: document.getElementById('registreradAv').value,
        registreringsdatum: new Date().toISOString().split('T')[0]
    };

    saveMeasurementToSheet(measurement);
}

function renderMeasurements() {
    const tbody = document.getElementById('measurementsList');
    
    if (measurements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px; color: #64748b;">Inga mätningar registrerade än. Klicka på "Ny mätning" för att börja.</td></tr>';
        return;
    }

    const sorted = [...measurements].sort((a, b) => new Date(b.datum) - new Date(a.datum));
    
    tbody.innerHTML = sorted.map(m => `
        <tr>
            <td style="font-weight: 600;">${m.brukarId}</td>
            <td>${m.datum}</td>
            <td>${m.tillfalle}</td>
            <td style="text-align: center; color: #2563eb; font-weight: 600;">${m.vasLivskvalitet}</td>
            <td style="text-align: center; color: #10b981; font-weight: 600;">${m.vasMaende}</td>
            <td style="text-align: center; color: #8b5cf6; font-weight: 600;">${m.whodas}</td>
            <td style="text-align: center; color: #ef4444; font-weight: 600;">${m.audit}</td>
            <td style="text-align: center; color: #f59e0b; font-weight: 600;">${m.dudit}</td>
            <td style="text-align: right;">
                <div class="action-btns">
                    <button class="icon-btn" onclick='editMeasurement(${JSON.stringify(m).replace(/'/g, "&apos;")})' style="color: #2563eb;">✏️</button>
                    <button class="icon-btn" onclick="deleteMeasurementFromSheet(${m.row})" style="color: #ef4444;">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getFilteredMeasurements() {
    const period = document.getElementById('periodSelect').value;
    if (period === 'all') return measurements;

    const now = new Date();
    const cutoff = new Date(now);

    switch(period) {
        case '3m': cutoff.setMonth(now.getMonth() - 3); break;
        case '6m': cutoff.setMonth(now.getMonth() - 6); break;
        case '12m': cutoff.setFullYear(now.getFullYear() - 1); break;
    }

    return measurements.filter(m => new Date(m.datum) >= cutoff);
}

function updateStats() {
    const filtered = getFilteredMeasurements();
    const period = document.getElementById('periodSelect').value;
    
    const periodLabels = {
        'all': '',
        '3m': 'Senaste 3 månaderna',
        '6m': 'Senaste 6 månaderna',
        '12m': 'Senaste 12 månaderna'
    };
    document.getElementById('periodLabel').textContent = periodLabels[period];

    // KPIs
    const uniqueUsers = new Set(filtered.map(m => m.brukarId)).size;
    document.getElementById('kpiUsers').textContent = uniqueUsers;
    document.getElementById('kpiMeasurements').textContent = filtered.length;

    if (filtered.length > 0) {
        const avgLK = filtered.reduce((sum, m) => sum + m.vasLivskvalitet, 0) / filtered.length;
        const avgPM = filtered.reduce((sum, m) => sum + m.vasMaende, 0) / filtered.length;
        document.getElementById('kpiLivskvalitet').textContent = avgLK.toFixed(1);
        document.getElementById('kpiMaende').textContent = avgPM.toFixed(1);
    } else {
        document.getElementById('kpiLivskvalitet').textContent = '-';
        document.getElementById('kpiMaende').textContent = '-';
    }

    // Improvement stats
    const improvements = calculateImprovements(filtered);
    renderImprovementChart(improvements);
}

function calculateImprovements(filtered) {
    const brukarData = {};
    
    filtered.forEach(m => {
        if (!brukarData[m.brukarId]) brukarData[m.brukarId] = [];
        brukarData[m.brukarId].push(m);
    });

    const metrics = {
        vasLivskvalitet: { name: 'VAS Livskvalitet', improved: 0, worsened: 0, stable: 0, color: '#2563eb', threshold: 1, higher: true },
        vasMaende: { name: 'VAS Mående', improved: 0, worsened: 0, stable: 0, color: '#10b981', threshold: 1, higher: true },
        whodas: { name: 'WHODAS', improved: 0, worsened: 0, stable: 0, color: '#8b5cf6', threshold: 5, higher: false },
        audit: { name: 'AUDIT', improved: 0, worsened: 0, stable: 0, color: '#ef4444', threshold: 3, higher: false },
        dudit: { name: 'DUDIT', improved: 0, worsened: 0, stable: 0, color: '#f59e0b', threshold: 3, higher: false }
    };

    Object.values(brukarData).forEach(records => {
        if (records.length < 2) return;
        
        const sorted = records.sort((a, b) => new Date(a.datum) - new Date(b.datum));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        Object.keys(metrics).forEach(key => {
            const metric = metrics[key];
            const change = last[key] - first[key];

            if (Math.abs(change) < metric.threshold) {
                metric.stable++;
            } else if ((metric.higher && change > 0) || (!metric.higher && change < 0)) {
                metric.improved++;
            } else {
                metric.worsened++;
            }
        });
    });

    return Object.values(metrics);
}

function renderImprovementChart(improvements) {
    const chartDiv = document.getElementById('improvementChart');
    const detailsDiv = document.getElementById('improvementDetails');

    if (improvements.every(m => m.improved + m.worsened + m.stable === 0)) {
        chartDiv.innerHTML = '<p style="text-align: center; color: #64748b; padding: 40px;">Inte tillräckligt med data. Behöver minst 2 mätningar per brukare.</p>';
        detailsDiv.innerHTML = '';
        return;
    }

    chartDiv.innerHTML = improvements.map(m => {
        const total = m.improved + m.worsened + m.stable;
        const pct = total > 0 ? Math.round((m.improved / total) * 100) : 0;
        
        return `
            <div class="bar-item">
                <div class="bar-label">${m.name}</div>
                <div class="bar-container">
                    <div class="bar-fill" style="width: ${pct}%; background: ${m.color};">
                        ${pct}%
                    </div>
                </div>
            </div>
        `;
    }).join('');

    detailsDiv.innerHTML = improvements.map(m => {
        const total = m.improved + m.worsened + m.stable;
        if (total === 0) return '';

        const impPct = Math.round((m.improved / total) * 100);
        const worPct = Math.round((m.worsened / total) * 100);
        const staPct = Math.round((m.stable / total) * 100);

        return `
            <div class="stat-item">
                <div class="stat-title">${m.name}</div>
                <div class="stat-grid">
                    <div class="stat-row">
                        <span class="stat-label">Förbättring:</span>
                        <span class="stat-value green">${impPct}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Försämring:</span>
                        <span class="stat-value red">${worPct}%</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Stabilt:</span>
                        <span class="stat-value gray">${staPct}%</span>
                    </div>
                    <div class="stat-row" style="padding-top: 8px; margin-top: 8px; border-top: 1px solid #e2e8f0;">
                        <span class="stat-label">Antal:</span>
                        <span class="stat-value" style="color: #1e293b;">${total}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Click outside modal to close
document.getElementById('formModal').addEventListener('click', (e) => {
    if (e.target.id === 'formModal') closeForm();
});
