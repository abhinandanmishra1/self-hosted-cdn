import { Octokit } from '@octokit/rest';
import basicAuth from 'express-basic-auth';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import serverless from 'serverless-http';

dotenv.config();

const users = {
    [process.env.ACCESS_USERNAME]: process.env.ACCESS_PASSWORD
};

const authMiddleware = basicAuth({
    users: users,
    challenge: true,
    realm: 'BlinkCDN'
});

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static('public'));

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;
const BRANCH = process.env.BRANCH_NAME || 'main';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

router.post('/upload', authMiddleware, async (req, res) => {
    const { filePath, content, commitMessage } = req.body;

    if (!filePath || !content) {
        return res.status(400).json({ success: false, error: 'File path and content are required' });
    }

    try {
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
            console.log('File does not exist yet');
        }

        const base64Data = content.replace(/^data:image\/\w+;base64,/, '');

        const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: filePath,
            message: commitMessage || `Upload ${filePath}`,
            content: base64Data,
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
    const { page = 1, per_page = 12, search = '' } = req.query;

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

        let filteredImages = data
            .filter((item) => item.type === 'file' && /\.(png|jpe?g|gif|webp|svg)$/i.test(item.name));

        if (search) {
            const term = search.toString().toLowerCase();
            filteredImages = filteredImages.filter(item => item.name.toLowerCase().includes(term));
        }

        const start = (page - 1) * per_page;
        const end = page * per_page;
        const pagedImages = filteredImages.slice(start, end);

        const images = pagedImages.map((item) => ({
            name: item.name,
            download_url: item.download_url,
            url: "/images/" + item.name
        }));

        res.json({
            success: true,
            images,
            total: filteredImages.length,
            page: parseInt(page),
            per_page: parseInt(per_page),
            has_more: end < filteredImages.length
        });

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        if (error.status === 404) {
            return res.json({ success: true, images: [], total: 0 });
        }
        res.status(500).json({ success: false, error: 'Error fetching images' });
    }
});

app.use('', router);

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export const handler = serverless(app);