// ─── State & API ────────────────────────────────────────────────────────────
const state = { token: localStorage.getItem('lrms_token'), user: JSON.parse(localStorage.getItem('lrms_user') || 'null') };
const API = '/api';

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function toast(msg, type = 'info') {
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="material-symbols-rounded">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3500);
}

function formatDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'; }

// ─── Auth ───────────────────────────────────────────────────────────────────
function initAuth() {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('login-form').classList.toggle('hidden', tab.dataset.tab !== 'login');
      document.getElementById('register-form').classList.toggle('hidden', tab.dataset.tab !== 'register');
    });
  });

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username: document.getElementById('login-username').value, password: document.getElementById('login-password').value }) });
      setAuth(data);
    } catch (err) { toast(err.message, 'error'); }
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ full_name: document.getElementById('reg-fullname').value, username: document.getElementById('reg-username').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-password').value }) });
      setAuth(data);
    } catch (err) { toast(err.message, 'error'); }
  });
}

function setAuth(data) {
  state.token = data.token; state.user = data.user;
  localStorage.setItem('lrms_token', data.token);
  localStorage.setItem('lrms_user', JSON.stringify(data.user));
  showApp();
}

function logout() {
  state.token = null; state.user = null;
  localStorage.removeItem('lrms_token'); localStorage.removeItem('lrms_user');
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app-screen').classList.remove('active');
}

// ─── Navigation ─────────────────────────────────────────────────────────────
function showApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app-screen').classList.add('active');
  document.getElementById('user-name').textContent = state.user.full_name;
  document.getElementById('user-role').textContent = state.user.role;
  document.getElementById('user-avatar').textContent = state.user.full_name.charAt(0).toUpperCase();
  if (state.user.role === 'admin') document.getElementById('admin-nav').classList.remove('hidden');
  else document.getElementById('admin-nav').classList.add('hidden');
  navigateTo('dashboard');
}

function navigateTo(view) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add('active');
  const titles = { dashboard: 'Dashboard', catalog: 'Book Catalog', 'my-books': 'My Books', reservations: 'My Reservations', 'manage-books': 'Manage Books', 'all-borrows': 'All Borrows', 'all-reservations': 'All Reservations', users: 'Users' };
  document.getElementById('page-title').textContent = titles[view] || view;
  const searchC = document.getElementById('global-search-container');
  searchC.style.display = view === 'catalog' ? 'none' : 'none';
  loadView(view);
}

