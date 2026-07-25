# 📚 LRMS — Library Resource Management System

A modern, full-stack web application for managing library operations including book cataloging, borrowing, returns, reservations, and renewals. Built with a premium dark-themed UI featuring glassmorphism design, smooth animations, and a responsive layout.

---

## ✨ Features

### User Features
- **User Registration & Authentication** — Secure sign-up and login with JWT-based authentication
- **Book Catalog** — Browse, search, and filter books by title, author, ISBN, or category
- **Borrow Books** — Borrow available books with a 14-day loan period
- **Return Books** — Return borrowed books with a single click
- **Renew Books** — Extend your loan period (up to 2 renewals, 7 days each)
- **Reserve Books** — Place reservations on unavailable books
- **Borrowing History** — View your complete borrowing history and active loans
- **Dashboard** — Personal dashboard showing currently borrowed books and active reservations

### Admin Features
- **Admin Dashboard** — Overview with statistics: total books, members, active borrows, overdue items, and category breakdown
- **Manage Books** — Full CRUD: add, edit, and delete books from the catalog
- **Track All Borrows** — View all borrowing activity across all users
- **Manage Reservations** — Approve or reject pending book reservations
- **User Management** — View all registered users and their roles

---

## 🛠 Tech Stack

| Component        | Technology                       |
|------------------|----------------------------------|
| **Frontend**     | HTML5, CSS3 (Glassmorphism dark theme), Vanilla JavaScript |
| **Backend**      | Node.js with Express.js          |
| **Database**     | SQLite via better-sqlite3        |
| **Auth**         | JWT (JSON Web Tokens) + bcrypt   |
| **Fonts**        | Google Fonts (Inter)             |
| **Icons**        | Material Symbols Rounded         |

---

## 📋 Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yashasmario/LRMS.git
cd LRMS
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Server

```bash
npm start
```

The server will start at **http://localhost:3000**

### 4. Open in Browser

Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Credentials

The app comes pre-seeded with demo data including 15 books and two accounts:

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | `admin`  | `admin123` |
| User    | `demo`   | `user123`  |

---

## 📁 Project Structure

```
LRMS/
├── server.js            # Express backend — API routes, database, auth
├── package.json         # Project metadata and dependencies
├── LICENSE              # MIT License
├── .gitignore           # Git ignore rules
├── project-report.pdf   # Original project report document
├── public/              # Static frontend files
│   ├── index.html       # Single-page application shell
│   ├── style.css        # Premium dark theme with glassmorphism
│   └── app.js           # Frontend JavaScript (SPA logic)
└── lrms.db              # SQLite database (auto-generated on first run)
```

---

## 🗄 Database Schema

The application uses SQLite with the following tables:

### `users`
| Column     | Type     | Description              |
|------------|----------|--------------------------|
| id         | INTEGER  | Primary key              |
| username   | TEXT     | Unique username          |
| email      | TEXT     | Unique email             |
| password   | TEXT     | Bcrypt-hashed password   |
| full_name  | TEXT     | Display name             |
| role       | TEXT     | `user` or `admin`        |
| created_at | DATETIME | Account creation date    |

### `books`
| Column          | Type     | Description              |
|-----------------|----------|--------------------------|
| id              | INTEGER  | Primary key              |
| title           | TEXT     | Book title               |
| author          | TEXT     | Author name              |
| isbn            | TEXT     | Unique ISBN (optional)   |
| category        | TEXT     | Book category            |
| total_copies    | INTEGER  | Total copies in library  |
| available_copies| INTEGER  | Currently available      |
| description     | TEXT     | Book description         |
| added_at        | DATETIME | Date added to catalog    |

### `borrow_records`
| Column      | Type     | Description                  |
|-------------|----------|------------------------------|
| id          | INTEGER  | Primary key                  |
| user_id     | INTEGER  | FK → users                   |
| book_id     | INTEGER  | FK → books                   |
| borrow_date | DATETIME | When borrowed                |
| due_date    | DATETIME | When due for return          |
| return_date | DATETIME | When actually returned       |
| renewals    | INTEGER  | Number of renewals (max 2)   |
| status      | TEXT     | `borrowed`, `returned`, `overdue` |

