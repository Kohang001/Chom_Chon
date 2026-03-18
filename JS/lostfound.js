document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('addItemModal');
    const form = document.getElementById('addItemForm');
    const filters = document.querySelectorAll('.filter-btn');
    const itemsDisplay = document.getElementById('itemsDisplay');

    const fileInput = document.getElementById('itemImage');
    const imagePreview = document.getElementById('imagePreview');
    let selectedImageBase64 = "";
    let deleteTarget = null;

    // Image Preview Handling
    if (fileInput && imagePreview) {
        fileInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    selectedImageBase64 = e.target.result;
                    imagePreview.innerHTML = `<img src="${selectedImageBase64}" alt="Preview">`;
                    imagePreview.classList.add('has-image');
                }
                reader.readAsDataURL(file);
            } else {
                selectedImageBase64 = "";
                imagePreview.innerHTML = `<span>คลิกเพื่อแนบรูปภาพ</span>`;
                imagePreview.classList.remove('has-image');
            }
        });
    }

    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.classList.remove('show');
        }
    };

    // Helper for phone formatting
    const formatPhone = (num) => {
        if (!num) return 'ไม่ระบุเบอร์';
        let s = num.toString().replace(/[^\d]/g, '');
        if (!s.startsWith('0')) s = '0' + s;
        if (s.length !== 10) return s;
        return `${s.slice(0, 3)}-${s.slice(3, 6)}-${s.slice(6)}`;
    };

    // 1. ฟังก์ชันดึงจาก Cache (LocalStorage) เพื่อให้แสดงผลทันที
    const loadCache = () => {
        const userDataStr = localStorage.getItem('userSession');
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.items && Array.isArray(userData.items)) {
                renderItems(userData.items);
                return true;
            }
        }
        return false;
    };

    // 2. ฟังก์ชันโหลดข้อมูลจาก Apps Script และเก็บลง LocalStorage
    async function loadItems() {
        if (!itemsDisplay) return;

        try {
            itemsDisplay.innerHTML = '<p class="empty-text">กำลังโหลดข้อมูล...</p>';

            const result = await API.request('getLostFound');

            if (result.success) {
                const userDataStr = localStorage.getItem('userSession');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    userData.items = result.data;
                    localStorage.setItem('userSession', JSON.stringify(userData));
                }

                renderItems(result.data);
            } else {
                console.error("Failed to fetch items:", result.message);
                itemsDisplay.innerHTML = '<p class="empty-text">ไม่สามารถโหลดข้อมูลได้</p>';
            }
        } catch (error) {
            console.error("Error fetching items:", error);
            itemsDisplay.innerHTML = '<p class="empty-text">เกิดข้อผิดพลาดในการเชื่อมต่อ</p>';
        }
    }

    // 2. ฟังก์ชันแสดงผลรายการสิ่งของบนหน้าเว็บ
    function renderItems(items, filter = 'all') {
        if (!itemsDisplay) return;

        // ดึงข้อมูลผู้ใช้ปัจจุบันเพื่อเช็คความเป็นเจ้าของ
        const userDataStr = localStorage.getItem('userSession');
        let currentUsername = "";
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            currentUsername = userData.username || userData.firstName || "";
        }

        // กรองข้อมูลตามประเภท (All, Lost, Found)
        const filteredItems = filter === 'all'
            ? items
            : items.filter(item => item.Type === filter);

        if (!filteredItems || filteredItems.length === 0) {
            itemsDisplay.innerHTML = '<p class="empty-text">ยังไม่มีรายการในหมวดนี้</p>';
            return;
        }

        itemsDisplay.innerHTML = filteredItems.map(item => {
            let imgHtml = "";
            let imgUrl = item.Image || "";
            let isOwner = currentUsername && item.PosterName === currentUsername;

            // แปลง URL ของ Google Drive ให้เป็น Direct Link
            if (imgUrl && imgUrl.includes("drive.google.com")) {
                let fileId = "";
                const matchId = imgUrl.match(/[-\w]{25,}/);
                if (matchId) {
                    fileId = matchId[0];
                    const directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
                    imgHtml = `
                    <div class="item-image-wrapper">
                        <img src="${directUrl}" alt="${item.ItemName}" class="item-image">
                    </div>
                    `;
                }
            }

            const outerDiv = document.createElement('div');
            outerDiv.className = `item-card ${item.Type}`;
            
            // Generate Inner Structure Safe from XSS
            outerDiv.innerHTML = `
                ${imgHtml}
                <div class="item-badge ${item.Type}">${item.Type.toUpperCase()}</div>
                ${isOwner ? `<button class="btn-delete" onclick="deleteItem('${item.Timestamp}', '${item.PosterName}')" title="ลบประกาศ">ลบ</button>` : ''}
                <div class="item-info">
                    <h4 class="item-name safe-name"></h4>
                    <p class="item-meta"><span class="safe-date"></span></p>
                    <p class="item-meta"><span class="safe-loc"></span></p>
                    <p class="item-desc safe-desc"></p>
                    <div class="poster-info">
                        <p class="poster-name"><span class="safe-poster"></span></p>
                        <p class="poster-phone"><span class="safe-phone"></span></p>
                    </div>
                </div>
            `;
            
            // XSS Safe Text Value Assignments
            outerDiv.querySelector('.safe-name').textContent = item.ItemName;
            outerDiv.querySelector('.safe-date').textContent = item.Date;
            outerDiv.querySelector('.safe-loc').textContent = item.Location;
            outerDiv.querySelector('.safe-desc').textContent = item.Details;
            outerDiv.querySelector('.safe-poster').textContent = item.PosterName || 'ไม่ระบุชื่อ';
            outerDiv.querySelector('.safe-phone').textContent = formatPhone(item.PosterPhone);
            
            return outerDiv.outerHTML;
        }).join('');
    }

    // 3. ฟังก์ชันลบประกาศ
    window.deleteItem = function (timestamp, posterName) {

        deleteTarget = { timestamp, posterName };

        document.getElementById("deletePopup").classList.add("show");

    };
    
    window.closeDeletePopup = function () {
        document.getElementById("deletePopup").classList.remove("show");
        deleteTarget = null;
    };

    document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {

        if (!deleteTarget) return;

        const { timestamp, posterName } = deleteTarget;

        // ดึง Token จาก LocalStorage
        const userDataStr = localStorage.getItem('userSession');
        let token = "";
        if (userDataStr) {
            token = JSON.parse(userDataStr).token;
        }

        closeDeletePopup();

        try {
            const result = await API.request('deleteLostFound', {
                timestamp: timestamp,
                posterName: posterName
            });

            if (result.success) {
                loadItems();
                showToast("ลบประกาศเรียบร้อยแล้ว", "success");
            } else {
                showToast("ไม่สามารถลบได้: " + result.message, "error");
            }
        } catch (err) {
            showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
        }
    });

    // Filter Logic
    filters.forEach(btn => {
        btn.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterValue = btn.getAttribute('data-filter');
            const userDataStr = localStorage.getItem('userSession');
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                renderItems(userData.items || [], filterValue);
            }
        });
    });

    // Initial Load
    loadCache();
    loadItems();

    // Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = document.querySelector('#addItemModal .btn-add[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'กำลังส่งข้อมูล...';

            // ดึงข้อมูลจากฟอร์ม
            const formData = new FormData(form);

            // ดึงข้อมูลผู้ใช้ปัจจุบันจาก LocalStorage
            const userDataStr = localStorage.getItem('userSession');
            let posterName = "Unknown";
            let posterPhone = "";
            if (userDataStr) {
                const userData = JSON.parse(userDataStr);
                posterName = userData.username || userData.firstName || "Anonymous";
                posterPhone = userData.phone || "";
            }

            // ใช้ URLSearchParams เพื่อให้ฝั่ง Google Apps Script รับค่าแบบ e.parameter ได้ง่ายและไม่ติด CORS
            const data = new URLSearchParams();
            data.append('action', 'addLostFound'); // กำหนด action ให้ Google Apps Script รู้ว่าต้องทำอะไร
            data.append('type', formData.get('itemType'));
            data.append('name', formData.get('itemName'));
            data.append('date', formData.get('itemDate'));
            data.append('location', formData.get('itemLocation'));
            data.append('details', formData.get('itemDetails'));
            data.append('posterName', posterName);
            data.append('posterPhone', posterPhone);
            data.append('imageFile', selectedImageBase64); // ส่งรูปภาพเป็น Base64

            // สร้างเวลาปัจจุบันในรูปแบบที่อ่านง่าย (DD/MM/YYYY HH:mm:ss)
            const now = new Date();
            const timestamp = now.toLocaleString('th-TH');
            data.append('timestamp', timestamp);

            try {
                const result = await API.request('addLostFound', {
                    type: formData.get('itemType'),
                    name: formData.get('itemName'),
                    date: formData.get('itemDate'),
                    location: formData.get('itemLocation'),
                    details: formData.get('itemDetails'),
                    posterName: posterName,
                    posterPhone: posterPhone,
                    imageFile: selectedImageBase64,
                    timestamp: new Date().toLocaleString('th-TH')
                });

                if (result.success) {
                    showToast("เพิ่มข้อมูลลงระบบเรียบร้อยแล้ว", "success");
                    modal.classList.remove('show');
                    form.reset();

                    if (imagePreview) {
                        selectedImageBase64 = "";
                        imagePreview.innerHTML = `<span>คลิกเพื่อแนบรูปภาพ</span>`;
                        imagePreview.classList.remove('has-image');
                    }

                    loadItems();
                } else {
                    showToast("ไม่สามารถเพิ่มข้อมูลได้: " + result.message, "error");
                }
            } catch (error) {
                console.error('Error!', error.message);
                showToast("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง", "error");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }
});