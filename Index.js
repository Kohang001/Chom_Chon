const API_URL = "https://script.google.com/macros/s/AKfycbxFY_tB0a5qVrS2pPCU9wgec-446UeREwREAUtkAwXE3xLvx2d6R7-0VhwYE6Pdih3Lqw/exec"; // **เปลี่ยนเป็น URL ของ Google Apps Script**

function toggleForm(formId) {
    document.querySelectorAll('.form-section').forEach(f => f.classList.remove('active'));
    document.getElementById(formId).classList.add('active');
}

async function apiCall(action, payload) {
    const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action, ...payload })
    });
    return res.json();
}

async function login() {
    const user = document.getElementById('logUser').value.trim();
    const pass = document.getElementById('logPass').value;
    if (!user || !pass) return alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
    if (user.length < 3) return alert("ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร");

    try {
        const res = await apiCall('login', { username: user, password: pass });
        if (res.success) {
            localStorage.setItem('session', JSON.stringify(res.session));
            window.location.href = 'News.html';
        } else {
            alert(res.message || "เข้าสู่ระบบไม่สำเร็จ");
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

async function register() {
    const firstName = document.getElementById('regFirst').value.trim();
    const lastName = document.getElementById('regLast').value.trim();
    const username = document.getElementById('regUser').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const pass = document.getElementById('regPass').value;
    const passCon = document.getElementById('regPassCon').value;
    
    if (!firstName || !lastName || !username || !phone || !pass) {
        return alert("กรุณากรอกข้อมูลให้ครบ");
    }
    if (phone.length !== 10 || isNaN(phone)) {
        return alert("เบอร์ต้องเป็นตัวเลข 10 หลัก");
    }
    if (pass.length < 5) {
        return alert("รหัสผ่านต้องมีอย่างน้อย 5 ตัวอักษร");
    }
    if (pass !== passCon) {
        return alert("รหัสผ่านไม่ตรงกัน");
    }

    try {
        const fileInput = document.getElementById('regImg');
        let base64 = "";
        if (fileInput.files.length > 0) {
            base64 = await toBase64(fileInput.files[0]);
        }

        const payload = {
            firstName, lastName, username, phone,
            password: pass,
            imageBase64: base64
        };

        const res = await apiCall('register', payload);
        if (res.success) {
            alert("สมัครสมาชิกสำเร็จ ยินดีต้อนรับ!");
            toggleForm('loginForm');
            document.getElementById('regFirst').value = '';
            document.getElementById('regLast').value = '';
            document.getElementById('regUser').value = '';
            document.getElementById('regPhone').value = '';
            document.getElementById('regPass').value = '';
            document.getElementById('regPassCon').value = '';
        } else {
            alert(res.message || "สมัครสมาชิกไม่สำเร็จ");
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

async function forgotPassword() {
    const firstName = document.getElementById('fgFirst').value.trim();
    const lastName = document.getElementById('fgLast').value.trim();
    const phone = document.getElementById('fgPhone').value.trim();
    const newPassword = document.getElementById('fgNewPass').value;
    
    if (!firstName || !lastName || !phone || !newPassword) {
        return alert("กรุณากรอกข้อมูลให้ครบ");
    }
    if (phone.length !== 10 || isNaN(phone)) {
        return alert("เบอร์ต้องเป็นตัวเลข 10 หลัก");
    }
    if (newPassword.length < 5) {
        return alert("รหัสผ่านใหม่ต้องมีอย่างน้อย 5 ตัวอักษร");
    }
    
    try {
        const payload = { firstName, lastName, phone, newPassword };
        const res = await apiCall('forgotPassword', payload);
        alert(res.message || "รีเซ็ตรหัสผ่านเสร็จสิ้น");
        if (res.success) {
            toggleForm('loginForm');
            document.getElementById('fgFirst').value = '';
            document.getElementById('fgLast').value = '';
            document.getElementById('fgPhone').value = '';
            document.getElementById('fgNewPass').value = '';
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
});