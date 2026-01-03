import { Octokit } from '@octokit/rest';
import basicAuth from 'express-basic-auth';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import serverless from 'serverless-http';
dotenv.config();

// authentication middleware
const users = {
    [process.env.ACCESS_USERNAME]: process.env.ACCESS_PASSWORD
};

const authMiddleware = basicAuth({
    users: users,
    challenge: true,
    realm: 'Self Hosted CDN'
});

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 3000;

let sessionId = 0;
app.use(authMiddleware);  // applying middleware

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const BRANCH = process.env.BRANCH_NAME || 'main';

const octokit = new Octokit({ auth: GITHUB_TOKEN });
router.post('/upload', async (req, res) => {
    const { filePath, content, commitMessage } = req.body;

    if (!filePath || !content) {
        return res.status(400).json({ success: false, error: 'File path and content are required' });
    }

    try {
        // First try to get the file to check if it exists
        let sha;
        try {
            const { data } = await octokit.rest.repos.getContent({
                owner: REPO_OWNER,
                repo: REPO_NAME,
                path: filePath,
                ref: BRANCH
            });
            sha = data.sha;
        } catch (error) {
            // File doesn't exist, which is fine
            console.log('File does not exist yet');
        }

        // Remove data URL prefix if it exists and convert to Buffer
        const base64Data = content.replace(/^data:image\/\w+;base64,/, '');

        // Create or update the file
        const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: filePath,
            message: commitMessage || `Upload ${filePath}`,
            content: base64Data,  // GitHub API expects base64 string without the data URL prefix
            branch: BRANCH,
            sha: sha,
            committer: {
                name: 'GitHub Uploader',
                email: 'noreply@github.com'
            }
        });

        res.json({
            success: true,
            url: response.data.content.html_url
        });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        if (error.response) {
            res.status(error.response.status).json({
                success: false,
                error: error.response.data.message || 'GitHub API error'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
});

router.get('/images', async (req, res) => {
    const { page = 1, per_page = 12 } = req.query;

    try {
        const { data } = await octokit.rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: 'public/images',
            ref: BRANCH
        });

        if (!Array.isArray(data)) {
            return res.status(400).json({ success: false, error: 'Images folder not found or is empty' });
        }

        const images = data
            .filter((item) => item.type === 'file' && /\.(png|jpe?g|gif)$/i.test(item.name))
            .slice((page - 1) * per_page, page * per_page)
            .map((item) => ({
                name: item.name,
                download_url: item.download_url,
                url: "/images/" + item.name
            }));

        res.json({ success: true, images });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Error fetching images' });
    }
});

// router.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// router.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'functions', 'public', 'gallery.html'));
// });

app.use('', router);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

export const handler = serverless(app);