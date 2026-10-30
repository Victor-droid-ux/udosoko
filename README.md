# UDUSOK Postgraduate Admission Portal

Full-stack Node.js + MongoDB backend for the UDUSOK PG application portal.

## Features
- Student registration, login, email verification
- Full application form (personal info, programme, qualifications, O'Level)
- Document uploads (transcript, certificate, passport, etc.)
- Paystack payment integration for ₦15,000 application fee
- Application submission and status tracking
- Admin dashboard with stats, filters, and status management
- Email notifications (verification, confirmation, admission letter)

## Setup

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
nano .env
```
Fill in:
- `MONGODB_URI` — your MongoDB Atlas connection string
- `JWT_SECRET` — any long random string
- `SMTP_*` — Gmail SMTP settings (see Discover project setup)
- `PAYSTACK_SECRET_KEY` — from dashboard.paystack.com
- `PAYSTACK_PUBLIC_KEY` — from dashboard.paystack.com
- `SITE_URL` — your domain e.g. https://yourdomain.com
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` — for first admin account

### 3. Seed admin account
```bash
node src/seed-admin.js
```

### 4. Start server
```bash
npm run dev       # development
npm start         # production
```

### 5. PM2 (production)
```bash
npm install -g pm2
pm2 start src/server.js --name udusok-pg
pm2 save
pm2 startup
```

## Pages
| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/register` | Student registration |
| `/login` | Student login |
| `/dashboard` | Student application dashboard |
| `/status` | Public status checker |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | Public | Register student |
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Student | Get current student |
| PUT | /api/application/personal | Student | Update personal info |
| PUT | /api/application/programme | Student | Update programme |
| PUT | /api/application/qualifications | Student | Update qualifications |
| POST | /api/application/upload/:docType | Student | Upload document |
| POST | /api/application/submit | Student | Submit application |
| POST | /api/application/check-status | Public | Check status by app no + email |
| POST | /api/payment/initialize | Student | Start Paystack payment |
| GET | /api/payment/verify | Public | Paystack callback |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/applications | Admin | List all applications |
| PUT | /api/admin/applications/:id/status | Admin | Update application status |
