# Student Concern Reporting System

A web-based academic prototype for managing student concerns, department routing, report tracking, and administrative monitoring.

## Overview

The Student Concern Reporting System is designed to make school concern reporting more organized, trackable, and department-based. Students can submit concerns to a department or office, department staff can review and respond to assigned reports, and administrators can monitor the full reporting workflow.

This project was created for academic and demonstration purposes only.

## Features

### Student

- Register using an official school email account
- Login securely
- Submit school-related concerns
- Add report details such as category, urgency, location, and description
- Upload photo evidence
- View submitted reports
- Track report status
- Reply to department staff through comments
- Receive notifications
- View personal profile information

### Department Staff

- View reports assigned to their department or office
- View complete report information
- View student information for non-anonymous reports
- Reply to student reports
- Update report status
- Transfer reports to another department when needed
- Receive notifications for new or transferred reports
- View report timeline and activity history

### Admin

- Monitor all submitted reports
- View full report details
- Manage departments and offices
- Create department staff and admin accounts
- Manage users and profile details
- View activity logs
- Review report timelines and comments

## Tech Stack

- **Framework:** Next.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS / DaisyUI
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage
- **Deployment:** Vercel

## Project Structure

```txt
src/
├── app/
│   ├── admin/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── departments/
│   │   ├── users/
│   │   ├── activity-logs/
│   │   └── profile/
│   ├── department/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── profile/
│   ├── student/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── notifications/
│   │   └── profile/
│   ├── login/
│   ├── register/
│   └── api/
├── components/
├── lib/
└── styles/
```

## Getting Started
### Install dependencies
```bash
npm install
```

### Run the development server
```bash
npm run dev
```

Open the app in your browser:
```txt
http://localhost:3000
```

## Build Command
```bash
npm run build
```

## Start Command
```bash
npm start
```

## Development Command
```bash
npm run dev
```

## Environment Variables
Create a `.env.local` file in the root folder and add your Supabase credentials.
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
Do not commit `.env.local` to GitHub.

## System Name
**Student Concern Reporting System**

## Institution Context
This prototype was created using Holy Cross of Davao College as an academic project context.

## Disclaimer
This project is an academic prototype created for demonstration purposes only. It is not an official system of Holy Cross of Davao College and is not affiliated with, endorsed by, or maintained by the institution.
Any school name, logo, department name, or branding used in this project is for academic demonstration only.

## Purpose
This system was developed to help demonstrate how student concerns can be reported, routed, tracked, and resolved through a department-based reporting workflow.

## License
This project is for academic and educational use only.
