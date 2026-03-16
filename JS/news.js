document.addEventListener('DOMContentLoaded', () => {
    const newsGrid = document.getElementById('newsGrid');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const emptyState = document.getElementById('emptyState');
    const refreshBtn = document.getElementById('refreshBtn');
    const filters = document.querySelectorAll('.filter-btn');

    let allNewsData = [];

    // 1. ดึงเข้าข้อมูลจาก Cache ทันทีเพื่อให้แสดงผลไว
    const loadCache = () => {
        const userDataStr = localStorage.getItem('userSession');
        if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.news && Array.isArray(userData.news)) {
                allNewsData = userData.news;
                renderNews(allNewsData);
                return true;
            }
        }
        return false;
    };

    // 2. ฟังก์ชันดึงข้อมูลจาก Google Apps Script
    async function fetchNewsData() {
        if (allNewsData.length === 0) showLoading(true);

        try {
            const result = await API.request('getNews');

            if (result.success && Array.isArray(result.data)) {
                allNewsData = result.data;

                // อัปเดตลงใน userSession ใน LocalStorage
                const userDataStr = localStorage.getItem('userSession');
                const userData = userDataStr ? JSON.parse(userDataStr) : {};
                userData.news = allNewsData;
                localStorage.setItem('userSession', JSON.stringify(userData));

                renderNews(allNewsData);
            } else {
                console.error("Failed to fetch news:", result.message);
                if (allNewsData.length === 0) {
                    newsGrid.innerHTML = '<p class="empty-text">ไม่สามารถดึงข้อมูลข่าวสารได้</p>';
                }
            }
        } catch (error) {
            console.error("Error fetching news:", error);
            if (allNewsData.length === 0) {
                newsGrid.innerHTML = '<p style="color: red; grid-column: 1/-1; text-align: center;">เกิดข้อผิดพลาดในการเชื่อมต่อ</p>';
            }
        } finally {
            showLoading(false);
        }
    }

    // 3. ฟังก์ชันแสดงผลการ์ดข่าว
    function renderNews(newsArray, filter = 'all') {
        if (!newsGrid) return;

        const filtered = filter === 'all'
            ? newsArray
            : newsArray.filter(n => n.Category === filter);

        if (filtered.length === 0) {
            newsGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        newsGrid.style.display = 'grid';
        newsGrid.innerHTML = '';

        filtered.forEach(news => {
            let imgHtml = "";
            let imgUrl = news.ImageUrl || "";

            // แปลง URL ของ Google Drive ให้เป็น Direct Link (เหมือน LostFound)
            if (imgUrl && imgUrl.includes("drive.google.com")) {
                const matchId = imgUrl.match(/[-\w]{25,}/);
                if (matchId) {
                    const fileId = matchId[0];
                    imgUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
                }
            }

            let formattedDate = "ไม่ระบุวันที่";
            if (news.Date) {
                try {
                    const dateObj = new Date(news.Date);
                    if (!isNaN(dateObj)) {
                        formattedDate = dateObj.toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        });
                    } else {
                        formattedDate = news.Date;
                    }
                } catch (e) {
                    formattedDate = news.Date;
                }
            }

            const card = document.createElement('div');
            card.className = 'news-card';
            
            card.innerHTML = `
                <img src="${imgUrl || 'https://via.placeholder.com/800x400?text=ChomChon+News'}" alt="News Image" class="news-image" onerror="this.src='https://via.placeholder.com/800x400?text=News+Image'">
                <div class="news-content">
                    <div class="news-meta">
                        <span class="news-tag tag-${news.Category || 'general'} safe-cat"></span>
                        <span class="news-date"><span class="safe-date"></span></span>
                    </div>
                    <h3 class="news-title safe-title"></h3>
                    <p class="news-desc safe-desc"></p>
                    <div class="news-footer">
                        <span class="news-source"><span class="safe-source"></span></span>
                        <a href="#" class="btn-read-more url-safe" target="_blank">อ่านต่อ</a>
                    </div>
                </div>
            `;
            
            // XSS Safe Assignments
            card.querySelector('.news-image').alt = news.Title || 'News Image';
            card.querySelector('.safe-cat').textContent = news.CategoryName || 'ข่าวสาร';
            card.querySelector('.safe-date').textContent = formattedDate;
            card.querySelector('.safe-title').textContent = news.Title || 'ไม่มีหัวข้อ';
            card.querySelector('.safe-desc').textContent = news.Description || 'ไม่มีรายละเอียด';
            card.querySelector('.safe-source').textContent = news.Source || 'แหล่งข่าว';
            card.querySelector('.url-safe').href = news.Link || '#';
            
            newsGrid.appendChild(card);
        });
    }

    // ฟังก์ชันกรองข่าว
    function handleFilter(category) {
        renderNews(allNewsData, category);
    }

    // ควบคุมการแสดงสถานะ Loading
    function showLoading(isLoading) {
        if (!loadingIndicator) return;
        if (isLoading) {
            loadingIndicator.style.display = 'block';
            newsGrid.style.display = 'none';
            emptyState.style.display = 'none';
        } else {
            loadingIndicator.style.display = 'none';
        }
    }

    // Event Listeners
    filters.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filters.forEach(b => b.classList.remove('active'));
            const target = e.target.closest('.filter-btn');
            target.classList.add('active');
            handleFilter(target.dataset.filter);
        });
    });

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            fetchNewsData();
        });
    }

    // เริ่มทำงาน
    loadCache();
    fetchNewsData();
});
