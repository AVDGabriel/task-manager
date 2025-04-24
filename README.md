# Task Manager

A modern task management application built with Next.js and Firebase.

## Features

- User authentication with Firebase
- Real-time task management
- Modern UI with Tailwind CSS
- Responsive design
- Toast notifications

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account

## Getting Started

1. Clone the repository:
```bash
git clone [repository-url]
cd task-manager
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory and add your Firebase configuration values. All of these variables are required for Firebase authentication and Firestore database functionality:

```env
# Required for Firebase Authentication and API access
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key

# Your Firebase Auth domain 
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain

# Your Firebase project ID
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id

# Your Firebase storage bucket
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket

# Firebase messaging sender ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id

# Your Firebase application ID
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Important**: The app requires all these environment variables to function properly as they are used for Firebase authentication and database operations.

To get your Firebase configuration values:
1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on the gear icon (⚙️) next to "Project Overview" to open project settings
4. In the "General" tab, scroll down to find your app's configuration
5. Copy the values and paste them into your `.env.local` file

Note: The `.env.local` file is listed in `.gitignore` and will not be committed to the repository, keeping your Firebase credentials secure.

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Start the production server
- `npm run lint` - Run ESLint to check for code issues

## Dependencies

### Core Dependencies
- `next` (15.3.1) - React framework for production
- `react` (19.0.0) - JavaScript library for building user interfaces
- `react-dom` (19.0.0) - React package for working with the DOM
- `firebase` (11.6.0) - Backend-as-a-Service platform for authentication and database
- `lucide-react` (0.501.0) - Icon library
- `react-hot-toast` (2.5.2) - Toast notification library

### Development Dependencies
- `typescript` (5) - TypeScript support
- `eslint` (9) - Code linting
- `@types/*` - TypeScript type definitions
- `tailwindcss` (4) - Utility-first CSS framework
- `@tailwindcss/postcss` (4) - PostCSS plugin for Tailwind CSS

## Project Structure

```
├── .next               # Next.js build output
├── node_modules        # Project dependencies
├── public             # Static files
├── src
│   ├── app           # Next.js app router pages
│   ├── components    # Reusable React components
│   ├── context       # React context providers
│   ├── hooks         # Custom React hooks
│   ├── lib           # Utility functions and configurations
│   └── types         # TypeScript type definitions
├── .env              # Environment variables
├── .env.local        # Local environment variables
├── .gitignore        # Git ignore rules
├── eslint.config.mjs # ESLint configuration
├── next-env.d.ts     # Next.js TypeScript declarations
├── next.config.ts    # Next.js configuration
├── package.json      # Project dependencies and scripts
├── postcss.config.mjs # PostCSS configuration
├── README.md         # Project documentation
├── tailwind.config.ts # Tailwind CSS configuration
└── tsconfig.json     # TypeScript configuration
```

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
