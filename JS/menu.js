document.addEventListener('DOMContentLoaded', () => {
    // 1. ดึงข้อมูลผู้ใช้จาก LocalStorage (ที่เปรียบเสมือน save.json)
    const userDataStr = localStorage.getItem('userSession');
    const userProfileDiv = document.getElementById('userProfile');

    if (userDataStr && userProfileDiv) {
        // แปลงข้อความ JSON ให้กลายเป็น Object
        const userData = JSON.parse(userDataStr);

        // กำหนดรูปโปรไฟล์ตั้งต้น (กรณีไม่มีรูป)
        let imgUrl = userData.image || 'https://via.placeholder.com/40';

        // แปลง URL ของ Google Drive ให้เป็นแบบสำหรับใช้เป็น Source ของภาพ (Direct Link)
        if (imgUrl.includes("drive.google.com")) {
            // จับ ID จากลิงก์รูปแบบ drive.google.com/file/d/ID/view หรือ drive.google.com/open?id=ID
            const fileIdMatch = imgUrl.match(/[-\w]{25,}/);
            if (fileIdMatch && fileIdMatch[0]) {
                // เปลี่ยนไปใช้ API Thumbnail ของ Drive แทน (อัพเดตใหม่ หลีกเลี่ยงปัญหาถูกบล็อกจาก Google)
                imgUrl = "https://lh3.googleusercontent.com/d/" + fileIdMatch[0];
            }
        }

        console.log("Raw Image Data from Storage:", userData.image);
        console.log("Final Image URL to render:", imgUrl);

        // จัดการเบอร์โทรศัพท์ เผื่อ Google Sheets ตัด 0 ตัวหน้าทิ้ง
        let displayPhone = String(userData.phone);
        if (displayPhone.length === 9) {
            displayPhone = "0" + displayPhone;
        }

        // 2. นำข้อมูลไปแสดงผลบนหน้าเว็บ (Header)
        userProfileDiv.innerHTML = `
            <div class="profile-card">
                <div class="profile-img-container">
                    <img class="profile-img" src="${imgUrl}" alt="Profile" onclick="document.getElementById('profileUpload').click()">
                    <div class="img-overlay" onclick="document.getElementById('profileUpload').click()">
                        <span>เปลี่ยนรูป</span>
                    </div>
                </div>
                <input type="file" id="profileUpload" style="display: none;" accept="image/*">

                <div class="profile-row">
                    <div class="profile-item">
                        <span class="label">ชื่อจริง</span>
                        <span class="value">${userData.firstName}</span>
                    </div>

                    <div class="profile-item">
                        <span class="label">นามสกุล</span>
                        <span class="value">${userData.lastName}</span>
                    </div>
                </div>

                <div class="profile-row">
                    <div class="profile-item">
                        <span class="label">Username</span>
                        <div class="value-with-btn">
                            <span class="value">@${userData.username}</span>
                            <button class="mini-edit-btn" onclick="toggleEditSection('username')">
                                แก้ไข
                            </button>
                        </div>
                    </div>

                    <div class="profile-item">
                        <span class="label">เบอร์</span>
                        <span class="value">${displayPhone}</span>
                    </div>
                </div>

                <div class="profile-actions-v2">
                    <button class="action-card-btn" onclick="toggleEditSection('password')">
                        เปลี่ยนรหัสผ่าน
                    </button>
                    <button class="action-card-btn logout-btn-v2" onclick="logout()">
                        ออกจากระบบ
                    </button>
                </div>

                <!-- Section: Edit Username -->
                <div id="editUsernameForm" class="edit-section-container" style="display: none;">
                    <div class="edit-group">
                        <label>New Username</label>
                        <div class="input-with-icon">
                            <input type="text" id="newUsername" value="${userData.username}">
                        </div>
                    </div>
                    <p class="edit-note">* เปลี่ยนได้วันละ 1 ครั้ง</p>
                    <div class="edit-actions">
                        <button class="cancel-btn" onclick="toggleEditSection('username')">ยกเลิก</button>
                        <button class="save-btn" onclick="saveUsername()">บันทึกชื่อผู้ใช้</button>
                    </div>
                </div>

                <!-- Section: Change Password -->
                <div id="editPasswordForm" class="edit-section-container" style="display: none;">
                    <div class="edit-group">
                        <label>Current Password</label>
                        <input type="password" id="oldPassword" placeholder="รหัสผ่านปัจจุบัน">
                    </div>
                    <div class="edit-group">
                        <label>New Password</label>
                        <input type="password" id="newPassword" placeholder="รหัสผ่านใหม่">
                    </div>
                    <p class="edit-note">* เปลี่ยนได้วันละ 1 ครั้ง</p>
                    <div class="edit-actions">
                        <button class="cancel-btn" onclick="toggleEditSection('password')">ยกเลิก</button>
                        <button class="save-btn" onclick="savePassword()">เปลี่ยนรหัสผ่าน</button>
                    </div>
                </div>
            </div>
        `;

        // Setup Image Upload
        setTimeout(() => {
            const upload = document.getElementById('profileUpload');
            if (upload) {
                upload.onchange = async function (e) {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = async function (event) {
                            const base64Image = event.target.result;
                            const profileImg = document.querySelector('.profile-img');
                            if (profileImg) profileImg.src = base64Image;
                            await updateProfileImage(base64Image);
                        };
                        reader.readAsDataURL(file);
                    }
                };
            }
        }, 300);
    } else {
        showToast("กรุณาเข้าสู่ระบบก่อนใช้งาน", "warning");
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1500);
    }
});