### `reservations`
| Column      | Type     | Description                  |
|-------------|----------|------------------------------|
| id          | INTEGER  | Primary key                  |
| user_id     | INTEGER  | FK → users                   |
| book_id     | INTEGER  | FK → books                   |
| reserved_at | DATETIME | When reservation was placed  |
| status      | TEXT     | `pending`, `approved`, `rejected`, `fulfilled`, `cancelled` |

---

## 🔌 API Reference

All API endpoints are prefixed with `/api`.

### Authentication
| Method | Endpoint           | Description              | Auth Required |
|--------|--------------------|--------------------------|---------------|
| POST   | `/auth/register`   | Register a new user      | No            |
| POST   | `/auth/login`      | Login and get JWT token  | No            |
| GET    | `/auth/me`         | Get current user profile | Yes           |

### Books
| Method | Endpoint             | Description              | Auth Required |
|--------|----------------------|--------------------------|---------------|
| GET    | `/books`             | List/search books        | No            |
| GET    | `/books/categories`  | List all categories      | No            |
| GET    | `/books/:id`         | Get book details         | No            |
| POST   | `/books`             | Add a new book           | Admin         |
| PUT    | `/books/:id`         | Update a book            | Admin         |
| DELETE | `/books/:id`         | Delete a book            | Admin         |

### Borrowing
| Method | Endpoint             | Description              | Auth Required |
|--------|----------------------|--------------------------|---------------|
| POST   | `/borrow`            | Borrow a book            | Yes           |
| POST   | `/borrow/:id/return` | Return a borrowed book   | Yes           |
| POST   | `/borrow/:id/renew`  | Renew a borrowed book    | Yes           |
| GET    | `/borrow/my`         | Get user's borrow history| Yes           |
| GET    | `/borrow/all`        | Get all borrow records   | Admin         |

### Reservations
| Method | Endpoint                    | Description              | Auth Required |
|--------|-----------------------------|--------------------------|---------------|
| POST   | `/reservations`             | Reserve a book           | Yes           |
| GET    | `/reservations/my`          | Get user's reservations  | Yes           |
| GET    | `/reservations/all`         | Get all reservations     | Admin         |
| PUT    | `/reservations/:id/status`  | Approve/reject           | Admin         |
| DELETE | `/reservations/:id`         | Cancel a reservation     | Yes           |

### Admin
| Method | Endpoint   | Description              | Auth Required |
|--------|------------|--------------------------|---------------|
| GET    | `/stats`   | Dashboard statistics     | Admin         |
| GET    | `/users`   | List all users           | Admin         |

---

## ⚙️ Configuration

| Environment Variable | Default                              | Description              |
|----------------------|--------------------------------------|--------------------------|
| `PORT`               | `3000`                               | Server port              |
| `JWT_SECRET`         | `lrms-secret-key-change-in-production` | JWT signing secret     |

Example:
```bash
PORT=8080 JWT_SECRET=my-super-secret npm start
```

---

## 🎨 UI Design

The frontend features a **premium dark theme** with:
- **Glassmorphism** — Frosted glass card effects with backdrop blur
- **Animated gradient orbs** — Floating background elements on the auth screen
- **Micro-animations** — Smooth hover effects, transitions, and page slide-ins
- **Material Design Icons** — Google Material Symbols for consistent iconography
- **Responsive layout** — Mobile-friendly with a collapsible sidebar
- **Status badges** — Color-coded badges for borrow/reservation statuses

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Yashas V. Kumar**

---

## 🙏 Acknowledgements

- [Express.js](https://expressjs.com/) — Web framework for Node.js
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — Fast, synchronous SQLite3 for Node.js
- [Google Fonts](https://fonts.google.com/) — Inter typeface
- [Material Symbols](https://fonts.google.com/icons) — Icon library
