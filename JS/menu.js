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
                <img class="profile-img" src="${imgUrl}" alt="Profile">

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
                        <span class="value">@${userData.username}</span>
                    </div>

                    <div class="profile-item">
                        <span class="label">เบอร์</span>
                        <span class="value">${displayPhone}</span>
                    </div>
                </div>

                <button class="logout-btn" onclick="logout()">ออกจากระบบ</button>

            </div>
        `;
    } else {
        // หากไม่มีข้อมูลใน LocalStorage ให้เตะกลับไปหน้า Login อัตโนมัติ
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        window.location.href = '/index.html';
    }
});

// ฟังก์ชันสำหรับเตะออกจากระบบ
function logout() {
    // ลบข้อมูล LocalStorage ทิ้ง
    localStorage.removeItem('userSession');
    // เด้งกลับไปหน้า Home/Login
    window.location.href = '/index.html';
}
