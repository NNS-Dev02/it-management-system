// =======================
// 🔗 SUPABASE INIT
// =======================
const supabaseUrl = "https://qirmwgrrfsgtpssqmdsi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcm13Z3JyZnNndHBzc3FtZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTk0NzQsImV4cCI6MjA4OTY3NTQ3NH0.BwqwRd4oTxvNTfXVULDLgi-SkOMYQShgLfnnyJ5G8kU";
const { createClient } = supabase;
const client = createClient(supabaseUrl, supabaseKey);


// =======================
// 📌 GLOBAL STATE
// =======================
let deviceData = [];
let currentSort = "asc";
let editingDeviceId = null;
let editingUserId = null;
let userData = [];

// =======================
// 👤 CURRENT USER
// =======================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}


// =======================
// 📌 UI INIT
// =======================
document.getElementById("userInfo").innerText =
  `Đăng nhập: ${currentUser.username} (${currentUser.role})`;

if (currentUser.role !== "admin") {
  const btn = document.getElementById("btnUser");
  if (btn) btn.style.display = "none";

  const box = document.getElementById("itAccessBox");
  if (box) box.style.display = "none";
}


// =======================
// 📌 GET COMPANY ID
// =======================
function getCompanyId() {
  return new URLSearchParams(window.location.search).get("id");
}


// =======================
// 🏢 LOAD COMPANY
// =======================
async function loadCompany() {
  const id = getCompanyId();
  if (!id) return showToast("Không có company_id!");

  const { data, error } = await client
    .from("companies")
    .select(`
      name, address, sale,
      user_companies (
        users (username, full_name)
      )
    `)
    .eq("id", id)
    .single();

  if (error) return showToast("Lỗi load company");

  cName.innerText = data.name || "";
  cAddress.innerText = data.address || "";
  cSale.innerText = data.sale || "";

  cUsers.innerHTML = (data.user_companies || [])
    .map(u => `<li>${u.users.username} (${u.users.full_name || ""})</li>`)
    .join("");

  loadNetworkDevices(id);
  loadUsers(id);
}


// =======================
// 🌐 DEVICE
// =======================
async function loadNetworkDevices(company_id) {
  const { data } = await client
    .from("network_devices")
    .select("*")
    .eq("company_id", company_id);

  deviceData = data || [];
  renderDevices(deviceData);
}

