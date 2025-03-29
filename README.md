# Insmile AI - Dental Treatment Planning System

![Insmile AI Logo](/public/generated-icon.png)

## Overview

Insmile AI is a cutting-edge dental treatment planning system that leverages artificial intelligence to assist dental professionals in analyzing scans, creating treatment plans, and managing patient care. Built with modern web technologies, it provides an intuitive interface for dentists to streamline their workflow and improve patient outcomes.

## Features

- 🦷 **AI-Powered Scan Analysis**
  - Automatic detection of dental conditions
  - Cavity and anomaly identification
  - Treatment recommendations
  - Confidence scoring

- 📋 **Treatment Planning**
  - Create and manage detailed treatment plans
  - Track treatment progress
  - Set milestones and appointments
  - Cost estimation

- 👥 **Patient Management**
  - Comprehensive patient profiles
  - Medical history tracking
  - Appointment scheduling
  - Treatment history

- 📊 **Analytics & Reporting**
  - Treatment success rates
  - Patient progress tracking
  - Clinical insights
  - Custom report generation

- 🔐 **Role-Based Access Control**
  - Admin dashboard
  - Dentist portal
  - Secure authentication
  - Activity logging

## Tech Stack

- **Frontend:**
  - React 18
  - TypeScript
  - TailwindCSS
  - Shadcn/ui Components
  - React Query
  - Wouter for routing

- **Backend:**
  - Node.js
  - Express
  - TypeScript
  - Passport.js for authentication
  - Zod for validation

- **Database:**
  - Memory storage (for demo)
  - Easily extensible to PostgreSQL/MongoDB

- **AI/ML:**
  - Custom AI models for dental analysis
  - Token-based AI usage tracking

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/joshuarebo/Insmile-AI.git
   cd insmile-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=3000
   SESSION_SECRET=your_session_secret
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`.

### Authentication

1. Register a new account:
   - Click on the "Register" button
   - Fill in your details (full name, email, username, and password)
   - Submit the registration form

2. Login:
   - Use your registered username and password to log in
   - Upon successful login, you'll be redirected to the dashboard

## Project Structure

```
insmile-ai/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/      # React context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript type definitions
│   └── public/           # Static assets
├── server/                # Backend Express application
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic
│   ├── storage/          # Data storage implementation
│   └── types/            # TypeScript type definitions
└── shared/               # Shared types and utilities
    └── schema/           # Zod schemas for validation
```

## API Documentation

The API documentation is available at `/api-docs` when running in development mode. It includes detailed information about all available endpoints, request/response formats, and authentication requirements.

### Key Endpoints

- **Authentication:**
  - POST `/api/auth/register` - Register new user
  - POST `/api/auth/login` - User login
  - GET `/api/auth/user` - Get current user

- **Patients:**
  - GET `/api/patients` - List patients
  - POST `/api/patients` - Create patient
  - GET `/api/patients/:id` - Get patient details

- **Scans:**
  - GET `/api/scans` - List scans
  - POST `/api/scans` - Upload new scan
  - POST `/api/scans/:id/analyze` - Analyze scan
  - DELETE `/api/scans/:id` - Delete scan
  - POST `/api/scans/:id/report` - Generate report

- **Treatment Plans:**
  - GET `/api/treatment-plans` - List plans
  - POST `/api/treatment-plans` - Create plan
  - PUT `/api/treatment-plans/:id` - Update plan

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Repository

This project is hosted on GitHub: [https://github.com/joshuarebo/Insmile-AI](https://github.com/joshuarebo/Insmile-AI)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@insmile.ai or join our Slack community.

## Acknowledgments

- [Shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [TailwindCSS](https://tailwindcss.com/) for the utility-first CSS framework
- [React Query](https://tanstack.com/query/latest) for data fetching
- All contributors who have helped shape this project

---

Built with ❤️ by the Insmile AI team 