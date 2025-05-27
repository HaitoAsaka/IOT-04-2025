let currentPage = 1;
let currentPageSize = 10;
let totalRecords = 0;
let totalPages = 0;

// Hàm lấy ngày hôm nay theo định dạng YYYY-MM-DD
function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function loadHistoryData(page = 1, pageSize = 10) {
  const searchDate = document.getElementById("searchInput").value.trim();
  const searchStatus = document.getElementById("statusInput") ? document.getElementById("statusInput").value.trim() : '';

  let url = `http://localhost:5000/api/history/search?page=${page}&pageSize=${pageSize}`;

  if (searchDate) {
    url += `&date=${encodeURIComponent(searchDate)}`;
  } else {
    url += `&date=${encodeURIComponent(getToday())}`;  // Mặc định ngày hôm nay
  }

  if (searchStatus) {
    url += `&status=${encodeURIComponent(searchStatus)}`;
  }

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || !Array.isArray(data.data)) {
        console.error("Dữ liệu trả về không hợp lệ, thiếu trường 'data' dạng mảng");
        return;
      }

      const tbody = document.querySelector(".data-table tbody");
      tbody.innerHTML = "";

      // Tạo số thứ tự (STT) bắt đầu từ 1 trong trang hiện tại
      // STT tính tổng so với trang hiện tại: (page-1)*pageSize + index +1
      data.data.forEach((item, index) => {
        const stt = (page - 1) * pageSize + index + 1;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${stt}</td>
          <td>${item.name}</td>
          <td><span class="status ${item.status.toLowerCase() === "bật" ? "on" : "off"}">${item.status.toLowerCase() === "bật" ? "Bật" : "Tắt"}</span></td>
          <td>${new Date(item.time).toLocaleString("vi-VN")}</td>
        `;

        tbody.appendChild(row);
      });

      totalRecords = data.totalRecords || 0;
      totalPages = data.totalPages || 0;
      currentPage = data.pageNumber || page;

      document.getElementById("totalRecords").textContent = totalRecords;

      displayPageNumbers();
    })
    .catch(error => {
      console.error("Lỗi khi tải dữ liệu:", error);
    });
}

function displayPageNumbers() {
  const container = document.getElementById("pageNumbers");
  container.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = i;
    if (i === currentPage) {
      a.classList.add("active");
    }
    a.addEventListener("click", e => {
      e.preventDefault();
      currentPage = i;
      loadHistoryData(currentPage, currentPageSize);
    });
    container.appendChild(a);
  }
}

document.getElementById("prevPage").addEventListener("click", e => {
  e.preventDefault();
  if (currentPage > 1) {
    currentPage--;
    loadHistoryData(currentPage, currentPageSize);
  }
});

document.getElementById("nextPage").addEventListener("click", e => {
  e.preventDefault();
  if (currentPage < totalPages) {
    currentPage++;
    loadHistoryData(currentPage, currentPageSize);
  }
});

document.getElementById("rowsPerPage").addEventListener("change", e => {
  currentPageSize = parseInt(e.target.value);
  currentPage = 1;
  loadHistoryData(currentPage, currentPageSize);
});

setInterval(() => {
  loadHistoryData(currentPage, currentPageSize);
}, 5000);

document.addEventListener("DOMContentLoaded", () => {
  loadHistoryData(currentPage, currentPageSize);

  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("keyup", e => {
    if (e.key === "Enter") {
      currentPage = 1;
      loadHistoryData(currentPage, currentPageSize);
    }
  });
});
