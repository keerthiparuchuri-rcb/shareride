# 🚗 RouteMates — Smart Ride Sharing Platform

RouteMates is a ride-sharing platform designed to connect people traveling along similar routes, helping them coordinate rides, reduce travel costs, and make commuting more convenient.

## ✨ Features

- 🔐 **User Authentication** — Sign up, email verification, and login.
- 🚘 **Offer a Ride** — Publish ride details, available seats, and travel routes.
- 🔎 **Find a Ride** — Search for rides based on source, destination, and travel details.
- 🗺️ **Interactive Maps** — OpenStreetMap integration for map display and route visualization.
- 📅 **Ride Booking** — Request and manage ride bookings.
- 🔔 **Notifications** — Receive updates about booking activity.
- 👤 **User Profiles** — Manage account and profile information.
- 🛡️ **Safety Features** — Support for safety-related information and reports.

## 🛠️ Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Styling:** Tailwind CSS
- **Backend and Database:** Supabase
- **Maps:** OpenStreetMap, Leaflet
- **Geocoding:** Nominatim
- **Route Services:** OSRM

## ⚙️ Local Setup

### Prerequisites

- Node.js and npm
- A Supabase project

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/keerthiparuchuri-rcb/shareride.git
   ```

2. Open the project folder:

   ```bash
   cd shareride
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create a `.env` file in the project root and configure your environment variables:

   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   VITE_NOMINATIM_URL=https://nominatim.openstreetmap.org
   VITE_OSRM_URL=https://router.project-osrm.org
   ```

5. Configure your Supabase database using the migration file in `supabase/migrations/`.

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Create a production build:

   ```bash
   npm run build
   ```

## 🔒 Security

- Never commit `.env` files or private credentials.
- Configure Supabase Row Level Security (RLS) policies appropriately.
- Validate ride and booking operations on the server/database.
- Protect user and location data.

## 🚀 Deployment

The frontend can be deployed using a hosting provider such as Vercel. Configure the required environment variables and Supabase authentication redirect URLs before testing the live application.

## 🎯 Project Goal

RouteMates aims to make everyday travel more affordable and convenient by helping people share rides along similar routes.

## 📄 License

No license has been specified yet.
