/**
 * @OnlyCurrentDoc
 */
function authorizeDrive() {
  // ฟังก์ชันเพื่อให้ Google Apps Script ขอสิทธิ์ Drive API ขั้นสูง (Advanced Service)
  // กรุณากดปุ่ม "เรียกใช้ (Run)" ฟังก์ชันนี้ 1 ครั้ง เพื่อให้เด้งหน้าต่างขอสิทธิ์
  Drive.Files.list({ pageSize: 1 });
}

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Setup สำหรับ Users
  let sheetUsers = ss.getSheetByName('Users');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet('Users');
    sheetUsers.appendRow(['FirstName', 'LastName', 'Username', 'Phone', 'Password', 'Image', 'LastUpdate']);
  } else if (sheetUsers.getLastRow() > 0) {
    let headers = sheetUsers.getRange(1, 1, 1, sheetUsers.getLastColumn()).getValues()[0];
    if (headers.indexOf('LastUpdate') === -1) {
      sheetUsers.getRange(1, sheetUsers.getLastColumn() + 1).setValue('LastUpdate');
    }
  } else if (sheetUsers.getLastRow() === 0) {
    sheetUsers.appendRow(['FirstName', 'LastName', 'Username', 'Phone', 'Password', 'Image', 'LastUpdate']);
  }

  // Setup สำหรับ Lost & Found
  let sheetLF = ss.getSheetByName('LostFound');
  if (!sheetLF) {
    sheetLF = ss.insertSheet('LostFound');
    sheetLF.appendRow(['Timestamp', 'Type', 'ItemName', 'Date', 'Location', 'Details', 'Image', 'PosterName', 'PosterPhone']);
  } else if (sheetLF.getLastRow() > 0) {
    let headers = sheetLF.getRange(1, 1, 1, sheetLF.getLastColumn()).getValues()[0];
    const requiredHeaders = ['Image', 'PosterName', 'PosterPhone'];
    requiredHeaders.forEach(h => {
      if (headers.indexOf(h) === -1) {
        sheetLF.getRange(1, sheetLF.getLastColumn() + 1).setValue(h);
        headers.push(h); // Update local headers list
      }
    });
  } else if (sheetLF.getLastRow() === 0) {
    sheetLF.appendRow(['Timestamp', 'Type', 'ItemName', 'Date', 'Location', 'Details', 'Image', 'PosterName', 'PosterPhone']);
  }

  // Setup สำหรับ News
  let sheetNews = ss.getSheetByName('News');
  if (!sheetNews) {
    sheetNews = ss.insertSheet('News');
    sheetNews.appendRow(['Timestamp', 'Title', 'Category', 'CategoryName', 'Date', 'Description', 'Source', 'Link', 'ImageUrl']);
  } else if (sheetNews.getLastRow() === 0) {
    sheetNews.appendRow(['Timestamp', 'Title', 'Category', 'CategoryName', 'Date', 'Description', 'Source', 'Link', 'ImageUrl']);
  }

  // Setup สำหรับ MapPins
  let sheetMap = ss.getSheetByName('MapPins');
  if (!sheetMap) {
    sheetMap = ss.insertSheet('MapPins');
    sheetMap.appendRow(['Timestamp', 'Title', 'Description', 'X', 'Y', 'PosterName']);
  } else if (sheetMap.getLastRow() === 0) {
    sheetMap.appendRow(['Timestamp', 'Title', 'Description', 'X', 'Y', 'PosterName']);
  }
}

function doGet(e) {
  return doPost(e);
}

