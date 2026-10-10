# SARGS - Smart Academic Repository & Governance System

![SARGS Banner](https://img.shields.io/badge/SARGS-Academic%20Governance-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-JNTU%20Engineering%20Colleges-orange)

## Overview

**SARGS** (Smart Academic Repository & Governance System) is a centralized, audit-grade platform designed for JNTU-affiliated engineering institutions to manage, verify, and govern every academic, administrative, and accreditation document with full role-based access, tamper-proof storage, and real-time compliance intelligence.

## 🎯 Key Features

### Security
- **Role-Based Access Control**: Eight-tier hierarchy enforced at database level via RLS policies
- **AES-256 Encrypted Storage**: Private, signed-URL storage with tamper detection via content hashing
- **Immutable Audit Log**: Every action recorded with actor, timestamp, and metadata
- **Version Control**: Track every revision with full lineage visibility for auditors

### Governance
- **Multi-Stage Approval**: Faculty → HOD → Dean → Principal → Locked workflow
- **Department Segmentation**: Role-scoped dashboards (HOD, Dean, Principal)
- **Deadline Intelligence**: Compliance reminders for NAAC, NBA, AICTE, JNTU renewals
- **Accreditation Readiness**: Automated scoring against NAAC/NBA requirements

### Intelligence
- **Smart Indexing**: Auto-tag by category, regulation (R20/R22/R25), department, academic year
- **Cloud-Native Storage**: Elastic, multi-tenant with backup and disaster recovery
- **8 Document Domains**: Academic, Student, Faculty, Accreditation, Administrative, Research, Infrastructure, Compliance
- **Role Dashboards**: Every role sees what matters - approvals, compliance alerts, workload, analytics

## 📋 Document Categories

1. **Academic Documents** - Syllabi, course files, lesson plans, timetables
2. **Student Records** - Admissions, results, attendance, grievances
3. **Faculty Files** - Credentials, performance, publications
4. **Accreditation** - NAAC, NBA, AICTE documentation
5. **Administrative** - Policies, circulars, financial records
6. **Research** - Projects, publications, patents
7. **Infrastructure** - Facilities, equipment, maintenance
8. **Compliance** - Regulatory submissions, audit reports

## 🏗️ Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Query
- **UI Components**: Radix UI, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Build Tool**: Vite
- **Deployment**: Cloudflare Workers (via Wrangler)
- **Package Manager**: npm/bun

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sankar068/sargs.git
cd sargs
```

2. Install dependencies:
```bash
npm install
# or
bun install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. Run database migrations:
```bash
# Use the SQL files in supabase/migrations/
# Execute RUN_THIS_ONCE.sql first in your Supabase SQL Editor
```

5. Start the development server:
```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:8080`

## 📁 Project Structure

```
sargs/
├── src/
│   ├── components/        # Reusable UI components
│   ├── routes/           # Page routes (TanStack Router)
│   ├── features/         # Feature-specific logic
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # External service integrations (Supabase)
│   ├── lib/              # Utility functions
│   └── assets/           # Static assets
├── supabase/
│   ├── migrations/       # Database migration files
│   └── config.toml       # Supabase configuration
└── public/               # Public static files
```

## 👥 User Roles

1. **Super Admin** - Full system access
2. **Principal** - Institution-wide oversight
3. **Dean** - College-level management
4. **HOD** - Department-level control
5. **Faculty** - Document creation and submission
6. **Staff** - Administrative support
7. **Clerk** - Data entry and basic operations
8. **Student** - View-only access to relevant documents

## 🔐 Security Features

- Row-Level Security (RLS) policies at database level
- Encrypted file storage with signed URLs
- Content hash verification for tamper detection
- Complete audit trail for all operations
- Multi-factor authentication support
- Session management and token refresh

## 📊 Compliance & Accreditation

- **NAAC** - National Assessment and Accreditation Council
- **NBA** - National Board of Accreditation
- **AICTE** - All India Council for Technical Education
- **JNTU** - Jawaharlal Nehru Technological University

Automated compliance tracking and document completeness scoring for all major accreditation bodies.

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Building for Production

```bash
npm run build
```

### Deployment

The application can be deployed to Cloudflare Workers:

```bash
npx wrangler deploy
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For enterprise inquiries, implementation support, or custom development:

- **Website**: [Your Website]
- **Email**: [Your Email]
- **GitHub**: [@sankar068](https://github.com/sankar068)

## 🌟 Acknowledgments

- Built for JNTU-affiliated engineering institutions
- Designed for NAAC, NBA, and AICTE compliance
- Inspired by real governance challenges in Tier-1 engineering colleges

---

**Made with ❤️ for Academic Excellence**
