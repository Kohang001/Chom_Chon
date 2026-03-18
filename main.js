function toggleForm(formId) {
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    document.getElementById(formId).classList.add('active');

    // รีเซ็ตหน้าลืมรหัสผ่านให้กลับไปอยู่สเตปแรกเสมอเมื่อถูกเปิด
    if (formId === 'forgotForm') {
        document.getElementById('fgStep1').style.display = 'block';
        document.getElementById('fgStep2').style.display = 'none';
        document.getElementById('fgFirst').value = '';
        document.getElementById('fgLast').value = '';
        document.getElementById('fgPhone').value = '';
        document.getElementById('fgNewPass').value = '';
        document.getElementById('fgNewPassCon').value = '';
    }
}

// --- Phone Formatting Helper ---
function formatPhoneNumber(value) {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`;
    }
    return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
}

function setupPhoneInputs() {
    const phoneInputs = ['regPhone', 'fgPhone'];
    phoneInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                const formattedValue = formatPhoneNumber(e.target.value);
                el.value = formattedValue;
            });
        }
    });
}
document.addEventListener('DOMContentLoaded', setupPhoneInputs);

// --- Password Complexity Checker ---
function isStrongPassword(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
}

async function login() {
    const user = document.getElementById('logUser').value.trim();
    const pass = document.getElementById('logPass').value;
    if (!user || !pass) return showToast("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน", "warning");
    if (user.length < 3) return showToast("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร", "warning");

    const btn = document.querySelector('#loginForm button');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังเข้าสู่ระบบ...';
    btn.disabled = true;

    try {
        const result = await API.request('login', { username: user, password: pass });

        if (result.success) {
            showToast("เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ " + result.user.firstName, "success");

            const userData = {
                firstName: result.user.firstName,
                lastName: result.user.lastName,
                username: result.user.username,
                phone: result.user.phone,
                image: result.user.image,
                token: result.token
            };
            localStorage.setItem('userSession', JSON.stringify(userData));

            setTimeout(() => { window.location.href = '/HTML/news.html'; }, 1500);
        } else {
            showToast(result.message, "error");
        }
    } catch (error) {
        showToast("ไม่สามารถเข้าสู่ระบบได้: " + error.message, "error");
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

    const phoneRaw = phone.replace(/[^\d]/g, '');

    if (!firstName || !lastName || !username || !phone || !pass) return showToast("กรุณากรอกข้อมูลให้ครบ", "warning");
    if (phoneRaw.length !== 10 || !phoneRaw.startsWith('0')) return showToast("เบอร์โทรศัพท์ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0 และมี 10 หลัก)", "warning");
    if (!isStrongPassword(pass)) return showToast("รหัสผ่านไม่ปลอดภัยพอ (ต้องมี 8+ ตัวอักษร, พิมพ์ใหญ่, พิมพ์เล็ก, ตัวเลข และอักขระพิเศษ)", "warning");
    if (pass !== passCon) return showToast("รหัสผ่านไม่ตรงกัน", "warning");

    if (!CONFIG.SCRIPT_URL || CONFIG.SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
        return showToast("กรุณาตรวจสอบการตั้งค่า CONFIG.SCRIPT_URL", "error");
    }

    const btn = document.querySelector('#signupForm button');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังสมัครสมาชิก...';
    btn.disabled = true;

    try {
        let base64Image = "";
        if (imgInput.files && imgInput.files[0]) {
            const file = imgInput.files[0];
            if (file.size > 5 * 1024 * 1024) {
                showToast("ไฟล์ภาพใหญ่เกินไป กรุณาใช้ไฟล์ขนาดไม่เกิน 5MB", "warning");
                throw new Error("ขนาดไฟล์ใหญ่เกินไป");
            }

            base64Image = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
        }

        const result = await API.request('register', {
            firstName: firstName,
            lastName: lastName,
            username: username,
            phone: phoneRaw,
            password: pass,
            imageFile: base64Image
        });

        if (result.success) {
            showToast("สมัครสมาชิกสำเร็จ", "success");
            toggleForm('loginForm');
        } else {
            showToast(result.message, "error");
        }
    } catch (error) {
        if (error.message !== "ขนาดไฟล์ใหญ่เกินไป") {
            showToast("ไม่สามารถสมัครสมาชิกได้: " + error.message, "error");
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
    const phone = document.getElementById('fgPhone').value.trim();
    const phoneRaw = phone.replace(/[^\d]/g, '');

    if (!firstName || !lastName || !phone) return showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
    if (phoneRaw.length !== 10 || !phoneRaw.startsWith('0')) return showToast("เบอร์โทรศัพท์ไม่ถูกต้อง", "warning");

    const btn = document.getElementById('btnCheckUser');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังตรวจสอบ...';
    btn.disabled = true;

    try {
        const result = await API.request('checkUser', {
            firstName: firstName,
            lastName: lastName,
            phone: phoneRaw
        });

        if (result.success) {
            document.getElementById('fgStep1').style.display = 'none';
            document.getElementById('fgStep2').style.display = 'block';
        } else {
            showToast(result.message, "error");
        }
    } catch (error) {
        showToast("เกิดข้อผิดพลาด: " + error.message, "error");
    } finally {
        btn.innerText = oriText;
        btn.disabled = false;
    }
}

// ฟังก์ชันลืมรหัสผ่าน Step 2: บันทึกรหัสผ่านใหม่
async function resetPassword() {
    const firstName = document.getElementById('fgFirst').value.trim();
    const lastName = document.getElementById('fgLast').value.trim();
    const phone = document.getElementById('fgPhone').value.trim();
    const phoneRaw = phone.replace(/[^\d]/g, '');
    const newPassword = document.getElementById('fgNewPass').value;
    const newPasswordCon = document.getElementById('fgNewPassCon').value;

    if (!newPassword || !newPasswordCon) return showToast("กรุณากรอกรหัสผ่านใหม่ให้ครบถ้วน", "warning");
    if (!isStrongPassword(newPassword)) return showToast("รหัสผ่านใหม่ไม่ปลอดภัยพอ", "warning");
    if (newPassword !== newPasswordCon) return showToast("รหัสผ่านใหม่ไม่ตรงกัน", "warning");

    const btn = document.getElementById('btnResetPass');
    const oriText = btn.innerText;
    btn.innerText = 'กำลังบันทึก...';
    btn.disabled = true;

    try {
        const result = await API.request('resetPassword', {
            firstName: firstName,
            lastName: lastName,
            phone: phoneRaw,
            newPassword: newPassword
        });

        if (result.success) {
            showToast("เปลี่ยนรหัสผ่านสำเร็จ", "success");
            toggleForm('loginForm');
        } else {
            showToast(result.message, "error");
        }
    } catch (error) {
        showToast("เกิดข้อผิดพลาด: " + error.message, "error");
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