function doPost(e) {
  const action = e.parameter.action;

  try {
    if (action === 'register') {
      return register(e);
    } else if (action === 'login') {
      return login(e);
    } else if (action === 'checkUser') {
      return checkUser(e);
    } else if (action === 'resetPassword') {
      return resetPassword(e);
    } else if (action === 'addLostFound') {
      return addLostFound(e);
    } else if (action === 'getLostFound') {
      return getLostFound(e);
    } else if (action === 'deleteLostFound') {
      return deleteLostFound(e);
    } else if (action === 'getNews') {
      return getNews(e);
    } else if (action === 'updateUser') {
      return updateUser(e);
    } else if (action === 'addMapPin') {
      return addMapPin(e);
    } else if (action === 'getMapPins') {
      return getMapPins(e);
    } else if (action === 'deleteMapPin') {
      return deleteMapPin(e);
    }
  } catch (err) {
    return createResponse({ success: false, message: err.message });
  }

  return createResponse({ success: false, message: "Invalid action" });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- ฟังก์ชันใหม่สำหรับ Lost & Found ---
function addLostFound(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('LostFound');

    if (!sheet) {
      sheet = ss.insertSheet('LostFound');
      sheet.appendRow(['Timestamp', 'Type', 'ItemName', 'Date', 'Location', 'Details', 'Image', 'PosterName', 'PosterPhone']);
    }

    let imageUrl = "";
    if (e.parameter.imageFile) {
      try {
        const folderId = "1yPkAoEQagiAnhESITOZ9is5Tg6DSQSUW";
        const splitBase = e.parameter.imageFile.split(',');
        const type = splitBase[0].split(';')[0].replace('data:', '');
        const byteCharacters = Utilities.base64Decode(splitBase[1]);
        const fileName = "LF_" + e.parameter.name + "_" + new Date().getTime();
        const blob = Utilities.newBlob(byteCharacters, type, fileName);

        let fileMetadata = {
          name: fileName,
          mimeType: type,
          parents: [folderId]
        };

        const createdFile = Drive.Files.create(fileMetadata, blob, { fields: "id, webViewLink" });

        Drive.Permissions.create({
          role: "reader",
          type: "anyone"
        }, createdFile.id);

        imageUrl = createdFile.webViewLink;
      } catch (err) {
        console.error("Error uploading image:", err.message);
        // ถ้าโหลดรูปไม่สำเร็จ ให้บันทึกข้อมูลอื่นต่อโดยไม่มีรูป
      }
    }

    sheet.appendRow([
      e.parameter.timestamp,
      e.parameter.type,
      e.parameter.name,
      e.parameter.date,
      e.parameter.location,
      e.parameter.details,
      imageUrl,
      e.parameter.posterName,
      e.parameter.posterPhone
    ]);

    return createResponse({ success: true, message: "เพิ่มข้อมูลสิ่งของสำเร็จ" });
  } catch (error) {
    return createResponse({ success: false, message: "เกิดข้อผิดพลาดในการบันทึก: " + error.message });
  }
}

function getLostFound(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('LostFound');
    if (!sheet) return createResponse({ success: true, data: [] });

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const data = [];

    for (let i = 1; i < values.length; i++) {
      let row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      data.push(row);
    }

    // เรียงจากใหม่ไปเก่า (อิงตาม Timestamp หรือลำดับแถว)
    data.reverse();

    return createResponse({ success: true, data: data });
  } catch (error) {
    return createResponse({ success: false, message: "เกิดข้อผิดพลาดในการดึงข้อมูล: " + error.message });
  }
}

function deleteLostFound(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('LostFound');
    if (!sheet) return createResponse({ success: false, message: "ไม่พบชีตข้อมูล" });

    const timestamp = e.parameter.timestamp;
    const posterName = e.parameter.posterName;

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      // ตรวจสอบทั้ง Timestamp และ PosterName เพื่อความปลอดภัย
      if (String(values[i][0]) === String(timestamp) && String(values[i][7]) === String(posterName)) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true, message: "ลบประกาศเรียบร้อยแล้ว" });
      }
    }

    return createResponse({ success: false, message: "ไม่พบรายการที่ต้องการลบ หรือคุณไม่ใช่เจ้าของประกาศ" });
  } catch (error) {
    return createResponse({ success: false, message: "เกิดข้อผิดพลาดในการลบ: " + error.message });
  }
}

function getNews(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('News');
    if (!sheet) return createResponse({ success: true, data: [] });

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const data = [];

    for (let i = 1; i < values.length; i++) {
      let row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      data.push(row);
    }

    // เรียงจากใหม่ไปเก่า
    data.reverse();

    return createResponse({ success: true, data: data });
  } catch (error) {
    return createResponse({ success: false, message: "เกิดข้อผิดพลาดในการดึงข่าว: " + error.message });
  }
}

