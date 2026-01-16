const express = require('express');
const router = express.Router();
const Parser = require('rss-parser');
const parser = new Parser();

// Helper function to map departments to job search keywords
function getDepartmentKeywords(department) {
    const keywordMap = {
        'Computer Science & Engineering': 'software+OR+developer+OR+programmer+OR+IT+OR+computer',
        'Electrical & Electronic Engineering': 'electrical+OR+electronics+OR+power+OR+telecommunication',
        'Mechanical Engineering': 'mechanical+OR+manufacturing+OR+automotive',
        'Civil Engineering': 'civil+OR+construction+OR+infrastructure+OR+structural',
        'Business Administration': 'business+OR+management+OR+MBA+OR+marketing+OR+finance',
        'Economics': 'economics+OR+economist+OR+finance+OR+banking',
        'English': 'english+OR+teaching+OR+content+OR+writing+OR+literature',
        'Mathematics': 'mathematics+OR+statistics+OR+data+OR+analyst',
        'Physics': 'physics+OR+research+OR+laboratory',
        'Chemistry': 'chemistry+OR+pharmaceutical+OR+laboratory',
        'Biology': 'biology+OR+biotechnology+OR+research',
        'Pharmacy': 'pharmacy+OR+pharmaceutical+OR+pharmacist',
        'Architecture': 'architecture+OR+architect+OR+design',
        'Textile Engineering': 'textile+OR+garment+OR+fashion',
        'Law': 'law+OR+legal+OR+lawyer+OR+attorney',
        'Medicine': 'medical+OR+doctor+OR+healthcare+OR+hospital'
    };
    return keywordMap[department] || 'education';
}

// Helper function to map departments to news search keywords
function getDepartmentNewsKeywords(department) {
    const newsKeywordMap = {
        'Computer Science & Engineering': 'software+OR+AI+OR+technology+OR+programming+OR+computer+science',
        'Electrical & Electronic Engineering': 'electrical+OR+electronics+OR+robotics+OR+automation',
        'Mechanical Engineering': 'mechanical+OR+engineering+OR+manufacturing+OR+innovation',
        'Civil Engineering': 'civil+engineering+OR+construction+OR+infrastructure+OR+architecture',
        'Business Administration': 'business+OR+entrepreneurship+OR+startup+OR+management',
        'Economics': 'economics+OR+economy+OR+finance+OR+trade',
        'English': 'literature+OR+language+OR+writing+OR+english',
        'Mathematics': 'mathematics+OR+statistics+OR+data+science',
        'Physics': 'physics+OR+quantum+OR+research+OR+science',
        'Chemistry': 'chemistry+OR+chemical+OR+research',
        'Biology': 'biology+OR+biotechnology+OR+life+science',
        'Pharmacy': 'pharmacy+OR+pharmaceutical+OR+medicine',
        'Architecture': 'architecture+OR+design+OR+urban+planning',
        'Textile Engineering': 'textile+OR+garment+OR+fashion+industry',
        'Law': 'law+OR+legal+OR+judiciary+OR+court',
        'Medicine': 'medical+OR+healthcare+OR+doctor+OR+hospital'
    };
    return newsKeywordMap[department] || 'education+OR+university+OR+research';
}

router.get('/', async (req, res) => {
    try {
        const userDepartment = req.session.user?.department;

        // Build NEWS search query based on department
        let newsQuery = 'Bangladesh+';
        if (userDepartment && userDepartment !== 'Other') {
            const newsKeywords = getDepartmentNewsKeywords(userDepartment);
            newsQuery += `(${newsKeywords})+news`;
        } else {
            newsQuery += '(education+OR+innovation+OR+invention+OR+university+OR+research)+news';
        }

        // Build JOB search query based on department
        let jobQuery = 'Bangladesh+(job+circular+OR+employment+OR+recruitment)';
        if (userDepartment && userDepartment !== 'Other') {
            const deptKeywords = getDepartmentKeywords(userDepartment);
            jobQuery += `+(${deptKeywords})`;
        } else {
            jobQuery += '+education';
        }

        const NEWS_RSS_URL = `https://news.google.com/rss/search?q=${newsQuery}&hl=en-BD&gl=BD&ceid=BD:en`;
        const JOBS_RSS_URL = `https://news.google.com/rss/search?q=${jobQuery}&hl=en-BD&gl=BD&ceid=BD:en`;

        // Fetch both feeds in parallel
        const [newsFeed, jobsFeed] = await Promise.all([
            parser.parseURL(NEWS_RSS_URL),
            parser.parseURL(JOBS_RSS_URL)
        ]);

        // Process items to look nicer (limit to 15 each)
        const news = newsFeed.items.slice(0, 15).map(item => ({
            title: item.title,
            link: item.link,
            pubDate: new Date(item.pubDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            source: item.source || 'Google News',
            snippet: item.contentSnippet || ''
        }));

        const jobs = jobsFeed.items.slice(0, 15).map(item => ({
            title: item.title,
            link: item.link,
            pubDate: new Date(item.pubDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
            source: item.source || 'Google News',
            snippet: item.contentSnippet || ''
        }));

        res.render('pages/portal', {
            title: 'News & Jobs Portal - EduShare Connect',
            user: req.session.user,
            news,
            jobs
        });
    } catch (error) {
        console.error('RSS Feed Error:', error);
        res.render('pages/portal', {
            title: 'News & Jobs Portal - EduShare Connect',
            user: req.session.user,
            news: [],
            jobs: [],
            error: 'Unable to load news data at this time.'
        });
    }
});

module.exports = router;
