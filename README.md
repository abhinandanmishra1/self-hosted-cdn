# BlinkCDN ⚡️

**BlinkCDN** is a self-hosted CDN solution that gives you complete control over your assets. It leverages your **GitHub repository** as the storage backend and **Netlify's Edge Network** as the content delivery network.

> **Why?** Avoid paying for expensive S3 buckets or complex asset management systems. Hosting images on GitHub is free, version-controlled, and when combined with Netlify, incredibly fast.

<kbd><img width="1719" height="961" alt="Screenshot 2026-01-03 at 11 52 27 PM" src="https://github.com/user-attachments/assets/abbc41a6-5fed-4a16-aab0-080b502f63c5" /></kbd>

## Demo
https://github.com/user-attachments/assets/83fa93f8-6425-4098-9979-9e805b486965



## 🚀 Key Features

*   **Free Storage**: Uses your GitHub repository to store images.
*   **Global CDN**: Netlify caches your assets worldwide implicitly.
*   **No Database**: Zero database maintenance. Git is your database.
*   **Secure Dashboard**: Basic Auth protected upload interface.
*   **Drag & Drop**: Simple UI to upload images instantly.
*   **Instant Search**: Built-in gallery with real-time search.

## 🛠️ specific architecture

1.  **Storage**: Every image you upload is committed to your GitHub repository in the `public/images` folder.
2.  **Delivery**: 
    *   The `/dashboard` and `/upload` routes are handled by a serverless function (`server.js`) which acts as a secure gateway to the GitHub API.
    *   The `/images/*` routes are served as **static files** directly by Netlify. This means once an image is uploaded (and the site rebuilds/updates), it is served directly from Netlify's CDN nodes, not the slower serverless function.

## ⚙️ Setup Guide

### 1. Prerequisites
*   A [GitHub](https://github.com/) account.
*   A [Netlify](https://netlify.com/) account (Free tier is sufficient).

### 2. Generate GitHub Token
To allow BlinkCDN to upload images to your repository, you need a Personal Access Token (PAT).

1.  Go to **GitHub Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
2.  Click **Generate new token (classic)**.
3.  **Note**: "BlinkCDN Uploads".
4.  **Scopes**: Check the **`repo`** box (Full control of private repositories).
    *   *If your repo is public, `public_repo` might suffice, but `repo` is safer for writes.*
5.  Click **Generate token** and **COPY IT IMMEDIATELY**. You won't see it again.

### 3. Deploy to Netlify

1.  **Fork this Repository** to your own GitHub account.
2.  Log in to Netlify and click **"Add new site"** -> **"Import an existing project"**.
3.  Connect to GitHub and select your forked repository.
4.  Current settings should be auto-detected:
    *   **Build command**: `echo 'No build step required'` (or empty)
    *   **Publish directory**: `public`
    *   **Functions directory**: `functions`
5.  **Environment Variables**: Click "Add environment variables" and add the following:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `GITHUB_TOKEN` | The PAT you generated in step 2. | `ghp_abc123...` |
| `REPO_OWNER` | Your GitHub username. | `abhinandanmishra1` |
| `REPO_NAME` | The name of your repo. | `blinkcdn` |
| `BRANCH_NAME` | The branch to commit to. | `main` |
| `ACCESS_USERNAME` | Username for the dashboard. | `admin` |
| `ACCESS_PASSWORD` | Password for the dashboard. | `supersecretpassword` |

6.  Click **Deploy**.

## 💻 Local Development

1.  Clone your fork:
    ```bash
    git clone https://github.com/yourusername/self-hosted-cdn.git
    cd self-hosted-cdn
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file:
    ```bash
    cp .env.sample .env
    ```
    *Fill in your details in `.env`.*
4.  Start the dev server:
    ```bash
    npm run dev
    ```
5.  Visit `http://localhost:3000`.

## 🔒 Security Note

This project uses **HTTP Basic Auth** (`express-basic-auth`) to protect the dashboard.
*   **Is it safe?** Yes, effectively. Netlify serves all traffic over **HTTPS**, so your credentials are encrypted in transit.
*   **Recommendations**:
    *   Use a **strong, unique password** for `ACCESS_PASSWORD`.
    *   Do not share your `.env` file or commit it to GitHub.

---

**Happy Hosting!** ⚡️

## 🤝 Contributing

We welcome contributions! Please check out our [Contributing Guide](CONTRIBUTING.md) to get started.

---
