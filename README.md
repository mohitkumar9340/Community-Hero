<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# CommunityHero 🦸🏽‍♂️🦸🏻‍♀️

CommunityHero is an AI-powered, gamified civic engagement platform designed to bridge the gap between citizens and municipal authorities. It streamlines the reporting, tracking, and resolution of civic issues (like potholes, broken streetlights, or waste management) using artificial intelligence and community-driven verification.

## 🌟 Features

### For Citizens
* **Interactive Map:** Discover, report, and track civic issues directly on a live, interactive map.
* **AI-Assisted Reporting:** Simply describe the issue, and our AI (Google Gemini) will automatically categorize it, assign a priority, and check for duplicates in the area.
* **Gamification:** Earn XP, level up, and unlock unique achievement badges for reporting new issues, verifying existing ones, and participating in the community.
* **Community Feedback:** Upvote, verify, and comment on issues reported by your neighbors.

### For Administrators (Municipal Portal)
* **Real-time Dashboard:** Track SLA breaches, average resolution times, and pending tasks by department.
* **Predictive Insights:** View AI-generated hotspots and predictions for recurring issues in specific zones.
* **AI Resolution Verification:** Upload "Before" and "After" photos when closing an issue, and let the AI visually verify the resolution before closing the ticket.

## 🚀 Tech Stack

* **Frontend:** React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts
* **Map Engine:** Leaflet, React-Leaflet
* **Backend:** Node.js, Express (bundled with ESBuild)
* **AI Integration:** Google Gemini API (Gemini 2.5 Flash)
* **Database & Auth:** Firebase (Cloud Firestore & Firebase Authentication)

## 🛠️ Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/communityhero.git
   cd communityhero
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your keys (refer to `.env.example`):
   ```env
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id

   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   npm run start
   ```

## 🔐 Authentication Flows

* **Citizens:** Can sign in using Google Auth or standard Email/Password authentication.
* **Administrators:** Can register and log in via the dedicated "Municipal Admin" portal by providing their department details. (Use `admin@newdelhi.gov.in` for the demo admin profile).

## 🤖 AI Integrations

* **Smart Categorization:** The Express server calls the Gemini API to extract entities and categorize natural language descriptions of issues.
* **Duplicate Detection:** When a user tries to report an issue, the system fetches nearby unresolved issues and asks the Gemini API if the new report is a likely duplicate.
* **Visual Verification:** Administrators use the Gemini Multimodal AI to upload before/after photos, providing a confidence score on whether the issue was properly resolved.

## 📄 License
This project is licensed under the MIT License.