async function loadView(view) {
  try {
    switch (view) {
      case 'dashboard': await loadDashboard(); break;
      case 'catalog': await loadCatalog(); break;
      case 'my-books': await loadMyBooks(); break;
      case 'reservations': await loadMyReservations(); break;
      case 'manage-books': await loadManageBooks(); break;
      case 'all-borrows': await loadAllBorrows(); break;
      case 'all-reservations': await loadAllReservations(); break;
      case 'users': await loadUsers(); break;
    }
  } catch (err) { toast(err.message, 'error'); }
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  if (state.user.role === 'admin') {
    try {
      const s = await api('/stats');
      container.innerHTML = `
        <div class="stats-row">
          <div class="stat-card"><div class="stat-icon books"><span class="material-symbols-rounded">library_books</span></div><div><div class="stat-value">${s.totalBooks}</div><div class="stat-label">Total Books</div></div></div>
          <div class="stat-card"><div class="stat-icon users"><span class="material-symbols-rounded">group</span></div><div><div class="stat-value">${s.totalUsers}</div><div class="stat-label">Members</div></div></div>
          <div class="stat-card"><div class="stat-icon borrows"><span class="material-symbols-rounded">swap_horiz</span></div><div><div class="stat-value">${s.activeBorrows}</div><div class="stat-label">Active Borrows</div></div></div>
          <div class="stat-card"><div class="stat-icon pending"><span class="material-symbols-rounded">pending_actions</span></div><div><div class="stat-value">${s.pendingReservations}</div><div class="stat-label">Pending Reservations</div></div></div>
          ${s.overdue > 0 ? `<div class="stat-card"><div class="stat-icon overdue"><span class="material-symbols-rounded">warning</span></div><div><div class="stat-value">${s.overdue}</div><div class="stat-label">Overdue</div></div></div>` : ''}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="dashboard-section"><h3><span class="material-symbols-rounded">category</span>Categories</h3>
            ${s.categoryStats.map(c => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border-glass);font-size:0.85rem"><span>${c.category}</span><span style="color:var(--text-muted)">${c.count} titles · ${c.total} copies</span></div>`).join('')}
          </div>
          <div class="dashboard-section"><h3><span class="material-symbols-rounded">history</span>Recent Activity</h3>
            ${s.recentBorrows.length ? s.recentBorrows.map(b => `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--border-glass);font-size:0.85rem"><span>${b.title}</span><span class="status-badge ${b.status}">${b.status}</span></div>`).join('') : '<p style="color:var(--text-muted);font-size:0.85rem">No recent activity</p>'}
          </div>
        </div>`;
    } catch { container.innerHTML = '<p style="color:var(--text-muted)">Failed to load stats.</p>'; }
  } else {
    const borrows = await api('/borrow/my');
    const active = borrows.filter(b => b.status === 'borrowed');
    const reservations = await api('/reservations/my');
    const pendingRes = reservations.filter(r => r.status === 'pending' || r.status === 'approved');
    container.innerHTML = `
      <div class="stats-row">
        <div class="stat-card"><div class="stat-icon borrows"><span class="material-symbols-rounded">menu_book</span></div><div><div class="stat-value">${active.length}</div><div class="stat-label">Books Borrowed</div></div></div>
        <div class="stat-card"><div class="stat-icon pending"><span class="material-symbols-rounded">bookmark</span></div><div><div class="stat-value">${pendingRes.length}</div><div class="stat-label">Active Reservations</div></div></div>
        <div class="stat-card"><div class="stat-icon books"><span class="material-symbols-rounded">history</span></div><div><div class="stat-value">${borrows.length}</div><div class="stat-label">Total Borrows</div></div></div>
      </div>
      <div class="dashboard-section"><h3><span class="material-symbols-rounded">menu_book</span>Currently Borrowed</h3>
        ${active.length ? `<div class="table-wrapper"><table><thead><tr><th>Title</th><th>Author</th><th>Due Date</th><th>Renewals</th><th>Actions</th></tr></thead><tbody>${active.map(b => `<tr><td style="color:var(--text-primary);font-weight:600">${b.title}</td><td>${b.author}</td><td>${formatDate(b.due_date)}</td><td>${b.renewals}/2</td><td><div style="display:flex;gap:0.5rem"><button class="btn btn-sm btn-success" onclick="returnBook(${b.id})">Return</button>${b.renewals < 2 ? `<button class="btn btn-sm btn-ghost" onclick="renewBook(${b.id})">Renew</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>` : '<p style="color:var(--text-muted);font-size:0.85rem">No books currently borrowed</p>'}
      </div>`;
  }
}

// ─── Catalog ────────────────────────────────────────────────────────────────
async function loadCatalog() {
  const cats = await api('/books/categories');
  const filter = document.getElementById('catalog-filter');
  filter.innerHTML = '<option value="all">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  await searchCatalog();
}

async function searchCatalog() {
  const search = document.getElementById('catalog-search').value;
  const category = document.getElementById('catalog-filter').value;
  const books = await api(`/books?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}`);
  const grid = document.getElementById('book-grid');
  if (!books.length) { grid.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">search_off</span><p>No books found</p></div>'; return; }
  grid.innerHTML = books.map(b => {
    const availClass = b.available_copies === 0 ? 'out-stock' : b.available_copies <= 1 ? 'low-stock' : 'in-stock';
    const availText = b.available_copies === 0 ? 'Unavailable' : `${b.available_copies}/${b.total_copies} available`;
    return `<div class="book-card">
      <div class="book-card-header"><span class="book-category">${b.category}</span></div>
      <div class="book-title">${b.title}</div>
      <div class="book-author">by ${b.author}</div>
      ${b.description ? `<div class="book-desc">${b.description}</div>` : ''}
      <div class="book-footer">
        <span class="book-avail ${availClass}">${availText}</span>
        <div style="display:flex;gap:0.4rem">
          ${b.available_copies > 0 ? `<button class="btn btn-sm btn-primary" onclick="borrowBook(${b.id})">Borrow</button>` : `<button class="btn btn-sm btn-warning" onclick="reserveBook(${b.id})">Reserve</button>`}
        </div>
      </div>
    </div>`;
  }).join('');
}

document.getElementById('catalog-search')?.addEventListener('input', debounce(searchCatalog, 300));
document.getElementById('catalog-filter')?.addEventListener('change', searchCatalog);

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ─── Borrow / Return / Renew / Reserve ──────────────────────────────────────
async function borrowBook(id) {
  try { await api('/borrow', { method: 'POST', body: JSON.stringify({ book_id: id }) }); toast('Book borrowed successfully!', 'success'); searchCatalog(); } catch (e) { toast(e.message, 'error'); }
}
async function returnBook(id) {
  try { await api(`/borrow/${id}/return`, { method: 'POST' }); toast('Book returned!', 'success'); loadView(document.querySelector('.view.active')?.id.replace('view-', '')); } catch (e) { toast(e.message, 'error'); }
}
async function renewBook(id) {
  try { await api(`/borrow/${id}/renew`, { method: 'POST' }); toast('Book renewed!', 'success'); loadView(document.querySelector('.view.active')?.id.replace('view-', '')); } catch (e) { toast(e.message, 'error'); }
}
async function reserveBook(id) {
  try { await api('/reservations', { method: 'POST', body: JSON.stringify({ book_id: id }) }); toast('Reservation placed!', 'success'); } catch (e) { toast(e.message, 'error'); }
}

// ─── My Books ───────────────────────────────────────────────────────────────
async function loadMyBooks() {
  const records = await api('/borrow/my');
  const container = document.getElementById('my-books-content');
  if (!records.length) { container.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">menu_book</span><p>You haven\'t borrowed any books yet</p></div>'; return; }
  container.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Title</th><th>Author</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th><th>Actions</th></tr></thead><tbody>${records.map(r => `<tr><td style="color:var(--text-primary);font-weight:600">${r.title}</td><td>${r.author}</td><td>${formatDate(r.borrow_date)}</td><td>${formatDate(r.due_date)}</td><td>${formatDate(r.return_date)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${r.status === 'borrowed' ? `<div style="display:flex;gap:0.4rem"><button class="btn btn-sm btn-success" onclick="returnBook(${r.id})">Return</button>${r.renewals < 2 ? `<button class="btn btn-sm btn-ghost" onclick="renewBook(${r.id})">Renew</button>` : ''}</div>` : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

// ─── My Reservations ────────────────────────────────────────────────────────
async function loadMyReservations() {
  const res = await api('/reservations/my');
  const container = document.getElementById('my-reservations-content');
  if (!res.length) { container.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">bookmark</span><p>No reservations yet</p></div>'; return; }
  container.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Title</th><th>Author</th><th>Reserved</th><th>Status</th><th>Actions</th></tr></thead><tbody>${res.map(r => `<tr><td style="color:var(--text-primary);font-weight:600">${r.title}</td><td>${r.author}</td><td>${formatDate(r.reserved_at)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${r.status === 'pending' ? `<button class="btn btn-sm btn-danger" onclick="cancelReservation(${r.id})">Cancel</button>` : r.status === 'approved' && r.available_copies > 0 ? `<button class="btn btn-sm btn-primary" onclick="borrowBook(${r.book_id})">Borrow Now</button>` : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

async function cancelReservation(id) {
  try { await api(`/reservations/${id}`, { method: 'DELETE' }); toast('Reservation cancelled', 'info'); loadMyReservations(); } catch (e) { toast(e.message, 'error'); }
}

// ─── Admin: Manage Books ────────────────────────────────────────────────────
async function loadManageBooks() {
  const books = await api('/books');
  const container = document.getElementById('manage-books-content');
  container.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Title</th><th>Author</th><th>ISBN</th><th>Category</th><th>Copies</th><th>Available</th><th>Actions</th></tr></thead><tbody>${books.map(b => `<tr><td style="color:var(--text-primary);font-weight:600">${b.title}</td><td>${b.author}</td><td style="font-family:monospace;font-size:0.8rem">${b.isbn || '—'}</td><td><span class="book-category">${b.category}</span></td><td>${b.total_copies}</td><td>${b.available_copies}</td><td><div style="display:flex;gap:0.4rem"><button class="btn btn-sm btn-ghost" onclick="editBookModal(${b.id})">Edit</button><button class="btn btn-sm btn-danger" onclick="deleteBook(${b.id})">Delete</button></div></td></tr>`).join('')}</tbody></table></div>`;
}

document.getElementById('add-book-btn')?.addEventListener('click', () => showBookModal());

function showBookModal(book = null) {
  const title = book ? 'Edit Book' : 'Add New Book';
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group"><span class="material-symbols-rounded">title</span><input id="m-title" placeholder="Title" value="${book?.title || ''}" required></div>
    <div class="form-group"><span class="material-symbols-rounded">person</span><input id="m-author" placeholder="Author" value="${book?.author || ''}"></div>
    <div class="form-group"><span class="material-symbols-rounded">tag</span><input id="m-isbn" placeholder="ISBN" value="${book?.isbn || ''}"></div>
    <div class="form-group"><span class="material-symbols-rounded">category</span><input id="m-category" placeholder="Category" value="${book?.category || ''}"></div>
    <div class="form-group"><span class="material-symbols-rounded">content_copy</span><input id="m-copies" type="number" min="1" placeholder="Total Copies" value="${book?.total_copies || 1}"></div>
    <div class="form-group"><span class="material-symbols-rounded">description</span><input id="m-desc" placeholder="Description" value="${book?.description || ''}"></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveBook(${book?.id || 'null'})">${book ? 'Update' : 'Add Book'}</button>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

async function editBookModal(id) {
  try { const book = await api(`/books/${id}`); showBookModal(book); } catch (e) { toast(e.message, 'error'); }
}

async function saveBook(id) {
  const data = { title: document.getElementById('m-title').value, author: document.getElementById('m-author').value, isbn: document.getElementById('m-isbn').value, category: document.getElementById('m-category').value, total_copies: parseInt(document.getElementById('m-copies').value) || 1, description: document.getElementById('m-desc').value };
  try {
    if (id) await api(`/books/${id}`, { method: 'PUT', body: JSON.stringify(data) });
    else await api('/books', { method: 'POST', body: JSON.stringify(data) });
    toast(id ? 'Book updated!' : 'Book added!', 'success'); closeModal(); loadManageBooks();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteBook(id) {
  if (!confirm('Delete this book and all related records?')) return;
  try { await api(`/books/${id}`, { method: 'DELETE' }); toast('Book deleted', 'info'); loadManageBooks(); } catch (e) { toast(e.message, 'error'); }
}

// ─── Admin: All Borrows ─────────────────────────────────────────────────────
async function loadAllBorrows() {
  const records = await api('/borrow/all');
  const container = document.getElementById('all-borrows-content');
  if (!records.length) { container.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">swap_horiz</span><p>No borrow records</p></div>'; return; }
  container.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>User</th><th>Book</th><th>Borrowed</th><th>Due</th><th>Returned</th><th>Status</th></tr></thead><tbody>${records.map(r => `<tr><td>${r.full_name} <span style="color:var(--text-muted);font-size:0.78rem">@${r.username}</span></td><td style="color:var(--text-primary);font-weight:600">${r.title}</td><td>${formatDate(r.borrow_date)}</td><td>${formatDate(r.due_date)}</td><td>${formatDate(r.return_date)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td></tr>`).join('')}</tbody></table></div>`;
}

// ─── Admin: All Reservations ────────────────────────────────────────────────
async function loadAllReservations() {
  const res = await api('/reservations/all');
  const container = document.getElementById('all-reservations-content');
  if (!res.length) { container.innerHTML = '<div class="empty-state"><span class="material-symbols-rounded">pending_actions</span><p>No reservations</p></div>'; return; }
  container.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>User</th><th>Book</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>${res.map(r => `<tr><td>${r.full_name} <span style="color:var(--text-muted);font-size:0.78rem">@${r.username}</span></td><td style="color:var(--text-primary);font-weight:600">${r.title}</td><td>${formatDate(r.reserved_at)}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td>${r.status === 'pending' ? `<div style="display:flex;gap:0.4rem"><button class="btn btn-sm btn-success" onclick="updateReservation(${r.id},'approved')">Approve</button><button class="btn btn-sm btn-danger" onclick="updateReservation(${r.id},'rejected')">Reject</button></div>` : '—'}</td></tr>`).join('')}</tbody></table></div>`;
}

async function updateReservation(id, status) {
  try { await api(`/reservations/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); toast(`Reservation ${status}`, 'success'); loadAllReservations(); } catch (e) { toast(e.message, 'error'); }
}

// ─── Admin: Users ───────────────────────────────────────────────────────────
async function loadUsers() {
  const users = await api('/users');
  const container = document.getElementById('users-content');
  container.innerHTML = `<div class="table-wrapper"><table><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${users.map(u => `<tr><td style="color:var(--text-primary);font-weight:600">${u.full_name}</td><td>@${u.username}</td><td>${u.email}</td><td><span class="status-badge ${u.role === 'admin' ? 'borrowed' : 'approved'}">${u.role}</span></td><td>${formatDate(u.created_at)}</td></tr>`).join('')}</tbody></table></div>`;
}

// ─── Modal ──────────────────────────────────────────────────────────────────
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }
document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('modal-overlay')?.addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

// ─── Init ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  document.querySelectorAll('.nav-item').forEach(n => n.addEventListener('click', () => navigateTo(n.dataset.view)));
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  if (state.token && state.user) showApp(); 
});
