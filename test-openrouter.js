require('dotenv').config();
const axios = require('axios');

async function testOpenRouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("❌ No API Key found in .env");
        return;
    }

    console.log(`🔑 Testing with API Key: ${apiKey.slice(0, 10)}...`);

    try {
        const response = await axios.post("https://openrouter.ai/api/v1/chat/completions",
            {
                model: "arcee-ai/trinity-mini:free",
                messages: [
                    { role: "user", content: "Hello, are you working?" }
                ]
            }, {
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000", // Optional
                "X-Title": "EduShare Connect" // Optional
            }
        });

        console.log("✅ Connection Successful!");
        console.log("📝 Response:", response.data.choices[0].message.content);

    } catch (error) {
        console.error("❌ Connection Failed:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testOpenRouter();
