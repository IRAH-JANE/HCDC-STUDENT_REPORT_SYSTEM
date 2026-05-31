Copy this and replace your current `README.md`.

````md
# Student Concern Reporting System

A web-based reporting system for Holy Cross of Davao College that allows students to submit school-related concerns, department staff to manage assigned reports, and administrators to monitor the full reporting workflow.

## Overview

The Student Concern Reporting System is designed to make school concern reporting more organized, trackable, and department-based. Students can submit concerns to the appropriate department or office, department staff can respond and update report status, and administrators can manage users, departments, and all submitted reports.

## Features

### Student

- Register using an official HCDC email address
- Login securely
- Submit reports or school concerns
- Add report details such as category, urgency, location, and description
- Upload photo evidence
- View submitted reports
- Track report status
- Reply to department staff through comments
- Receive notifications
- View personal profile information

### Department Staff

- View reports assigned to their department
- View complete report information
- View student information for non-anonymous reports
- Reply to student reports
- Update report status
- Transfer reports to another department when needed
- Receive notifications for new or transferred reports
- View report timeline and activity history

### Admin

- Monitor all reports
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
````

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

## System Name
**Student Concern Reporting System**

## Institution
**Holy Cross of Davao College**

## Purpose
This system was developed to help improve the reporting, routing, tracking, and resolution of student concerns within the school.

## License
This project is for academic and educational use.
