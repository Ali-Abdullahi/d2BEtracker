# Destiny 2 Leaderboard Backend 🚀

A high-performance Node.js/Express backend that interfaces with the Bungie.net API to fetch, process, and rank Destiny 2 player statistics. Designed to power a custom React frontend leaderboard.

## ⚡ Features
* **Proxy Server:** securely handles requests to Bungie.net, hiding the API Key from the client.
* **Player Profile Search:** Resolves Bungie Names (Name#Code) to Membership IDs.
* **Historical Stats:** Fetches deep stats for specific modes:
    * Trials of Osiris
    * Iron Banner
    * Competitive (Comp)
* **Data Cleaning:** Filters raw Bungie JSON into clean, usable stats (KDA, KD, Win Rate).

## 🛠️ Tech Stack
* **Runtime:** Node.js
* **Framework:** Express.js
* **API:** Bungie.net Platform
* **Tools:** Dotenv (Environment Management), CORS

## ⚙️ Installation & Setup

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/YourUsername/D2BETracker.git](https://github.com/YourUsername/D2BETracker.git)
    cd D2BETracker
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file in the root directory and add your Bungie API Key:
    ```env
    BUNGIE_API_KEY=your_actual_api_key_here
    PORT=4001
    ```

4.  **Run the Server**
    ```bash
    node server.js
    ```
    *Server defaults to port 4001.*

## 📡 API Endpoints

### 1. Get Player Identifiers
**POST** `/api/player-full-profile`
* **Body:** `{ "displayName": "Name", "displayNameCode": "1234" }`
* **Returns:** `membershipId`, `membershipType`

### 2. Get Historical Stats
**GET** `/api/historical-stats/:membershipType/:membershipId`
* **Returns:** JSON object containing KDA, KD, and Win Rate for Trials, Iron Banner, and Comp.

---
*Built for the D2 Leaderboard Project.*