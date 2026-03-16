(function() {
    // Removed hardcoded SCRIPT_URL

    document.addEventListener('DOMContentLoaded', () => {
        const pinsOverlay = document.getElementById('pinsOverlay');
        const pinModal = document.getElementById('pinModal');
        const closeModal = document.getElementById('closeModal');
        const cancelBtn = document.getElementById('cancelBtn');
        const submitPin = document.getElementById('submitPin');
        const reportList = document.getElementById('reportList');
        const addReportBtn = document.getElementById('addReportBtn');
        const locationStatus = document.getElementById('locationStatus');
        const pickerWrapper = document.getElementById('pickerWrapper');
        const pickerPins = document.getElementById('pickerPins');

        // 1. Initial Load (Moved to bottom)

        // 2. Open Modal via Button (REVISED: Reset state)
        if (addReportBtn) {
            addReportBtn.onclick = () => {
                const userData = JSON.parse(localStorage.getItem('userSession'));
                if (!userData) {
                    showToast("กรุณาเข้าสู่ระบบก่อนแจ้งเหตุ", "warning");
                    window.location.href = '/index.html';
                    return;
                }
                
                // Reset form state
                document.getElementById('pinTitle').value = '';
                document.getElementById('pinDescription').value = '';
                document.getElementById('coordX').value = '';
                document.getElementById('coordY').value = '';
                pickerPins.innerHTML = '';
                if (locationStatus) {
                    locationStatus.classList.remove('selected');
                    locationStatus.innerHTML = '<span>ยังไม่ได้เลือกตำแหน่ง</span>';
                }
                
                pinModal.style.display = 'flex';
            };
        }

        // 3. Picker INTERACTION (Inside Modal Only)
        if (pickerWrapper) {
            pickerWrapper.addEventListener('click', (e) => {
                const rect = pickerWrapper.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;

                // Store coordinates
                document.getElementById('coordX').value = x.toFixed(2);
                document.getElementById('coordY').value = y.toFixed(2);
                
                // Show temporary pin on picker map
                pickerPins.innerHTML = ''; // Clear previous temp pin
                const pin = document.createElement('div');
                pin.className = 'pin pin-temp';
                pin.style.left = x + '%';
                pin.style.top = y + '%';
                pickerPins.appendChild(pin);
                
                // Update UI in Modal
                if (locationStatus) {
                    locationStatus.classList.add('selected');
                    locationStatus.innerHTML = '<span>เลือกตำแหน่งเรียบร้อยแล้ว</span>';
                }
            });
        }

        // 4. Modal Controls
        const hideModal = () => {
            pinModal.style.display = 'none';
        };

        closeModal.onclick = hideModal;
        cancelBtn.onclick = hideModal;
        window.onclick = (e) => { if (e.target == pinModal) hideModal(); };

        // 5. Submit Report
        submitPin.onclick = async () => {
            const userData = JSON.parse(localStorage.getItem('userSession'));
            const title = document.getElementById('pinTitle').value;
            const description = document.getElementById('pinDescription').value;
            const x = document.getElementById('coordX').value;
            const y = document.getElementById('coordY').value;

            if (!x || !y) {
                showToast("กรุณาเลือกตำแหน่งบนแผนที่ก่อนบันทึก", "warning");
                return;
            }

            if (!title || !description) {
                showToast("กรุณากรอกหัวข้อและรายละเอียดเหตุการณ์", "warning");
                return;
            }

            submitPin.disabled = true;
            submitPin.innerHTML = 'กำลังบันทึก...';

            try {
                const result = await API.request('addMapPin', {
                    timestamp: new Date().toISOString(),
                    title: title,
                    description: description,
                    x: x,
                    y: y,
                    posterName: userData.username
                });

                if (result.success) {
                    showToast("บันทึกข้อมูลและปักหมุดสำเร็จ", "success");
                    hideModal();
                    loadMapData();
                } else {
                    showToast("ไม่สามารถบันทึกได้: " + result.message, "error");
                }
            } catch (err) {
                showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
            } finally {
                submitPin.disabled = false;
                submitPin.innerText = "ยืนยันการปักหมุด";
            }
        };

        // 6. Caching System
        const loadCache = () => {
            const userDataStr = localStorage.getItem('userSession');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                if (userData.pins && Array.isArray(userData.pins)) {
                    renderMapData(userData.pins);
                    return true;
                }
            }
            return false;
        };

        const saveCache = (data) => {
            const userDataStr = localStorage.getItem('userSession');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                userData.pins = data;
                localStorage.setItem('userSession', JSON.stringify(userData));
            }
        };

        // Logic: Load Data
        async function loadMapData() {
            try {
                if (!loadCache()) {
                    reportList.innerHTML = '<div class="loading-state">กำลังโหลดข้อมูล...</div>';
                }
                
                const result = await API.request('getMapPins');

                if (result.success) {
                    saveCache(result.data);
                    renderMapData(result.data);
                } else {
                    console.error("Failed to load map data:", result.message);
                    if (reportList.innerHTML.includes('loading-state')) {
                        reportList.innerHTML = '<div class="loading-state">ไม่สามารถโหลดข้อมูลได้</div>';
                    }
                }
            } catch (err) {
                console.error("Load map data error:", err);
                if (reportList.innerHTML.includes('loading-state')) {
                    reportList.innerHTML = '<div class="loading-state">เกิดข้อผิดพลาดในการเชื่อมต่อ</div>';
                }
            }
        }

        function renderMapData(data) {
            const userDataStr = localStorage.getItem('userSession');
            const userData = userDataStr ? JSON.parse(userDataStr) : null;
            
            pinsOverlay.innerHTML = '';
            reportList.innerHTML = '';

            if (data.length === 0) {
                reportList.innerHTML = '<div class="loading-state">ยังไม่มีการแจ้งเหตุในพื้นที่</div>';
                return;
            }

            data.forEach(item => {
                const pinId = `pin-${new Date(item.Timestamp).getTime()}`;
                const cardId = `card-${new Date(item.Timestamp).getTime()}`;
                const isOwner = userData && userData.username === item.PosterName;
                
                // --- Pin on map ---
                const pin = document.createElement('div');
                pin.className = 'pin';
                pin.id = pinId;
                pin.style.left = item.X + '%';
                pin.style.top = item.Y + '%';
                pin.title = item.Title;
                pin.style.pointerEvents = 'auto'; // Enable events
                pin.style.cursor = 'pointer';
                
                // Pin CLICK: Go to Card
                pin.onclick = (e) => {
                    e.stopPropagation();
                    // Clear all highlights
                    document.querySelectorAll('.report-card.focused').forEach(c => c.classList.remove('focused'));
                    document.querySelectorAll('.pin.active').forEach(p => p.classList.remove('active'));
                    
                    // Highlight pin
                    pin.classList.add('active');
                    
                    // Scroll to card
                    const targetCard = document.getElementById(cardId);
                    if (targetCard) {
                        targetCard.classList.add('focused');
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                };
                
                pinsOverlay.appendChild(pin);

                // --- Card in list ---
                const date = new Date(item.Timestamp).toLocaleString('th-TH');
                const card = document.createElement('div');
                card.className = 'report-card';
                card.id = cardId;
                card.style.cursor = 'pointer';
                
                let deleteBtnHtml = isOwner ? `
                    <button class="delete-btn-map" title="ลบประกาศ" data-timestamp="${item.Timestamp}">
                        ลบ
                    </button>
                ` : '';

                card.innerHTML = `
                    <div class="report-header">
                        <h3 class="safe-title"></h3>
                        ${deleteBtnHtml}
                    </div>
                    <p class="safe-desc"></p>
                    <div class="report-meta">
                        <span><span class="safe-poster"></span></span>
                    </div>
                `;
                card.querySelector('.safe-title').textContent = item.Title;
                card.querySelector('.safe-desc').textContent = item.Description;
                card.querySelector('.safe-poster').textContent = item.PosterName;
                
                
                // Card CLICK: Focus Pin
                card.onclick = (e) => {
                    // If delete button was clicked, don't focus
                    if (e.target.closest('.delete-btn-map')) return;

                    document.querySelectorAll('.pin.active').forEach(p => p.classList.remove('active'));
                    document.querySelectorAll('.report-card.focused').forEach(c => c.classList.remove('focused'));
                    
                    card.classList.add('focused');
                    const targetPin = document.getElementById(pinId);
                    if (targetPin) {
                        targetPin.classList.add('active');
                        document.getElementById('mapWrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                };

                // Handle Delete
                if (isOwner) {
                    const deleteBtn = card.querySelector('.delete-btn-map');
                    deleteBtn.onclick = async (e) => {
                        e.stopPropagation();
                        if (confirm("คุณต้องการลบประกาศนี้ใช่หรือไม่?")) {
                            deleteBtn.disabled = true;
                            deleteBtn.innerHTML = '...';
                            
                            try {
                                const delResult = await API.request('deleteMapPin', {
                                    timestamp: item.Timestamp,
                                    posterName: userData.username
                                });

                                if (delResult.success) {
                                    showToast("ลบประกาศเรียบร้อยแล้ว", "success");
                                    loadMapData();
                                } else {
                                    showToast("ไม่สามารถลบได้: " + delResult.message, "error");
                                    deleteBtn.disabled = false;
                                    deleteBtn.innerHTML = 'ลบ';
                                }
                            } catch (delErr) {
                                showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
                                deleteBtn.disabled = false;
                                deleteBtn.innerHTML = 'ลบ';
                            }
                        }
                    };
                }

                reportList.appendChild(card);
            });
        }

        // 7. Trigger Initial Load
        loadMapData();
    });
})();
