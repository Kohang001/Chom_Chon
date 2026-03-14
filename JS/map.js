(function() {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSZF-yh74Miq4cXom8m98IrTNiqVS2Ew7jHcA2USe3eD3zmNGQc0auSCpLV38P90Xi/exec';

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

        // 1. Initial Load
        loadMapData();

        // 2. Open Modal via Button (REVISED: Reset state)
        if (addReportBtn) {
            addReportBtn.onclick = () => {
                const userData = JSON.parse(localStorage.getItem('userSession'));
                if (!userData) {
                    alert("กรุณาเข้าสู่ระบบก่อนแจ้งเหตุ");
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
                    locationStatus.innerHTML = '<i class="fas fa-info-circle"></i> <span>ยังไม่ได้เลือกตำแหน่ง</span>';
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
                    locationStatus.innerHTML = '<i class="fas fa-check-circle"></i> <span>เลือกตำแหน่งเรียบร้อยแล้ว</span>';
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
                alert("กรุณาคลิกเลือกตำแหน่งบนแผนที่ในขั้นตอนที่ 1");
                return;
            }

            if (!title || !description) {
                alert("กรุณากรอกหัวข้อและรายละเอียดเหตุการณ์");
                return;
            }

            submitPin.disabled = true;
            submitPin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังบันทึก...';

            try {
                const params = new URLSearchParams();
                params.append('action', 'addMapPin');
                params.append('timestamp', new Date().toISOString());
                params.append('title', title);
                params.append('description', description);
                params.append('x', x);
                params.append('y', y);
                params.append('posterName', userData.username);

                const res = await fetch(SCRIPT_URL, { method: 'POST', body: params });
                const result = await res.json();

                if (result.success) {
                    alert("บันทึกข้อมูลและปักหมุดสำเร็จ!");
                    hideModal();
                    loadMapData();
                } else {
                    alert("เกิดข้อผิดพลาด: " + result.message);
                }
            } catch (err) {
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
            } finally {
                submitPin.disabled = false;
                submitPin.innerText = "ยืนยันการปักหมุด";
            }
        };

        // Logic: Load Data
        async function loadMapData() {
            const userData = JSON.parse(localStorage.getItem('userSession'));
            try {
                reportList.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i> กำลังโหลดข้อมูล...</div>';
                const res = await fetch(`${SCRIPT_URL}?action=getMapPins`);
                const result = await res.json();

                if (result.success) {
                    pinsOverlay.innerHTML = '';
                    reportList.innerHTML = '';

                    if (result.data.length === 0) {
                        reportList.innerHTML = '<div class="loading-state">ยังไม่มีการแจ้งเหตุในพื้นที่</div>';
                        return;
                    }

                    result.data.forEach(item => {
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
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        ` : '';

                        card.innerHTML = `
                            <div class="report-header">
                                <h3>${item.Title}</h3>
                                ${deleteBtnHtml}
                            </div>
                            <p>${item.Description}</p>
                            <div class="report-meta">
                                <span><i class="fas fa-user"></i> ${item.PosterName}</span>
                            </div>
                        `;
                        
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
                                    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                                    
                                    try {
                                        const delParams = new URLSearchParams();
                                        delParams.append('action', 'deleteMapPin');
                                        delParams.append('timestamp', item.Timestamp);
                                        delParams.append('posterName', userData.username);

                                        const delRes = await fetch(SCRIPT_URL, { method: 'POST', body: delParams });
                                        const delResult = await delRes.json();

                                        if (delResult.success) {
                                            alert("ลบประกาศเรียบร้อยแล้ว");
                                            loadMapData();
                                        } else {
                                            alert("เกิดข้อผิดพลาด: " + delResult.message);
                                            deleteBtn.disabled = false;
                                            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                                        }
                                    } catch (delErr) {
                                        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
                                        deleteBtn.disabled = false;
                                        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                                    }
                                }
                            };
                        }

                        reportList.appendChild(card);
                    });
                }
            } catch (err) {
                console.error("Load map data error:", err);
                reportList.innerHTML = '<div class="loading-state">ไม่สามารถโหลดข้อมูลได้</div>';
            }
        }
    });
})();
