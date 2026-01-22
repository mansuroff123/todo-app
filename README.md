# 🚀 Todo Planner Monorepo 🚀

A professional, full-stack task management system featuring real-time notifications, smart recurring tasks, and Telegram bot integration. This project is built using a monorepo structure. 🏗️

## 🛠️ Tech Stack 🛠️
- 🔹 **Frontend:** AstroJS 🚀, SolidJS 🟦, TypeScript ⌨️, TailwindCSS 🎨.
- 🔹 **Backend:** Express.js 🚂, Node.js 🟢, TypeScript ⌨️.
- 🔹 **Database:** MySQL 🐬, Prisma ORM 💎.
- 🔹 **Services:** Socket.io (Real-time) 🔌, Node-cron (Automation) ⏰, Telegraf (Telegram Bot API) 🤖.

## 📂 Project Structure 📂
```plaintext
todo-app/ (Root)
├── 💻 server/         --> Backend (Express + Prisma)
├── 🌐 client/         --> Frontend (Astro + SolidJS)
├── 📜 .gitignore      --> Root git rules
└── 📖 README.md       --> Documentation
```

## ⚙️ Backend Setup (Server) ⚙️
1 Navigate to directory: `cd server` 📂  
2 Install dependencies: `npm install` 📦  
3 Configure Environment: Create a `.env` file and fill in the following: 📝
- **PORT:** Server port (e.g., 5000) 🔌
- **DATABASE_URL:** Your MySQL connection string 🐬
- **JWT_SECRET:** Your private secret key 🔑
- **TELEGRAM_BOT_TOKEN:** Token from BotFather 🤖
```bash
 cd server
 npm install
```
4 Initialize Database: 💎
```bash
 npx prisma db push
 npx prisma generate
```
5 Start Development Server: `npm run dev` 🚀

## 🎨 Frontend Setup (Client) 🎨
1 Navigate to directory: `cd client` 📂  
2 Install dependencies: `npm install` 📦  
3 Start Development Server: `npm run dev` 🚀
```


```
 cd client
 npm install
 npm run dev
```

## 📡 API Endpoints 📡
### 🔐 Authentication (/api/auth):
- POST `/register` — Create a new account ✨
- POST `/login` — Authenticate and receive JWT 🔑

### 📅 Todo Management (/api/todo):
- GET `/` — Fetch all personal and shared tasks 📝
- POST `/` — Create a new task ➕
- PATCH `/:id` — Update completion status ✅
- POST `/share` — Share a task with another user 🤝
- DELETE `/:id` — Remove a task (Owner only) 🗑️ \

## ✨ Key Features

- **🔐 Robust Authentication:** Secure user registration and login using JWT (JSON Web Tokens) and Zod for strict input validation.
- **📅 Smart Task Management:** Full CRUD operations for todos, including titles, detailed descriptions, and due dates.
- **🔄 Flexible Recurring Tasks:** Built-in logic for recurring reminders: Hourly, Daily, Weekly, and Monthly.
- **🤖 Telegram Bot Integration:** Automated reminders sent directly to your Telegram chat via a dedicated bot.
- **🤝 Collaborative Sharing:** Share tasks with other users and manage permissions (view/edit).
- **⚡ Real-time Notifications:** Instant alerts using WebSockets (Socket.io) when someone shares a task with you.

- **⏰ Reliable Cron Jobs:** Background processing for checking reminders every minute without manual intervention.
