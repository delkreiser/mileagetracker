# Gas Mileage Dashboard

A modern, clean web dashboard for tracking vehicle fuel efficiency and costs. Built with Next.js, React, and Tailwind CSS.

## Features

- 📊 Real-time data fetching from Google Sheets
- 📈 Interactive charts with Cost/Gallon and MPG trends
- 🎯 Key metrics with percentage changes
- ⏱️ Time period filtering (30 days, 90 days, year, all time)
- 🔄 Manual refresh button
- ➕ Quick access to Google Form for adding new fill-ups
- 📱 Fully responsive design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google Sheet with your gas mileage data
- Google Form for data entry

### Installation

1. Clone this repository:
```bash
git clone <your-repo-url>
cd gas-mileage-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment to Vercel

### Method 1: Deploy via Vercel Dashboard (Easiest)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Next.js - just click "Deploy"
6. Done! Your site will be live in ~30 seconds

### Method 2: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and your site will be live!

## Configuration

### Update Your Google Sheet ID

In `app/page.js`, update the `SHEET_ID` constant with your Google Sheet ID:

```javascript
const SHEET_ID = 'YOUR_GOOGLE_SHEET_ID';
```

### Update Your Google Form URL

In `app/page.js`, update the `FORM_URL` constant with your Google Form URL:

```javascript
const FORM_URL = 'YOUR_GOOGLE_FORM_URL';
```

## Project Structure

```
gas-mileage-dashboard/
├── app/
│   ├── layout.js          # Root layout with metadata
│   ├── page.js            # Main dashboard component
│   └── globals.css        # Global styles with Tailwind
├── public/                # Static assets (if needed)
├── .gitignore            # Git ignore file
├── next.config.js        # Next.js configuration
├── package.json          # Dependencies and scripts
├── postcss.config.js     # PostCSS configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── README.md             # This file
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart library for data visualization
- **Lucide React** - Icon library

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Google Sheets Setup

Your Google Sheet should have the following columns:
- Timestamp
- Odometer
- Trip Meter
- Total Gallons
- Total Fuel Cost
- Cost/Gallon

Make sure your sheet is published to the web:
1. File → Share → Publish to web
2. Choose "Entire Document" or specific sheet
3. Click "Publish"

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
