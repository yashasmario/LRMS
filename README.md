# LRMS — Library Resource Management System

A full-stack web application for managing library operations — book cataloging, borrowing, returns, reservations, and renewals.

## Features

**Users** can search and browse the catalog, borrow and return books, renew loans (up to 2 times), place reservations on unavailable books, and view their borrowing history.

**Admins** get a dashboard with statistics, full CRUD over the book inventory, user management, and the ability to approve or reject reservations.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend  | HTML, CSS, Vanilla JS |
| Backend   | Node.js + Express |
| Database  | SQLite (better-sqlite3) |
| Auth      | JWT + bcrypt |

## Getting Started

```bash
git clone https://github.com/yashasmario/LRMS.git
cd LRMS
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000).

### Demo Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | `admin`  | `admin123`|
| User  | `demo`   | `user123` |

## Project Structure

```
LRMS/
├── server.js          # Backend — API routes, database, auth
├── public/
│   ├── index.html     # SPA shell
│   ├── style.css      # Light theme styles
│   └── app.js         # Frontend logic
├── package.json
├── LICENSE            # MIT
└── lrms.db            # SQLite database (auto-generated)
```

## API

All endpoints are prefixed with `/api`.

### Auth
- `POST /auth/register` — Register a new user
- `POST /auth/login` — Login, returns JWT
- `GET /auth/me` — Current user profile (auth required)

### Books
- `GET /books` — List/search books (supports `?search=` and `?category=`)
- `GET /books/categories` — List categories
- `GET /books/:id` — Book details
- `POST /books` — Add book (admin)
- `PUT /books/:id` — Update book (admin)
- `DELETE /books/:id` — Delete book (admin)

### Borrowing
- `POST /borrow` — Borrow a book
- `POST /borrow/:id/return` — Return a book
- `POST /borrow/:id/renew` — Renew a loan
- `GET /borrow/my` — User's borrow history
- `GET /borrow/all` — All records (admin)

### Reservations
- `POST /reservations` — Reserve a book
- `GET /reservations/my` — User's reservations
- `GET /reservations/all` — All reservations (admin)
- `PUT /reservations/:id/status` — Approve/reject (admin)
- `DELETE /reservations/:id` — Cancel reservation

### Admin
- `GET /stats` — Dashboard statistics
- `GET /users` — List all users

## Configuration

| Variable     | Default | Description |
|--------------|---------|-------------|
| `PORT`       | `3000`  | Server port |
| `JWT_SECRET` | built-in default | JWT signing secret |

```bash
PORT=8080 JWT_SECRET=my-secret npm start
```

## License

MIT