function updateUser(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Users');
    const data = sheet.getDataRange().getValues();
    const oldUsername = e.parameter.oldUsername;
    const subAction = e.parameter.subAction; // 'image', 'username', 'password'

    let userRowIndex = -1;
    let currentUserData = null;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][2]).trim() === oldUsername.trim()) {
        userRowIndex = i + 1;
        currentUserData = data[i];
        break;
      }
    }

    if (userRowIndex === -1) return createResponse({ success: false, message: "ไม่พบผู้ใช้งาน" });

    const now = getThailandDate(true);
    const today = getThailandDate();

    // --- ตรวจสอบ Cooldown (ยกเว้นเปลี่ยนรูปภาพ ที่อนุญาตให้เปลี่ยนได้บ่อยกว่า หรือตามต้องการ แต่ในที่นี้จะอนุญาตให้รูปภาพเปลี่ยนได้อิสระ) ---
    if (subAction === 'username' || subAction === 'password') {
      const lastUpdateStr = currentUserData[6];
      if (lastUpdateStr) {
        const lastUpdate = String(lastUpdateStr).split(' ')[0];
        if (lastUpdate === today) {
          return createResponse({ success: false, message: "คุณสามารถแก้ไข Username หรือ Password ได้วันละ 1 ครั้งเท่านั้น" });
        }
      }
    }

    if (subAction === 'image') {
      // --- อัปเดตเฉพาะรูปภาพ ---
      if (!e.parameter.imageFile) return createResponse({ success: false, message: "ไม่พบไฟล์รูปภาพ" });
      
      const folderId = "1_OvDxs49wRdqd99esA_6fggEr43r4mCM";
      const splitBase = e.parameter.imageFile.split(',');
      const type = splitBase[0].split(';')[0].replace('data:', '');
      const byteCharacters = Utilities.base64Decode(splitBase[1]);
      const fileName = oldUsername + "_profile_" + new Date().getTime();
      const blob = Utilities.newBlob(byteCharacters, type, fileName);

      let fileMetadata = { name: fileName, mimeType: type, parents: [folderId] };
      const createdFile = Drive.Files.create(fileMetadata, blob, { fields: "id, webViewLink" });
      Drive.Permissions.create({ role: "reader", type: "anyone" }, createdFile.id);

      const newImageUrl = createdFile.webViewLink;
      sheet.getRange(userRowIndex, 6).setValue(newImageUrl);
      
      return createResponse({ success: true, message: "เปลี่ยนรูปโปรไฟล์สำเร็จ", newImage: newImageUrl });

    } else if (subAction === 'username') {
      // --- อัปเดต Username ---
      const newUsername = e.parameter.newUsername;
      if (!newUsername || newUsername === oldUsername) return createResponse({ success: false, message: "Username ใหม่ต้องไม่ว่างและไม่ซ้ำเดิม" });

      // เช็คซ้ำกับคนอื่น
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][2]).trim() === newUsername.trim()) {
          return createResponse({ success: false, message: "Username นี้มีผู้ใช้งานแล้ว" });
        }
      }

      sheet.getRange(userRowIndex, 3).setValue(newUsername);
      sheet.getRange(userRowIndex, 7).setValue(now);

      // ตามไปแก้ใน LostFound
      const sheetLF = ss.getSheetByName('LostFound');
      if (sheetLF) {
        const lfValues = sheetLF.getDataRange().getValues();
        for (let i = 1; i < lfValues.length; i++) {
          if (String(lfValues[i][7]) === oldUsername) {
            sheetLF.getRange(i + 1, 8).setValue(newUsername);
          }
        }
      }

      return createResponse({ success: true, message: "เปลี่ยน Username สำเร็จ", newUsername: newUsername });

    } else if (subAction === 'password') {
      // --- อัปเดต Password ---
      const oldPasswordParam = e.parameter.oldPassword;
      const newPassword = e.parameter.newPassword;
      const storedPassword = String(currentUserData[4]);

      if (storedPassword !== oldPasswordParam) {
        return createResponse({ success: false, message: "รหัสผ่านเดิมไม่ถูกต้อง" });
      }

      if (!newPassword || newPassword.length < 4) {
        return createResponse({ success: false, message: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร" });
      }

      sheet.getRange(userRowIndex, 5).setValue(newPassword);
      sheet.getRange(userRowIndex, 7).setValue(now);

      return createResponse({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    }

    return createResponse({ success: false, message: "Sub-action ไม่ถูกต้อง" });

  } catch (error) {
    console.error("updateUser error:", error.message);
    return createResponse({ success: false, message: "เกิดข้อผิดพลาด: " + error.message });
  }
}

function addMapPin(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('MapPins');
    if (!sheet) {
      sheet = ss.insertSheet('MapPins');
      sheet.appendRow(['Timestamp', 'Title', 'Description', 'X', 'Y', 'PosterName']);
    }

    sheet.appendRow([
      e.parameter.timestamp,
      e.parameter.title,
      e.parameter.description,
      e.parameter.x,
      e.parameter.y,
      e.parameter.posterName
    ]);

    return createResponse({ success: true, message: "ปักหมุดสำเร็จ" });
  } catch (err) {
    return createResponse({ success: false, message: err.message });
  }
}

function getMapPins(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('MapPins');
    if (!sheet) return createResponse({ success: true, data: [] });

    const values = sheet.getDataRange().getValues();
    const headers = values[0];
    const data = [];

    for (let i = 1; i < values.length; i++) {
      let row = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[i][j];
      }
      data.push(row);
    }

    return createResponse({ success: true, data: data });
  } catch (err) {
    return createResponse({ success: false, message: err.message });
  }
}

