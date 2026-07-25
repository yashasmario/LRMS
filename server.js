const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'lrms-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup
const db = new Database(path.join(__dirname, 'lrms.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT UNIQUE,
    category TEXT NOT NULL,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    cover_url TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS borrow_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    due_date DATETIME NOT NULL,
    return_date DATETIME,
    renewals INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'borrowed' CHECK(status IN ('borrowed', 'returned', 'overdue')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    reserved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
  );
`);

// ─── Seed data ─────────────────────────────────────────────────────────────────

const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hashedPw = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (username, email, password, full_name, role)
    VALUES (?, ?, ?, ?, ?)`).run('admin', 'admin@lrms.com', hashedPw, 'Library Admin', 'admin');

  const demoUserPw = bcrypt.hashSync('user123', 10);
  db.prepare(`INSERT INTO users (username, email, password, full_name, role)
    VALUES (?, ?, ?, ?, ?)`).run('demo', 'demo@lrms.com', demoUserPw, 'Demo User', 'user');

  // Seed books
  const books = [
    ['The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 'Fiction', 3, 3, 'A story of the fabulously wealthy Jay Gatsby and his love for Daisy Buchanan.'],
    ['To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 'Fiction', 2, 2, 'The unforgettable novel of a childhood in a sleepy Southern town.'],
    ['1984', 'George Orwell', '978-0451524935', 'Dystopian', 4, 4, 'A dystopian social science fiction novel and cautionary tale about the dangers of totalitarianism.'],
    ['Pride and Prejudice', 'Jane Austen', '978-0141439518', 'Romance', 2, 2, 'A romantic novel following the character development of Elizabeth Bennet.'],
    ['The Catcher in the Rye', 'J.D. Salinger', '978-0316769488', 'Fiction', 3, 3, 'The story of Holden Caulfield and his experiences in New York City.'],
    ['Sapiens: A Brief History of Humankind', 'Yuval Noah Harari', '978-0062316097', 'Non-Fiction', 2, 2, 'A narrative of humanity\'s creation and evolution.'],
    ['Clean Code', 'Robert C. Martin', '978-0132350884', 'Technology', 5, 5, 'A handbook of agile software craftsmanship.'],
    ['Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 'Technology', 3, 3, 'The leading textbook on computer algorithms.'],
    ['Design Patterns', 'Erich Gamma', '978-0201633610', 'Technology', 2, 2, 'Elements of Reusable Object-Oriented Software.'],
    ['The Art of War', 'Sun Tzu', '978-1590302255', 'Philosophy', 4, 4, 'An ancient Chinese military treatise dating from the 5th century BC.'],
    ['Database System Concepts', 'Abraham Silberschatz', '978-0078022159', 'Technology', 3, 3, 'Comprehensive database system concepts textbook.'],
    ['Software Engineering', 'Ian Sommerville', '978-0133943030', 'Technology', 2, 2, 'A broad perspective on software engineering.'],
    ['The Alchemist', 'Paulo Coelho', '978-0062315007', 'Fiction', 3, 3, 'A magical story about following your dreams.'],
    ['Brave New World', 'Aldous Huxley', '978-0060850524', 'Dystopian', 2, 2, 'A dystopian novel about a genetically engineered future society.'],
    ['The Hobbit', 'J.R.R. Tolkien', '978-0547928227', 'Fantasy', 4, 4, 'A children\'s fantasy novel about the adventures of Bilbo Baggins.'],
  ];

  const insertBook = db.prepare(`INSERT INTO books (title, author, isbn, category, total_copies, available_copies, description) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  for (const book of books) {
    insertBook.run(...book);
  }

  console.log('✓ Database seeded with demo data');
}

// ─── Auth Middleware ────────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ─── Auth Routes ────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const hashed = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)'
    ).run(username, email, hashed, full_name);
    const token = jwt.sign({ id: result.lastInsertRowid, username, role: 'user' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: result.lastInsertRowid, username, email, full_name, role: 'user' } });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, full_name: user.full_name, role: user.role } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ─── Book Routes ────────────────────────────────────────────────────────────────

app.get('/api/books', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM books';
  const params = [];
  const conditions = [];

  if (search) {
    conditions.push('(title LIKE ? OR author LIKE ? OR isbn LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category && category !== 'all') {
    conditions.push('category = ?');
    params.push(category);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY title ASC';
  const books = db.prepare(query).all(...params);
  res.json(books);
});

app.get('/api/books/categories', (req, res) => {
  const cats = db.prepare('SELECT DISTINCT category FROM books ORDER BY category').all();
  res.json(cats.map(c => c.category));
});

app.get('/api/books/:id', (req, res) => {
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  res.json(book);
});

app.post('/api/books', authenticate, adminOnly, (req, res) => {
  try {
    const { title, author, isbn, category, total_copies, description } = req.body;
    if (!title || !author || !category) {
      return res.status(400).json({ error: 'Title, author, and category are required' });
    }
    const copies = total_copies || 1;
    const result = db.prepare(
      'INSERT INTO books (title, author, isbn, category, total_copies, available_copies, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(title, author, isbn || null, category, copies, copies, description || null);
    const book = db.prepare('SELECT * FROM books WHERE id = ?').get(result.lastInsertRowid);
    res.json(book);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A book with that ISBN already exists' });
    }
    res.status(500).json({ error: 'Failed to add book' });
  }
});

app.put('/api/books/:id', authenticate, adminOnly, (req, res) => {
  const { title, author, isbn, category, total_copies, description } = req.body;
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Book not found' });

  const borrowed = existing.total_copies - existing.available_copies;
  const newTotal = total_copies || existing.total_copies;
  const newAvailable = Math.max(0, newTotal - borrowed);

  db.prepare(
    'UPDATE books SET title=?, author=?, isbn=?, category=?, total_copies=?, available_copies=?, description=? WHERE id=?'
  ).run(
    title || existing.title, author || existing.author, isbn || existing.isbn,
    category || existing.category, newTotal, newAvailable,
    description !== undefined ? description : existing.description, req.params.id
  );
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  res.json(book);
});

app.delete('/api/books/:id', authenticate, adminOnly, (req, res) => {
  const existing = db.prepare('SELECT * FROM books WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Book not found' });
  db.prepare('DELETE FROM reservations WHERE book_id = ?').run(req.params.id);
  db.prepare('DELETE FROM borrow_records WHERE book_id = ?').run(req.params.id);
  db.prepare('DELETE FROM books WHERE id = ?').run(req.params.id);
  res.json({ message: 'Book deleted' });
});

// ─── Borrow Routes ─────────────────────────────────────────────────────────────

app.post('/api/borrow', authenticate, (req, res) => {
  const { book_id } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.available_copies < 1) return res.status(400).json({ error: 'No copies available' });

  // Check if already borrowed
  const existing = db.prepare(
    'SELECT * FROM borrow_records WHERE user_id = ? AND book_id = ? AND status = ?'
  ).get(req.user.id, book_id, 'borrowed');
  if (existing) return res.status(400).json({ error: 'You already have this book borrowed' });

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // 14 day loan period

  db.prepare('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);
  const result = db.prepare(
    'INSERT INTO borrow_records (user_id, book_id, due_date) VALUES (?, ?, ?)'
  ).run(req.user.id, book_id, dueDate.toISOString());

  // Fulfill any pending reservation
  db.prepare(
    "UPDATE reservations SET status = 'fulfilled' WHERE user_id = ? AND book_id = ? AND status = 'approved'"
  ).run(req.user.id, book_id);

  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(result.lastInsertRowid);
  res.json(record);
});

app.post('/api/borrow/:id/return', authenticate, (req, res) => {
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (record.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (record.status === 'returned') return res.status(400).json({ error: 'Already returned' });

  db.prepare("UPDATE borrow_records SET status = 'returned', return_date = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  db.prepare('UPDATE books SET available_copies = available_copies + 1 WHERE id = ?').run(record.book_id);
  res.json({ message: 'Book returned successfully' });
});

app.post('/api/borrow/:id/renew', authenticate, (req, res) => {
  const record = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  if (record.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });
  if (record.status !== 'borrowed') return res.status(400).json({ error: 'Book is not currently borrowed' });
  if (record.renewals >= 2) return res.status(400).json({ error: 'Maximum renewals reached (2)' });

  const newDue = new Date(record.due_date);
  newDue.setDate(newDue.getDate() + 7); // 7 day renewal
  db.prepare('UPDATE borrow_records SET due_date = ?, renewals = renewals + 1 WHERE id = ?')
    .run(newDue.toISOString(), req.params.id);
  const updated = db.prepare('SELECT * FROM borrow_records WHERE id = ?').get(req.params.id);
  res.json(updated);
});

app.get('/api/borrow/my', authenticate, (req, res) => {
  const records = db.prepare(`
    SELECT br.*, b.title, b.author, b.isbn, b.category
    FROM borrow_records br
    JOIN books b ON br.book_id = b.id
    WHERE br.user_id = ?
    ORDER BY br.borrow_date DESC
  `).all(req.user.id);
  res.json(records);
});

app.get('/api/borrow/all', authenticate, adminOnly, (req, res) => {
  const records = db.prepare(`
    SELECT br.*, b.title, b.author, u.username, u.full_name
    FROM borrow_records br
    JOIN books b ON br.book_id = b.id
    JOIN users u ON br.user_id = u.id
    ORDER BY br.borrow_date DESC
  `).all();
  res.json(records);
});

// ─── Reservation Routes ────────────────────────────────────────────────────────

app.post('/api/reservations', authenticate, (req, res) => {
  const { book_id } = req.body;
  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  // Check for existing pending/approved reservation
  const existing = db.prepare(
    "SELECT * FROM reservations WHERE user_id = ? AND book_id = ? AND status IN ('pending', 'approved')"
  ).get(req.user.id, book_id);
  if (existing) return res.status(400).json({ error: 'You already have a reservation for this book' });

  const result = db.prepare(
    'INSERT INTO reservations (user_id, book_id) VALUES (?, ?)'
  ).run(req.user.id, book_id);
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(result.lastInsertRowid);
  res.json(reservation);
});

app.get('/api/reservations/my', authenticate, (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, b.title, b.author, b.available_copies
    FROM reservations r
    JOIN books b ON r.book_id = b.id
    WHERE r.user_id = ?
    ORDER BY r.reserved_at DESC
  `).all(req.user.id);
  res.json(reservations);
});

app.get('/api/reservations/all', authenticate, adminOnly, (req, res) => {
  const reservations = db.prepare(`
    SELECT r.*, b.title, b.author, u.username, u.full_name
    FROM reservations r
    JOIN books b ON r.book_id = b.id
    JOIN users u ON r.user_id = u.id
    ORDER BY r.reserved_at DESC
  `).all();
  res.json(reservations);
});

app.put('/api/reservations/:id/status', authenticate, adminOnly, (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be approved or rejected' });
  }
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  if (reservation.status !== 'pending') return res.status(400).json({ error: 'Reservation is not pending' });

  db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id);
  const updated = db.prepare(`
    SELECT r.*, b.title, b.author, u.username, u.full_name
    FROM reservations r
    JOIN books b ON r.book_id = b.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?
  `).get(req.params.id);
  res.json(updated);
});

