// =======================
// 🔗 SUPABASE INIT
// =======================
const supabaseUrl = "https://qirmwgrrfsgtpssqmdsi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcm13Z3JyZnNndHBzc3FtZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTk0NzQsImV4cCI6MjA4OTY3NTQ3NH0.BwqwRd4oTxvNTfXVULDLgi-SkOMYQShgLfnnyJ5G8kU";

const { createClient } = supabase;
const client = createClient(supabaseUrl, supabaseKey);


// =======================
// 📌 GLOBAL
// =======================
let companyData = [];
let currentSort = "asc";
let editingCompanyId = null;


// =======================
// 🔐 CHECK LOGIN
// =======================
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser) {
  window.location.href = "index.html";
}

if (currentUser.role !== "admin") {
  document.getElementById("colIT").style.display = "none";
}

document.getElementById("userInfo").innerText =
  `Đăng nhập: ${currentUser.username} (${currentUser.role})`;


// =======================
// 🚪 LOGOUT
// =======================
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "index.html";
}


// =======================
// 🔄 PAGE SWITCH
// =======================
function showPage(page) {

  if (page === "user" && currentUser.role !== "admin") {
    alert("Bạn không có quyền!");
    return;
  }

  document.getElementById("pageUser").style.display = "none";
  document.getElementById("pageCompany").style.display = "none";

  if (page === "user") {
    document.getElementById("pageUser").style.display = "block";
  } else {
    document.getElementById("pageCompany").style.display = "block";
  }
}


// =======================
// 👤 LOAD USERS
// =======================
async function loadUsersWithCompanies() {

  if (currentUser.role !== "admin") return;

  const { data } = await client
    .from("users")
    .select(`
      id, username, role, full_name,
      user_companies (
        companies (name)
      )
    `);

  const html = (data || []).map(u => {
    const companies = (u.user_companies || [])
      .map(x => x.companies.name)
      .join(", ");

    return `
      <tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${u.full_name || ""}</td>
        <td>${companies || "-"}</td>
        <td>
          <button onclick="openAssign('${u.id}')">Cấp quyền</button>
          <button class="delete" onclick="deleteUser('${u.id}')">Xóa</button>
        </td>
      </tr>
    `;
  }).join("");

  userList.innerHTML = html;
}


// =======================
// ❌ DELETE USER
// =======================
async function deleteUser(id) {
  if (!confirm("Xóa tài khoản?")) return;

  await client.from("user_companies").delete().eq("user_id", id);
  await client.from("users").delete().eq("id", id);

  loadUsersWithCompanies();
}


// =======================
// 🏢 LOAD COMPANIES
// =======================
async function loadCompanies() {

  if (currentUser.role === "admin") {

    const { data } = await client
      .from("companies")
      .select(`
        id, name, address, sale,
        user_companies (
          users (username)
        )
      `);

    companyData = data || [];
    renderCompanies(companyData);
  }

  else {

    const { data } = await client
      .from("user_companies")
      .select(`
        companies (
          id, name, address, sale
        )
      `)
      .eq("user_id", currentUser.id);

    const list = data.map(x => x.companies);
    renderCompanies(list);
  }
}


