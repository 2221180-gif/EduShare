require("dotenv").config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Invalid file type'));
    }
});

// --------------------------------------
// Page Render Route
// --------------------------------------
router.get('/chat', (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.render("pages/ai-chat", { title: "AI Assistant", user: req.session.user });
});

// --------------------------------------
// 1️⃣ Chat API using Arcee Trinity Mini
// --------------------------------------
router.post('/chat', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions",
            {
                model: "arcee-ai/trinity-mini:free",
                messages: [
                    { role: "system", content: "You are an educational assistant for EduShare. Be helpful and friendly." },
                    { role: "user", content: message }
                ],
                reasoning: { enabled: true }
            }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        res.json({
            success: true,
            response: response.data.choices[0].message.content
        });

    } catch (e) {
        console.error("OpenRouter Error:", e.response?.data || e.message);
        res.status(500).json({ error: "AI Failed, Try again later" });
    }
});

// --------------------------------------
// 2️⃣ Analyze File using AI
// --------------------------------------
router.post('/analyze-file', upload.single('file'), async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: "Unauthorized" });

    try {
        if (!req.file) return res.status(400).json({ error: "No File Uploaded" });

        let extractedText = "";
        const type = req.file.mimetype;

        if (type === "application/pdf") {
            const pdfData = await pdfParse(req.file.buffer);
            extractedText = pdfData.text;
        }
        else if (type.startsWith("image/")) {
            return res.json({ success: true, response: "Image reading not supported yet. Convert to PDF or text." });
        }
        else if (type === "text/plain") {
            extractedText = req.file.buffer.toString("utf-8");
        }

        if (!extractedText) return res.status(400).json({ error: "Couldn't extract text" });

        const { action } = req.body;
        let prompt = "";

        if (action === "summary") prompt = `Summarize this document:\n${extractedText.slice(0, 8000)}`;
        else if (action === "help") prompt = `Explain and guide the study topic from this document:\n${extractedText.slice(0, 8000)}`;
        else prompt = `Analyze and give insights:\n${extractedText.slice(0, 8000)}`;

        const ai = await axios.post("https://openrouter.ai/api/v1/chat/completions",
            {
                model: "arcee-ai/trinity-mini:free",
                messages: [{ role: "user", content: prompt }]
            }, {
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        res.json({
            success: true,
            file: req.file.originalname,
            response: ai.data.choices[0].message.content
        });

    } catch (e) {
        console.error("File Analysis Error:", e.message);
        res.status(500).json({ error: "File Processing Failed" });
    }
});

module.exports = router;
