const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSZF-yh74Miq4cXom8m98IrTNiqVS2Ew7jHcA2USe3eD3zmNGQc0auSCpLV38P90Xi/exec';

function toggleForm(formId) {
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    document.getElementById(formId).classList.add('active');

    // รีเซ็ตหน้าลืมรหัสผ่านให้กลับไปอยู่สเตปแรกเสมอเมื่อถูกเปิด
    if (formId === 'forgotForm') {
        document.getElementById('fgStep1').style.display = 'block';
        document.getElementById('fgStep2').style.display = 'none';
        document.getElementById('fgFirst').value = '';
        document.getElementById('fgLast').value = '';
        document.getElementById('fgNewPass').value = '';
        document.getElementById('fgNewPassCon').value = '';
    }
}

async function login() {
    const user = document.getElementById('logUser').value.trim();
    const pass = document.getElementById('logPass').value;
    if (!user || !pass) return alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
    if (user.length < 3) return alert("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร");

    const btn = document.querySelector('#loginForm button');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังเข้าสู่ระบบ...';
    btn.disabled = true;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({ action: 'login', username: user, password: pass })
        });
        const result = await response.json();

        if (result.success) {
            alert("เข้าสู่ระบบสำเร็จ! ยินดีต้อนรับคุณ " + result.user.firstName);

            // สร้างเป็น JSON Object และบันทึกลง LocalStorage (เปรียบเสมือนไฟล์เซฟในเบราว์เซอร์)
            const userData = {
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                username: result.user.username,
                phone: result.user.phone,
                image: result.user.image
            };
            localStorage.setItem('userSession', JSON.stringify(userData));

            window.location.href = '/HTML/news.html'; // เปลี่ยนไปหน้า news.html ตามที่คุณต้องการ
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message);
    } finally {
        btn.innerText = oriText;
        btn.disabled = false;
    }
}

async function register() {
    const firstName = document.getElementById('regFirst').value.trim();
    const lastName = document.getElementById('regLast').value.trim();
    const username = document.getElementById('regUser').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pass = document.getElementById('regPass').value;
    const passCon = document.getElementById('regPassCon').value;
    const imgInput = document.getElementById('regImg');

    if (!firstName || !lastName || !username || !phone || !pass) return alert("กรุณากรอกข้อมูลให้ครบ");
    if (phone.length !== 10 || isNaN(phone)) return alert("เบอร์ต้องเป็นตัวเลข 10 หลัก");
    if (pass.length < 5) return alert("รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร");
    if (pass !== passCon) return alert("รหัสผ่านไม่ตรงกัน");

    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        return alert("กรุณาใส่ SCRIPT_URL ในไฟล์ main.js ก่อนใช้งาน");
    }

    const btn = document.querySelector('#signupForm button');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังสมัครสมาชิก...';
    btn.disabled = true;

    try {
        let base64Image = "";
        if (imgInput.files && imgInput.files[0]) {
            const file = imgInput.files[0];
            // ตรวจสอบขนาดไฟล์ไม่เกิน 5MB (ตัวเลือก)
            if (file.size > 5 * 1024 * 1024) {
                alert("ไฟล์ภาพใหญ่เกินไป กรุณาใช้ไฟล์ขนาดไม่เกิน 5MB");
                throw new Error("ขนาดไฟล์ใหญ่เกินไป");
            }

            // อ่านไฟล์เป็น Base64
            base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'register',
                firstName: firstName,
                lastName: lastName,
                username: username,
                phone: phone,
                password: pass,
                imageFile: base64Image
            })
        });
        const result = await response.json();

        if (result.success) {
            alert("สมัครสมาชิกสำเร็จ!");
            toggleForm('loginForm');
        } else {
            alert(result.message);
        }
    } catch (error) {
        if (error.message !== "ขนาดไฟล์ใหญ่เกินไป") {
            alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message);
        }
    } finally {
        btn.innerText = oriText;
        btn.disabled = false;
    }
}

// ฟังก์ชันลืมรหัสผ่าน Step 1: เช็คชื่อจริงและนามสกุล
async function checkUserExists() {
    const firstName = document.getElementById('fgFirst').value.trim();
    const lastName = document.getElementById('fgLast').value.trim();

    if (!firstName || !lastName) return alert("กรุณากรอกชื่อจริงและนามสกุล");

    if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        return alert("กรุณาใส่ SCRIPT_URL ในไฟล์ main.js ก่อนใช้งาน");
    }

    const btn = document.getElementById('btnCheckUser');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังตรวจสอบ...';
    btn.disabled = true;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'checkUser',
                firstName: firstName,
                lastName: lastName
            })
        });
        const result = await response.json();

        if (result.success) {
            // ซ่อน step 1, แสดง step 2
            document.getElementById('fgStep1').style.display = 'none';
            document.getElementById('fgStep2').style.display = 'block';
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message);
    } finally {
        btn.innerText = oriText;
        btn.disabled = false;
    }
}

// ฟังก์ชันลืมรหัสผ่าน Step 2: บันทึกรหัสผ่านใหม่
async function resetPassword() {
    const firstName = document.getElementById('fgFirst').value.trim();
    const lastName = document.getElementById('fgLast').value.trim();
    const newPassword = document.getElementById('fgNewPass').value;
    const newPasswordCon = document.getElementById('fgNewPassCon').value;

    if (!newPassword || !newPasswordCon) return alert("กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน");
    if (newPassword.length < 5) return alert("รหัสผ่านใหม่ต้องมีอย่างน้อย 5 ตัวอักษร");
    if (newPassword !== newPasswordCon) return alert("รหัสผ่านใหม่ไม่ตรงกัน");

    const btn = document.getElementById('btnResetPass');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังบันทึก...';
    btn.disabled = true;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: new URLSearchParams({
                action: 'resetPassword',
                firstName: firstName,
                lastName: lastName,
                newPassword: newPassword
            })
        });
        const result = await response.json();

        if (result.success) {
            alert("เปลี่ยนรหัสผ่านสำเร็จ!");
            toggleForm('loginForm');
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเชื่อมต่อ: " + error.message);
    } finally {
        btn.innerText = oriText;
        btn.disabled = false;
    }
}

// preview image
document.getElementById("regImg").addEventListener("change", function () {

    const file = this.files[0];
    const preview = document.getElementById("previewImg");
    const placeholder = document.getElementById("imgPlaceholder");

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (e) {
        preview.src = e.target.result;
        preview.style.display = "block";
        placeholder.style.display = "none";
    };

    reader.readAsDataURL(file);

});