function toggleEditSection(type) {
    const usernameForm = document.getElementById('editUsernameForm');
    const passwordForm = document.getElementById('editPasswordForm');
    if (!usernameForm || !passwordForm) return;

    if (type === 'username') {
        const isHidden = usernameForm.style.display === 'none';
        usernameForm.style.display = isHidden ? 'flex' : 'none';
        passwordForm.style.display = 'none';
    } else if (type === 'password') {
        const isHidden = passwordForm.style.display === 'none';
        passwordForm.style.display = isHidden ? 'flex' : 'none';
        usernameForm.style.display = 'none';
    }
}

async function updateProfileImage(base64) {
    const userData = JSON.parse(localStorage.getItem('userSession'));
    try {
        const result = await API.request('updateUser', {
            subAction: 'image',
            oldUsername: userData.username,
            imageFile: base64
        });

        if (result.success) {
            userData.image = result.newImage;
            localStorage.setItem('userSession', JSON.stringify(userData));
            showToast("เปลี่ยนรูปโปรไฟล์สำเร็จ", "success");
        } else {
            showToast(result.message, "error");
            setTimeout(() => location.reload(), 1500);
        }
    } catch (error) {
        console.error("Image upload error:", error);
        showToast("ไม่สามารถเปลี่ยนรูปได้: " + error.message, "error");
    }
}

async function saveUsername() {
    const userData = JSON.parse(localStorage.getItem('userSession'));
    const newUsername = document.getElementById('newUsername').value.trim();
    if (!newUsername || newUsername === userData.username) return;

    // We'll proceed with direct save or toast confirmation to keep it modern
    const saveBtn = document.querySelector('#editUsernameForm .save-btn');
    const oriText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerText = "กำลังบันทึก...";

    try {
        const result = await API.request('updateUser', {
            subAction: 'username',
            oldUsername: userData.username,
            newUsername: newUsername
        });

        if (result.success) {
            showToast("เปลี่ยน Username สำเร็จ", "success");
            userData.username = result.newUsername;
            localStorage.setItem('userSession', JSON.stringify(userData));
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast(result.message, "error");
        }
    } catch (e) {
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = oriText;
    }
}

async function savePassword() {
    const userData = JSON.parse(localStorage.getItem('userSession'));
    const oldPass = document.getElementById('oldPassword').value;
    const newPass = document.getElementById('newPassword').value;

    if (!oldPass || !newPass) {
        showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
        return;
    }

    const saveBtn = document.querySelector('#editPasswordForm .save-btn');
    const oriText = saveBtn.innerText;
    saveBtn.disabled = true;
    saveBtn.innerText = "กำลังเปลี่ยน...";

    try {
        const result = await API.request('updateUser', {
            subAction: 'password',
            oldUsername: userData.username,
            oldPassword: oldPass,
            newPassword: newPass
        });

        if (result.success) {
            showToast("เปลี่ยนรหัสผ่านสำเร็จ", "success");
            setTimeout(() => location.reload(), 1500);
        } else {
            showToast(result.message, "error");
        }
    } catch (e) {
        showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = oriText;
    }
}

// ฟังก์ชันสำหรับเตะออกจากระบบ
function logout() {
    // ลบข้อมูล LocalStorage ทิ้ง
    localStorage.removeItem('userSession');
    // เด้งกลับไปหน้า Home/Login
    window.location.href = '/index.html';
}