// =======================
// 🎯 RENDER COMPANIES
// =======================
function renderCompanies(data) {

  const isAdmin = currentUser.role === "admin";

  const html = data.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.address || ""}</td>
      <td>${c.sale || ""}</td>

      ${isAdmin ? `
      <td>
        ${c.user_companies?.map(u => `
          <span class="user-link" onclick="focusUser('${u.users.username}')">
            ${u.users.username}
          </span>
        `).join(", ") || "-"}
      </td>
      ` : ""}

      <td>
        <button onclick="viewCompany('${c.id}')">Xem</button>

        ${isAdmin ? `
          <button class="edit" onclick="editCompany('${c.id}')">Sửa</button>
          <button class="delete" onclick="deleteCompany('${c.id}')">Xóa</button>
        ` : ""}
      </td>
    </tr>
  `).join("");

  companyList.innerHTML = html;
}


// =======================
// ✏️ EDIT COMPANY
// =======================
function editCompany(id) {
  const c = companyData.find(x => x.id === id);
  if (!c) return;

  // fill data
  companyName.value = c.name || "";
  companyAddress.value = c.address || "";
  companySale.value = c.sale || "";

  editingCompanyId = id;

  document.querySelector("#addCompanyBox button").innerText = "Sửa";

  // 👉 FIX SCROLL
  showPage("company");

  setTimeout(() => {
    const container = document.querySelector(".main");
    const form = document.querySelector("#addCompanyBox");

    if (container && form) {
      container.scrollTo({
        top: form.offsetTop - 120,
        behavior: "smooth"
      });
    }

    companyName.focus();
  }, 100);
}


// =======================
// 🔃 SORT SALE
// =======================
function sortBySale() {
  companyData.sort((a, b) => {
    const A = (a.sale || "").toLowerCase();
    const B = (b.sale || "").toLowerCase();

    return currentSort === "asc"
      ? A.localeCompare(B, 'vi', { sensitivity: 'base' })
      : B.localeCompare(A, 'vi', { sensitivity: 'base' });
  });

  currentSort = currentSort === "asc" ? "desc" : "asc";
  renderCompanies(companyData);
}


// =======================
// 🔃 SORT IT
// =======================
function sortByIT() {
  companyData.sort((a, b) => {

    const getIT = (item) => {
      if (!item.user_companies) return "";

      return item.user_companies
        .map(u => u.users?.username || "")
        .join(",")
        .toLowerCase();
    };

    const A = getIT(a);
    const B = getIT(b);

    return currentSort === "asc"
      ? A.localeCompare(B)
      : B.localeCompare(A);
  });

  currentSort = currentSort === "asc" ? "desc" : "asc";
  renderCompanies(companyData);
}


// =======================
// ➕ ADD / UPDATE COMPANY
// =======================
async function addCompany() {

  if (currentUser.role !== "admin") return;

  const name = companyName.value.trim();
  const address = companyAddress.value.trim();
  const sale = companySale.value.trim();

  if (!name) return alert("Nhập tên công ty");

  let error;

  if (editingCompanyId) {
    const res = await client
      .from("companies")
      .update({ name, address, sale })
      .eq("id", editingCompanyId);

    error = res.error;

    editingCompanyId = null;
    document.querySelector("#addCompanyBox button").innerText = "Thêm Công ty";
  } else {
    const res = await client
      .from("companies")
      .insert([{ name, address, sale }]);

    error = res.error;
  }

  if (error) return alert(error.message);

  alert("Đã lưu công ty!");

  companyName.value = "";
  companyAddress.value = "";
  companySale.value = "";

  loadCompanies();
}


// =======================
// ❌ DELETE COMPANY
// =======================
async function deleteCompany(id) {

  if (currentUser.role !== "admin") return;
  if (!confirm("Xóa công ty?")) return;

  await client.from("user_companies").delete().eq("company_id", id);
  await client.from("companies").delete().eq("id", id);

  loadCompanies();
}


// =======================
// 👁️ VIEW COMPANY
// =======================
function viewCompany(id) {
  window.location.href = `company.html?id=${id}`;
}


// =======================
// 🔐 ASSIGN COMPANY
// =======================
let currentUserId = null;

async function openAssign(userId) {

  currentUserId = userId;
  popup.style.display = "block";

  const { data: companies } = await client.from("companies").select("*");
  const { data: userCompanies } = await client
    .from("user_companies")
    .select("company_id")
    .eq("user_id", userId);

  const assigned = userCompanies.map(x => x.company_id);

  companyCheckboxList.innerHTML = companies.map(c => `
    <label class="checkbox-item">
      <input type="checkbox" value="${c.id}" ${assigned.includes(c.id) ? "checked" : ""}>
      <span>${c.name}</span>
    </label>
  `).join("");
}

function closePopup() {
  popup.style.display = "none";
}

async function saveAssign() {

  await client.from("user_companies")
    .delete()
    .eq("user_id", currentUserId);

  const checked = document.querySelectorAll("#companyCheckboxList input:checked");

  const values = [...checked].map(cb => ({
    user_id: currentUserId,
    company_id: cb.value
  }));

  if (values.length) {
    await client.from("user_companies").insert(values);
  }

  alert("Đã cấp quyền!");

  closePopup();
  loadUsersWithCompanies();
  loadCompanies();
}


// =======================
// 🎯 FOCUS USER
// =======================
function focusUser(username) {

  showPage("user");

  setTimeout(() => {

    document.querySelectorAll("#userList tr").forEach(tr => {
      tr.classList.remove("active-row");
    });

    document.querySelectorAll("#userList tr").forEach(tr => {
      if (tr.innerText.includes(username)) {
        tr.classList.add("active-row");
        tr.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

  }, 200);
}


// =======================
// 🚀 INIT
// =======================
function init() {

  if (currentUser.role !== "admin") {
    btnUser.style.display = "none";
    document.getElementById("addCompanyBox")?.remove();
  }

  loadCompanies();
  loadUsersWithCompanies();

  if (currentUser.role !== "admin") {
    showPage("company");
  } else {
    showPage("user");
  }
}

init();


function filterCompany(keyword) {
  const items = document.querySelectorAll("#companyCheckboxList label");

  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    const search = keyword.toLowerCase();

    item.style.display = text.includes(search) ? "" : "none";
  });
}

function sortByName() {
  companyData.sort((a, b) => {
    const A = (a.name || "").toLowerCase();
    const B = (b.name || "").toLowerCase();

    return currentSort === "asc"
      ? A.localeCompare(B, 'vi', { sensitivity: 'base' })
      : B.localeCompare(A, 'vi', { sensitivity: 'base' });
  });

  currentSort = currentSort === "asc" ? "desc" : "asc";
  renderCompanies(companyData);
}