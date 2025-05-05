let currentPage = 1;
let currentPageSize = 10;
let totalRecords = 0;
let totalPages = 0;
let currentSortField = "time";
let currentSortOrder = "ASC";
const API_BASE_URL = 'http://localhost:5000';
// Hàm tải dữ liệu từ API
async function loadSensorData(page = 1, pageSize = 10) {
    try {
      const searchInput = document.getElementById("searchInput").value.trim();
      const searchType = document.getElementById("searchType").value;
      
      const params = new URLSearchParams({
        page,
        pageSize,
        sortField: currentSortField,
        order: currentSortOrder
      });
  
      if (searchInput) {
        params.set(searchType, searchInput);
      }
  
      // Sử dụng API_BASE_URL
      const endpoint = searchInput ? '/api/searchAndSort' : '/api/sensors';
      const url = `${API_BASE_URL}${endpoint}?${params.toString()}`;
      
      console.log('Đang gọi API:', url); // Log URL để debug
  
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Lỗi ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data?.data) {
        renderTableData(data.data, page, pageSize);
        updatePagination(data.totalRecords, page, pageSize);
      }
    } catch (error) {
      console.error("Chi tiết lỗi:", {
        message: error.message,
        stack: error.stack
      });
      alert(`Không thể tải dữ liệu: ${error.message}`);
    }
  }

// Hàm render dữ liệu vào bảng
function renderTableData(data, page, pageSize) {
  const tableBody = document.querySelector(".data-table tbody");
  tableBody.innerHTML = '';

  data.forEach((item, index) => {
    const row = document.createElement("tr");
    
    // ID
    const idCell = document.createElement("td");
    idCell.textContent = (page - 1) * pageSize + index + 1;
    row.appendChild(idCell);

    // Thời gian
    const timeCell = document.createElement("td");
    timeCell.textContent = new Date(item.time).toLocaleString();
    row.appendChild(timeCell);

    // Nhiệt độ
    const tempCell = document.createElement("td");
    tempCell.textContent = item.temperature.toFixed(1);
    row.appendChild(tempCell);

    // Độ ẩm
    const humidityCell = document.createElement("td");
    humidityCell.textContent = item.humidity.toFixed(0);
    row.appendChild(humidityCell);

    // Ánh sáng
    const lightCell = document.createElement("td");
    lightCell.textContent = item.light.toFixed(0);
    row.appendChild(lightCell);

    tableBody.appendChild(row);
  });
}

// Hàm cập nhật phân trang
function updatePagination(total, page, pageSize) {
  totalRecords = total;
  totalPages = Math.ceil(totalRecords / currentPageSize);
  
  // Cập nhật thông tin số lượng bản ghi
  document.getElementById("totalRecords").textContent = totalRecords;
  
  // Cập nhật số trang
  const pageNumbersContainer = document.getElementById("pageNumbers");
  pageNumbersContainer.innerHTML = '';
  
  // Hiển thị tối đa 5 trang gần trang hiện tại
  const maxVisiblePages = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Điều chỉnh nếu ở đầu/cuối
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // Nút trang đầu
  if (startPage > 1) {
    const firstPageLink = createPageLink(1);
    pageNumbersContainer.appendChild(firstPageLink);
    
    if (startPage > 2) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      pageNumbersContainer.appendChild(ellipsis);
    }
  }
  
  // Các trang chính
  for (let i = startPage; i <= endPage; i++) {
    pageNumbersContainer.appendChild(createPageLink(i));
  }
  
  // Nút trang cuối
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement("span");
      ellipsis.textContent = "...";
      pageNumbersContainer.appendChild(ellipsis);
    }
    
    const lastPageLink = createPageLink(totalPages);
    pageNumbersContainer.appendChild(lastPageLink);
  }
}

// Hàm tạo link phân trang
function createPageLink(pageNumber) {
  const link = document.createElement("a");
  link.href = "#";
  link.textContent = pageNumber;
  
  if (pageNumber === currentPage) {
    link.classList.add("active");
  }
  
  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (pageNumber !== currentPage) {
      currentPage = pageNumber;
      loadSensorData(currentPage, currentPageSize);
    }
  });
  
  return link;
}

// Hàm xử lý sắp xếp
function handleSort(column, order) {
  currentSortField = column;
  currentSortOrder = order;
  currentPage = 1; // Reset về trang đầu khi sắp xếp
  loadSensorData(currentPage, currentPageSize);
}

// Khởi tạo sự kiện
function initializeEvents() {
  // Tải dữ liệu ban đầu
  loadSensorData(currentPage, currentPageSize);

  // Sự kiện tìm kiếm
  const searchInput = document.getElementById("searchInput");
  const searchType = document.getElementById("searchType");
  
  let searchTimeout;
  searchInput.addEventListener("keyup", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadSensorData(currentPage, currentPageSize);
    }, 500); // Debounce 500ms
  });
  
  searchType.addEventListener("change", () => {
    currentPage = 1;
    loadSensorData(currentPage, currentPageSize);
  });

  // Sự kiện sắp xếp
  document.querySelectorAll(".sort-select").forEach(select => {
    select.addEventListener("change", function() {
      const column = this.getAttribute("data-column");
      const order = this.value;
      if (order) {
        handleSort(column, order);
      }
    });
  });

  // Sự kiện phân trang
  document.getElementById("rowsPerPage").addEventListener("change", function() {
    currentPageSize = parseInt(this.value);
    currentPage = 1;
    loadSensorData(currentPage, currentPageSize);
  });

  document.getElementById("prevPage").addEventListener("click", function(e) {
    e.preventDefault();
    if (currentPage > 1) {
      currentPage--;
      loadSensorData(currentPage, currentPageSize);
    }
  });

  document.getElementById("nextPage").addEventListener("click", function(e) {
    e.preventDefault();
    if (currentPage < totalPages) {
      currentPage++;
      loadSensorData(currentPage, currentPageSize);
    }
  });
}

// Khởi chạy khi DOM ready
document.addEventListener("DOMContentLoaded", initializeEvents);