function deleteMapPin(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('MapPins');
    if (!sheet) return createResponse({ success: false, message: "ไม่พบชีตข้อมูล" });

    const timestamp = e.parameter.timestamp;
    const posterName = e.parameter.posterName;

    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][0]) === String(timestamp) && String(values[i][5]) === String(posterName)) {
        sheet.deleteRow(i + 1);
        return createResponse({ success: true, message: "ลบประกาศเรียบร้อยแล้ว" });
      }
    }

    return createResponse({ success: false, message: "ไม่พบรายการที่ต้องการลบ หรือคุณไม่ใช่เจ้าของประกาศ" });
  } catch (err) {
    return createResponse({ success: false, message: err.message });
  }
}

function getThailandDate(withTime = false) {
  const now = new Date();
  const options = { timeZone: "Asia/Bangkok", year: 'numeric', month: '2-digit', day: '2-digit' };
  if (withTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
    options.second = '2-digit';
    options.hour12 = false;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD
  let parts = formatter.formatToParts(now);
  let dateStr = `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}-${parts.find(p => p.type === 'day').value}`;

  if (withTime) {
    dateStr += ` ${parts.find(p => p.type === 'hour').value}:${parts.find(p => p.type === 'minute').value}:${parts.find(p => p.type === 'second').value}`;
  }

  return dateStr;
}

// --- ฟังก์ชันเดิม (Users) ---
function register(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');

  // ตรวจสอบว่ามี username นี้หรือยัง
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim() === String(e.parameter.username).trim()) {
      return createResponse({ success: false, message: "Username already exists (มีชื่อผู้ใช้นี้แล้วในระบบ)" });
    }
  }

  let imageUrl = "";
  if (e.parameter.imageFile) {
    try {
      const folderId = "1_OvDxs49wRdqd99esA_6fggEr43r4mCM";
      const splitBase = e.parameter.imageFile.split(',');
      const type = splitBase[0].split(';')[0].replace('data:', '');
      const byteCharacters = Utilities.base64Decode(splitBase[1]);
      const blob = Utilities.newBlob(byteCharacters, type, e.parameter.username + "_profile");

      let fileMetadata = {
        name: e.parameter.username + "_profile",
        mimeType: type,
        parents: [folderId]
      };

      const createdFile = Drive.Files.create(fileMetadata, blob, { fields: "id, webViewLink" });

      Drive.Permissions.create({
        role: "reader",
        type: "anyone"
      }, createdFile.id);

      imageUrl = createdFile.webViewLink;
    } catch (err) {
      return createResponse({ success: false, message: "Error uploading image: " + err.message });
    }
  }

  sheet.appendRow([
    e.parameter.firstName,
    e.parameter.lastName,
    e.parameter.username,
    e.parameter.phone,
    e.parameter.password,
    imageUrl
  ]);

  return createResponse({ success: true, message: "สมัครสมาชิกสำเร็จ" });
}

function login(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim() === String(e.parameter.username).trim() &&
      String(data[i][4]).trim() === String(e.parameter.password).trim()) {
      return createResponse({
        success: true,
        message: "เข้าสู่ระบบสำเร็จ",
        user: {
          firstName: data[i][0],
          lastName: data[i][1],
          username: data[i][2],
          phone: data[i][3],
          image: data[i][5]
        }
      });
    }
  }

  return createResponse({ success: false, message: "Invalid username or password (ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง)" });
}

function checkUser(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === e.parameter.firstName && data[i][1] === e.parameter.lastName) {
      return createResponse({ success: true, message: "พบข้อมูลผู้ใช้" });
    }
  }

  return createResponse({ success: false, message: "ไม่พบข้อมูลชื่อและนามสกุลนี้ในระบบ" });
}

function resetPassword(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === e.parameter.firstName && data[i][1] === e.parameter.lastName) {
      sheet.getRange(i + 1, 5).setValue(e.parameter.newPassword);
      return createResponse({ success: true, message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    }
  }

  return createResponse({ success: false, message: "ไม่พบข้อมูลผู้ใช้ (เปลี่ยนรหัสผ่านไม่สำเร็จ)" });
}