function renderDevices(data) {
  const table = document.getElementById("networkTable");

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="7">Chưa có thiết bị</td></tr>`;
    return;
  }

  table.innerHTML = data.map(d => `
    <tr>
      <td>${d.type || ""}</td>
      <td>${d.name || ""}</td>
      <td>${d.serial || ""}</td>
      <td>${d.ip || ""}</td>
      <td>${d.mac || ""}</td>
      <td title="${d.note || ""}">${d.note || ""}</td>
      <td>
        <button class="edit" onclick="editDevice('${d.id}')">Sửa</button>
        <button class="delete" onclick="deleteDevice('${d.id}')">Xóa</button>
      </td>
    </tr>
  `).join("");
}

function editDevice(id) {
  const d = deviceData.find(x => x.id === id);
  if (!d) return;

  // fill data
  dType.value = d.type || "";
  dName.value = d.name || "";
  dSerial.value = d.serial || "";
  dIP.value = d.ip || "";
  dMAC.value = d.mac || "";
  dNote.value = d.note || "";

  editingDeviceId = id;
  document.getElementById("btnAddDevice").innerText = "Sửa";

  // 👉 FIX SCROLL (QUAN TRỌNG)
  showTab("device");

  setTimeout(() => {
    const container = document.querySelector(".main");
    const form = document.getElementById("btnAddDevice");

    if (container && form) {
      container.scrollTo({
        top: form.offsetTop - 120,
        behavior: "smooth"
      });
    }

    dType.focus();
  }, 100);
}

async function addDevice() {
  const company_id = getCompanyId();

  const payload = {
    company_id,
    type: dType.value.trim(),
    name: dName.value.trim(),
    serial: dSerial.value.trim(),
    ip: dIP.value.trim(),
    mac: dMAC.value.trim(),
    note: dNote.value.trim()
  };

  if (!payload.name || !payload.type) {
    return showToast("Nhập Loại + Tên thiết bị", "error");
  }

  let error;

  if (editingDeviceId) {
    const res = await client
      .from("network_devices")
      .update(payload)
      .eq("id", editingDeviceId);

    error = res.error;

    showToast("✏️ Đã cập nhật thiết bị!"); // 🔥 FIX

    editingDeviceId = null;
    document.getElementById("btnAddDevice").innerText = "Thêm thiết bị";

  } else {
    const res = await client.from("network_devices").insert([payload]);
    error = res.error;

    showToast("✅ Đã thêm thiết bị mới!"); // 🔥 FIX
  }

  if (error) return showToast(error.message, "error");

  ["dType","dName","dSerial","dIP","dMAC","dNote"]
    .forEach(id => document.getElementById(id).value = "");

  loadNetworkDevices(company_id);
}

async function deleteDevice(id) {
  await client.from("network_devices").delete().eq("id", id);
  showToast("❌ Đã xóa thiết bị!");
  loadNetworkDevices(getCompanyId());
}


// =======================
// 👨‍💻 USER
// =======================
async function loadUsers(company_id) {
  const { data } = await client
    .from("company_users")
    .select("*")
    .eq("company_id", company_id);

  userData = data || [];   // 🔥 QUAN TRỌNG
  renderUsers(userData);
}

function renderUsers(data) {
  const table = document.getElementById("userTable");

  if (!data.length) {
    table.innerHTML = `<tr><td colspan="11">Chưa có người dùng</td></tr>`;
    return;
  }

  table.innerHTML = data.map(u => `
    <tr>
      <td>${u.full_name || ""}</td>
      <td>${u.email || ""}</td>
      <td>${u.windows || ""}</td>
      <td>${u.windows_key || ""}</td>
      <td>${u.bitlocker || ""}</td>
      <td>${u.role || ""}</td>
      <td>${u.note || ""}</td>
      <td>
        <button class="edit" onclick="editUser('${u.id}')">Sửa</button>
        <button class="delete" onclick="deleteUser('${u.id}')">Xóa</button>
      </td>
    </tr>
  `).join("");
}

function editUser(id) {
  const row = document.querySelector(`button[onclick="editUser('${id}')"]`)
    .closest("tr")
    .children;

  uName.value = row[0].innerText;
  uMail.value = row[1].innerText;
  uWindows.value = row[2].innerText;
  uKey.value = row[3].innerText;
  uBitlocker.value = row[4].innerText;
  uRole.value = row[5].innerText;
  uNote.value = row[6].innerText;

  editingUserId = id;
  document.getElementById("btnAddUser").innerText = "Sửa";

  showTab("user");

  setTimeout(() => {
    uName.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    uName.focus();
  }, 100);
}

async function addUser() {
  const company_id = getCompanyId();

  const payload = {
    company_id,
    full_name: uName.value,
    email: uMail.value,
    windows: uWindows.value,
    windows_key: uKey.value,
    bitlocker: uBitlocker.value,
    role: uRole.value,
    note: uNote.value
  };

  if (!payload.full_name) return showToast("Nhập tên", "error");

  let error;

  if (editingUserId) {
    const res = await client
      .from("company_users")
      .update(payload)
      .eq("id", editingUserId);

    error = res.error;

    showToast("✏️ Đã cập nhật người dùng!"); // 🔥 FIX

    editingUserId = null;
    document.getElementById("btnAddUser").innerText = "Thêm người dùng";

  } else {
    const res = await client.from("company_users").insert([payload]);
    error = res.error;

    showToast("✅ Đã thêm người dùng mới!"); // 🔥 FIX
  }

  if (error) return showToast(error.message, "error");

  ["uName","uMail","uWindows","uKey","uBitlocker","uRole","uNote"]
    .forEach(id => document.getElementById(id).value = "");

  loadUsers(company_id);
}

async function deleteUser(id) {
  await client.from("company_users").delete().eq("id", id);
  showToast("❌ Đã xóa người dùng!");
  loadUsers(getCompanyId());
}


// =======================
// 🔁 TAB SWITCH
// =======================
function showTab(tab) {
  document.getElementById("tab-overview").style.display = "none";
  document.getElementById("tab-device").style.display = "none";
  document.getElementById("tab-user").style.display = "none";

  document.getElementById("tab-" + tab).style.display = "block";
}


// =======================
// 🔁 NAVIGATION
// =======================
function goPage(page) {
  if (page === "user" && currentUser.role !== "admin") {
    return showToast("Không có quyền!");
  }

  window.location.href = `dashboard.html?page=${page}`;
}

function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}


// =======================
// 🚀 INIT
// =======================
loadCompany();

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("vi-VN");
}

function searchDevice(keyword) {
  const k = keyword.toLowerCase();

  const filtered = deviceData.filter(d =>
    (d.name || "").toLowerCase().includes(k) ||
    (d.type || "").toLowerCase().includes(k) ||
    (d.ip || "").toLowerCase().includes(k)
  );

  renderDevices(filtered);
}

function searchCompanyUser(keyword) {
  const k = keyword.toLowerCase();

  const filtered = userData.filter(u =>
    (u.full_name || "").toLowerCase().includes(k) ||
    (u.email || "").toLowerCase().includes(k) ||
    (u.windows || "").toLowerCase().includes(k) ||
    (u.role || "").toLowerCase().includes(k) ||
    (u.note || "").toLowerCase().includes(k)
  );

  renderUsers(filtered);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

function sortDevice(field) {
  deviceData.sort((a, b) => {

    let A = (a[field] || "").toString().toLowerCase();
    let B = (b[field] || "").toString().toLowerCase();

    return currentSort === "asc"
      ? A.localeCompare(B, 'vi', { sensitivity: 'base' })
      : B.localeCompare(A, 'vi', { sensitivity: 'base' });
  });

  currentSort = currentSort === "asc" ? "desc" : "asc";
  renderDevices(deviceData);
}

function sortUser(field) {
  userData.sort((a, b) => {

    let A = (a[field] || "").toString().toLowerCase();
    let B = (b[field] || "").toString().toLowerCase();

    return currentSort === "asc"
      ? A.localeCompare(B, 'vi', { sensitivity: 'base' })
      : B.localeCompare(A, 'vi', { sensitivity: 'base' });
  });

  currentSort = currentSort === "asc" ? "desc" : "asc";
  renderUsers(userData);
}