app.delete('/api/reservations/:id', authenticate, (req, res) => {
  const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(req.params.id);
  if (!reservation) return res.status(404).json({ error: 'Reservation not found' });
  if (reservation.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }
  db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Reservation cancelled' });
});

// ─── Stats (admin) ──────────────────────────────────────────────────────────────

app.get('/api/stats', authenticate, adminOnly, (req, res) => {
  const totalBooks = db.prepare('SELECT COUNT(*) as count FROM books').get().count;
  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get().count;
  const activeBorrows = db.prepare("SELECT COUNT(*) as count FROM borrow_records WHERE status = 'borrowed'").get().count;
  const pendingReservations = db.prepare("SELECT COUNT(*) as count FROM reservations WHERE status = 'pending'").get().count;

  const overdue = db.prepare(
    "SELECT COUNT(*) as count FROM borrow_records WHERE status = 'borrowed' AND due_date < datetime('now')"
  ).get().count;

  const categoryStats = db.prepare(
    'SELECT category, COUNT(*) as count, SUM(total_copies) as total FROM books GROUP BY category ORDER BY count DESC'
  ).all();

  const recentBorrows = db.prepare(`
    SELECT br.*, b.title, u.username
    FROM borrow_records br
    JOIN books b ON br.book_id = b.id
    JOIN users u ON br.user_id = u.id
    ORDER BY br.borrow_date DESC LIMIT 5
  `).all();

  res.json({ totalBooks, totalUsers, activeBorrows, pendingReservations, overdue, categoryStats, recentBorrows });
});

// ─── Users (admin) ──────────────────────────────────────────────────────────────

app.get('/api/users', authenticate, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, username, email, full_name, role, created_at FROM users ORDER BY created_at DESC').all();
  res.json(users);
});

// ─── SPA fallback ───────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  📚 LRMS Server running at http://localhost:${PORT}\n`);
  console.log(`  Demo credentials:`);
  console.log(`    Admin  → username: admin  | password: admin123`);
  console.log(`    User   → username: demo   | password: user123\n`);
});
