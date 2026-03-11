document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('addItemModal');
    const form = document.getElementById('addItemForm');
    const filters = document.querySelectorAll('.filter-btn');
    const itemsDisplay = document.getElementById('itemsDisplay');
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSZF-yh74Miq4cXom8m98IrTNiqVS2Ew7jHcA2USe3eD3zmNGQc0auSCpLV38P90Xi/exec';

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
                imagePreview.innerHTML = `<i class="fas fa-camera"></i><span>Click to upload or drag photo</span>`;
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

    // 1. ฟังก์ชันโหลดข้อมูลจาก Apps Script และเก็บลง LocalStorage
    async function loadItems() {
        if (!itemsDisplay) return;

        try {
            itemsDisplay.innerHTML = '<p class="empty-text"><i class="fas fa-spinner fa-spin"></i> Loading items...</p>';

            const response = await fetch(`${SCRIPT_URL}?action=getLostFound`);
            const result = await response.json();

            if (result.success) {
                // เก็บข้อมูลลงใน userSession ใน LocalStorage
                const userDataStr = localStorage.getItem('userSession');
                if (userDataStr) {
                    const userData = JSON.parse(userDataStr);
                    userData.items = result.data; // เพิ่มฟิลด์ items
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

            return `
                <div class="item-card ${item.Type}">
                    ${imgHtml}
                    <div class="item-badge ${item.Type}">${item.Type.toUpperCase()}</div>
                    
                    ${isOwner ? `<button class="btn-delete" onclick="deleteItem('${item.Timestamp}', '${item.PosterName}')" title="ลบประกาศ"><i class="fas fa-trash-alt"></i></button>` : ''}

                    <div class="item-info">
                        <h4 class="item-name">${item.ItemName}</h4>
                        <p class="item-meta"><i class="far fa-calendar-alt"></i> ${item.Date}</p>
                        <p class="item-meta"><i class="fas fa-map-marker-alt"></i> ${item.Location}</p>
                        <p class="item-desc">${item.Details}</p>
                        
                        <div class="poster-info">
                            <p class="poster-name"><i class="fas fa-user-circle"></i> ${item.PosterName || 'ไม่ระบุชื่อ'}</p>
                            <p class="poster-phone"><i class="fas fa-phone-alt"></i> ${item.PosterPhone ? (item.PosterPhone.toString().startsWith('0') ? item.PosterPhone : '0' + item.PosterPhone) : 'ไม่ระบุเบอร์'}</p>
                        </div>
                    </div>
                    <div class="item-footer">
                        <small>${item.Timestamp}</small>
                    </div>
                </div>
            `;
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

        closeDeletePopup();

        try {

            const data = new URLSearchParams();

            data.append('action', 'deleteLostFound');
            data.append('timestamp', timestamp);
            data.append('posterName', posterName);

            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: data
            });

            const result = await response.json();

            if (result.success) {

                loadItems();

            } else {

                alert("เกิดข้อผิดพลาด: " + result.message);

            }

        } catch (err) {

            alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");

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
    loadItems();

    // Form Submission
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = form.querySelector('.btn-submit');
            const originalBtnContent = submitBtn.innerHTML;

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

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
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: data // ส่งข้อมูลเป็นรูปแบบ Form Data
                });

                const result = await response.json();

                if (result.success) {
                    alert('เพิ่มข้อมูลลงระบบเรียบร้อยแล้ว!');
                    modal.classList.remove('show');
                    form.reset();

                    // Reset Image Preview
                    if (imagePreview) {
                        selectedImageBase64 = "";
                        imagePreview.innerHTML = `<i class="fas fa-camera"></i><span>Click to upload or drag photo</span>`;
                        imagePreview.classList.remove('has-image');
                    }

                    // โหลดข้อมูลใหม่หลังจากเพิ่มสำเร็จ
                    loadItems();
                } else {
                    alert('เกิดข้อผิดพลาด: ' + result.message);
                }

            } catch (error) {
                console.error('Error!', error.message);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;
            }
        });
    }
});