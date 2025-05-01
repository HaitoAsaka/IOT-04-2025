let currentPage = 1;
let currentPageSize = 10;
let totalRecords = 0;
let totalPages = 0;

// Hàm để tải dữ liệu lịch sử từ API
function loadHistoryData(page = 1, pageSize = 10) {
  fetch(`http://localhost:5000/api/history/search?date=2024-02-23&status=&page=${page}&pageSize=${pageSize}`)
    .then((response) => response.json())
    .then((data) => {
      console.log(data); // Kiểm tra dữ liệu trả về từ API

      if (data && Array.isArray(data.data)) {
        const tableBody = document.querySelector(".data-table tbody");
        tableBody.innerHTML = '';

        data.data.forEach((item) => {
          const row = document.createElement("tr");
          const idCell = document.createElement("td");
          idCell.textContent = item.id;
          row.appendChild(idCell);

          const deviceNameCell = document.createElement("td");
          deviceNameCell.textContent = item.name;
          row.appendChild(deviceNameCell);

          const statusCell = document.createElement("td");
          const statusSpan = document.createElement("span");
          statusSpan.classList.add("status", item.status === "bật" ? "on" : "off");
          statusSpan.textContent = item.status === "bật" ? "Bật" : "Tắt";
          statusCell.appendChild(statusSpan);
          row.appendChild(statusCell);

          const dateCell = document.createElement("td");
          dateCell.textContent = new Date(item.time).toLocaleString();
          row.appendChild(dateCell);

          tableBody.appendChild(row);
        });

        totalRecords = data.totalRecords;
        totalPages = Math.ceil(totalRecords / currentPageSize);

        // Hiển thị tổng số bản ghi và tổng số trang
        document.getElementById("totalRecords").textContent = totalRecords;

        // Hiển thị các số trang
        displayPageNumbers();
      }
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu lịch sử:", error);
    });
}

// Hàm hiển thị các số trang với dấu ba chấm
function displayPageNumbers() {
  const pageNumbersContainer = document.getElementById("pageNumbers");
  pageNumbersContainer.innerHTML = ''; // Xóa các trang cũ

  // Nếu tổng số trang nhỏ hơn hoặc bằng 4, hiển thị tất cả các trang
  if (totalPages <= 4) {
    for (let i = 1; i <= totalPages; i++) {
      createPageLink(i);
    }
  } else {
    // Nếu trang hiện tại gần đầu (trang 1), hiển thị từ 1 và các trang tiếp theo
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) {
        createPageLink(i);
      }
      pageNumbersContainer.appendChild(createEllipsis());
      createPageLink(totalPages);
    }
    // Nếu trang hiện tại gần cuối (trang cuối), hiển thị các trang cuối và các trang trước đó
    else if (currentPage >= totalPages - 2) {
      createPageLink(1);
      pageNumbersContainer.appendChild(createEllipsis());
      for (let i = totalPages - 3; i <= totalPages; i++) {
        createPageLink(i);
      }
    }
    // Nếu trang hiện tại ở giữa, hiển thị các trang gần với trang hiện tại
    else {
      createPageLink(1);
      pageNumbersContainer.appendChild(createEllipsis());
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        createPageLink(i);
      }
      pageNumbersContainer.appendChild(createEllipsis());
      createPageLink(totalPages);
    }
  }
}

// Hàm tạo liên kết trang
function createPageLink(page) {
  const pageLink = document.createElement("a");
  pageLink.href = "#";
  pageLink.textContent = page;
  if (page === currentPage) {
    pageLink.classList.add("current"); // Thêm lớp "current" cho trang hiện tại
  }
  pageLink.addEventListener("click", () => {
    currentPage = page;
    loadHistoryData(currentPage, currentPageSize); // Gọi lại hàm tải dữ liệu khi bấm vào trang
  });
  document.getElementById("pageNumbers").appendChild(pageLink);
}

// Hàm tạo dấu ba chấm "..."
function createEllipsis() {
  const ellipsis = document.createElement("span");
  ellipsis.textContent = "...";
  return ellipsis;
}

// Hàm cập nhật trang khi thay đổi số dòng mỗi trang
document.getElementById("rowsPerPage").addEventListener("change", function () {
  currentPageSize = parseInt(this.value);
  loadHistoryData(currentPage, currentPageSize); // Tải lại dữ liệu với số dòng mới
});

// Các sự kiện phân trang
document.getElementById("nextPage").addEventListener("click", function () {
  if (currentPage < totalPages) {
    currentPage++;
    loadHistoryData(currentPage, currentPageSize); // Tải lại dữ liệu khi chuyển trang
  }
});

document.getElementById("prevPage").addEventListener("click", function () {
  if (currentPage > 1) {
    currentPage--;
    loadHistoryData(currentPage, currentPageSize); // Tải lại dữ liệu khi chuyển trang
  }
});

// Tải dữ liệu ban đầu khi trang được tải
document.addEventListener("DOMContentLoaded", function () {
  loadHistoryData(currentPage, currentPageSize); // Gọi hàm tải dữ liệu khi trang tải xong
});
