// Hamburger Menu Toggle
document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', function () {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function () {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Close menu when clicking outside
        document.addEventListener('click', function (event) {
            const isClickInsideNav = navMenu.contains(event.target);
            const isClickOnHamburger = hamburger.contains(event.target);

            if (!isClickInsideNav && !isClickOnHamburger && navMenu.classList.contains('active')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
});

// --- SOS Emergency System ---
async function requestEmergencyHelp() {
    const sosBtn = document.getElementById('confirmSosBtn');
    const sosModal = document.getElementById('sosModal');
    
    // Check if user is logged in
    const userDataStr = localStorage.getItem('userSession');
    if (!userDataStr) {
        showToast("กรุณาเข้าสู่ระบบก่อนใช้งานระบบช่วยเหลือฉุกเฉิน", "warning");
        window.location.href = '/index.html';
        return;
    }
    
    const userData = JSON.parse(userDataStr);

    if (!navigator.geolocation) {
        showToast("อุปกรณ์ของคุณไม่รองรับการระบุตำแหน่ง (GPS)", "error");
        return;
    }

    // Set loading state
    sosBtn.disabled = true;
    sosBtn.innerHTML = 'กำลังค้นหาตำแหน่งและส่งข้อมูล...';

    navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        try {
            const result = await API.request('addEmergency', {
                timestamp: new Date().toLocaleString('th-TH'),
                profileName: userData.firstName + ' ' + userData.lastName + ' (@' + userData.username + ')',
                phone: userData.phone || 'ไม่ระบุเบอร์',
                lat: lat,
                lng: lng
            });

            if (result.success) {
                showToast("ระบบได้รับสัญญาณขอความช่วยเหลือแล้ว ศูนย์ช่วยเหลือส่วนกลางกำลังเข้าตรวจสอบตำแหน่งของคุณ", "success");
                sosModal.classList.remove('show');
            } else {
                showToast("ไม่สามารถส่งข้อมูลได้: " + result.message, "error");
            }
        } catch (error) {
            console.error(error);
            showToast("ขัดข้องในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง หรือโทรแจ้งสายด่วน", "error");
        } finally {
            sosBtn.disabled = false;
            sosBtn.innerHTML = 'ส่งสัญญาณขอความช่วยเหลือ';
        }
    }, (error) => {
        let msg = "ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตให้เข้าถึง GPS";
        if (error.code === 1) msg = "คุณปฏิเสธการให้สิทธิ์เข้าถึงตำแหน่ง (GPS)";
        else if (error.code === 2) msg = "สัญญาณ GPS ขัดข้อง หรือไม่พร้อมใช้งาน";
        else if (error.code === 3) msg = "หมดเวลาในการค้นหาตำแหน่ง (Timeout)";
        
        showToast(msg, "warning");
        sosBtn.disabled = false;
        sosBtn.innerHTML = 'ส่งสัญญาณขอความช่วยเหลือ';
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
}

/**
 * Logout system
 */
function logout() {
    localStorage.removeItem('userSession');
    showToast("กำลังออกจากระบบ...", "info");
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 1000);
}
