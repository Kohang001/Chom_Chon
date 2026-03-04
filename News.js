const API_URL = "https://script.google.com/macros/s/AKfycbxFY_tB0a5qVrS2pPCU9wgec-446UeREwREAUtkAwXE3xLvx2d6R7-0VhwYE6Pdih3Lqw/exec";
let session = JSON.parse(localStorage.getItem('session'));
let mapPin = { x: 0, y: 0 };

window.onload = () => {
    if (!session || new Date(session.expireAt) < new Date()) {
        alert("Session หมดอายุ"); window.location.href = 'Index.html';
    }
    document.getElementById('profName').innerText = session.username;
    loadNews();
    
    // Close modal on background click
    document.getElementById('addModal').addEventListener('click', (e) => {
        if (e.target.id === 'addModal') closeModals();
    });
};

function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('hidden'); }
function logout() { localStorage.removeItem('session'); window.location.href = 'Index.html'; }
function openAddModal() { 
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('mapPicker').innerText = '[คลิกเพื่อปักหมุดบนแผนที่]';
    mapPin = { x: 0, y: 0 };
}
function closeModals() { document.getElementById('addModal').classList.add('hidden'); }

function setPin(e) {
    const rect = e.target.getBoundingClientRect();
    mapPin.x = ((e.clientX - rect.left) / rect.width) * 100;
    mapPin.y = ((e.clientY - rect.top) / rect.height) * 100;
    e.target.innerText = `ปักหมุดแล้ว (${mapPin.x.toFixed(0)}%, ${mapPin.y.toFixed(0)}%)`;
}

async function apiCall(action, payload) {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, token: session.token, ...payload }) });
    const data = await res.json();
    if (data.error === 'Unauthorized') { logout(); }
    return data;
}

async function loadNews() {
    const filter = document.getElementById('newsFilter').value;
    const res = await apiCall('getNews', { filter });
    const feed = document.getElementById('newsFeed');
    feed.innerHTML = res.data.map(n => `
        <div class="card">
            <h4>${n.title} (${n.isGov ? 'รัฐ' : n.username})</h4>
            <p>${n.locationName} | ${new Date(n.eventTime).toLocaleString()}</p>
            ${n.userId === session.userId ? `<button onclick="deleteNews('${n.id}')">ลบ</button>` : ''}
        </div>
    `).join('');
}

async function submitNews() {
    const fileInput = document.getElementById('newsImg');
    let base64 = "";
    if (fileInput.files.length > 0) base64 = await toBase64(fileInput.files[0]);

    const payload = {
        title: document.getElementById('newsTitle').value,
        eventTime: document.getElementById('newsTime').value,
        locationName: document.getElementById('newsLoc').value,
        description: document.getElementById('newsDesc').value,
        xPercent: mapPin.x, yPercent: mapPin.y,
        imageBase64: base64
    };

    const res = await apiCall('addNews', payload);
    if (res.success) { closeModals(); loadNews(); }
    else alert(res.message);
}

async function deleteNews(id) {
    if (confirm('แน่ใจหรือไม่ที่จะลบ?')) {
        await apiCall('deleteNews', { id });
        loadNews();
    }
}

const toBase64 = file => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
});