// หน้า MAP - สำหรับแสดงแผนที่ชุมชน
let session = JSON.parse(localStorage.getItem('session'));

window.onload = () => {
    if (!session || new Date(session.expireAt) < new Date()) {
        alert("Session หมดอายุหรือยังไม่ได้เข้าสู่ระบบ");
        window.location.href = 'Index.html';
    }
};

function toggleSettings() {
    // นำ UI Settings มาใส่หากต้องการ
    console.log('Settings menu');
}