const API_URL = "https://script.google.com/macros/s/AKfycbxFY_tB0a5qVrS2pPCU9wgec-446UeREwREAUtkAwXE3xLvx2d6R7-0VhwYE6Pdih3Lqw/exec";
let session = JSON.parse(localStorage.getItem('session'));
let page = 0;

window.onload = () => {
    if (!session || new Date(session.expireAt) < new Date()) {
        alert("Session หมดอายุ"); window.location.href = 'Index.html';
    }
    document.getElementById('profName').innerText = session.username;
    loadLF();
};

function toggleSettings() { document.getElementById('settingsPanel').classList.toggle('hidden'); }
function logout() { localStorage.removeItem('session'); window.location.href = 'Index.html'; }
function openAddModal() { 
    document.getElementById('addModal').classList.remove('hidden');
    document.getElementById('lfDate').valueAsDate = new Date();
}
function closeModals() { document.getElementById('addModal').classList.add('hidden'); }

window.addEventListener('load', () => {
    // Close modal on background click
    document.getElementById('addModal').addEventListener('click', (e) => {
        if (e.target.id === 'addModal') closeModals();
    });
});

async function apiCall(action, payload) {
    const res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, token: session.token, ...payload }) });
    return res.json();
}

function resetAndLoadLF() { page = 0; document.getElementById('lfFeed').innerHTML = ''; loadLF(); }

async function loadLF() {
    const filter = document.getElementById('lfFilter').value;
    const res = await apiCall('getLostFound', { filter, page });
    const feed = document.getElementById('lfFeed');
    feed.innerHTML += res.data.map(i => `
        <div class="card">
            <h4>[${i.type.toUpperCase()}] ${i.itemName}</h4>
            <p>โดย: ${i.username} | เบอร์: ${i.phone}</p>
            <p>${i.description}</p>
            ${i.userId === session.userId ? `<button onclick="deleteLF('${i.id}')">ลบ</button>` : ''}
        </div>
    `).join('');
    page++;
}

async function submitLF() {
    const fileInput = document.getElementById('lfImg');
    let base64 = fileInput.files.length > 0 ? await toBase64(fileInput.files[0]) : "";

    const payload = {
        type: document.getElementById('lfType').value,
        itemName: document.getElementById('lfItem').value,
        date: document.getElementById('lfDate').value,
        phone: document.getElementById('lfPhone').value,
        description: document.getElementById('lfDesc').value,
        imageBase64: base64
    };

    const res = await apiCall('addLostFound', payload);
    if (res.success) { closeModals(); resetAndLoadLF(); }
}

async function deleteLF(id) {
    if (confirm('ลบหรือไม่?')) { await apiCall('deleteLostFound', { id }); resetAndLoadLF(); }
}

const toBase64 = file => new Promise((resolve) => {
    const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result.split(',')[1]);
});