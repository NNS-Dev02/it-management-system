// =======================
// 🔗 SUPABASE INIT
// =======================
const supabaseUrl = "https://qirmwgrrfsgtpssqmdsi.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcm13Z3JyZnNndHBzc3FtZHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTk0NzQsImV4cCI6MjA4OTY3NTQ3NH0.BwqwRd4oTxvNTfXVULDLgi-SkOMYQShgLfnnyJ5G8kU";

const { createClient } = supabase;
const client = createClient(supabaseUrl, supabaseKey);


// =======================
// 🔄 SWITCH UI
// =======================
function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "block";
}

function showLogin() {
  document.getElementById("loginForm").style.display = "block";
  document.getElementById("registerForm").style.display = "none";
}


// =======================
// 📝 REGISTER
// =======================
async function register() {
  const full_name = document.getElementById("regFullName").value.trim();
  const username = document.getElementById("regUser").value.trim();
  const password = document.getElementById("regPass").value.trim();
  const password2 = document.getElementById("regPass2").value.trim();

  if (!username || !password || !password2) {
    alert("Vui lòng nhập đầy đủ thông tin");
    return;
  }

  if (password !== password2) {
    alert("Mật khẩu không khớp");
    return;
  }

  try {
    // check user tồn tại (chỉ lấy 1 record)
    const { data: exist, error: checkError } = await client
      .from("users")
      .select("id")
      .eq("username", username)
      .limit(1);

    if (checkError) throw checkError;

    if (exist.length > 0) {
      alert("Tài khoản đã tồn tại");
      return;
    }

    // insert user
    const { error } = await client
      .from("users")
      .insert([{
        full_name,
        username,
        password,
        role: "user"
      }]);

    if (error) throw error;

    alert("Tạo tài khoản thành công!");
    showLogin();

  } catch (err) {
    console.error(err);
    alert("Lỗi: " + err.message);
  }
}


// =======================
// 🔐 LOGIN
// =======================
async function login() {
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();

  if (!username || !password) {
    alert("Nhập tài khoản và mật khẩu");
    return;
  }

  try {
    // 🔥 query đúng user (không load toàn bộ DB)
    const { data, error } = await client
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (error || !data) {
      alert("Sai tài khoản hoặc mật khẩu");
      return;
    }

    // lưu session
    localStorage.setItem("currentUser", JSON.stringify(data));

    alert("Đăng nhập thành công (" + data.role + ")");

    window.location.href = "dashboard.html";

  } catch (err) {
    console.error(err);
    alert("Lỗi hệ thống");
  }
}
