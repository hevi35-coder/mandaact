const fs = require('fs');
const path = require('path');
const https = require('https');

// --- Configuration ---
const FILE_PATH = path.join(__dirname, '../docs/marketing/DEVTO_CONTENT_DRAFTS.md');

// Try to load from .env.local manually if not set
if (!process.env.DEVTO_API_KEY) {
    try {
        const envPath = path.join(__dirname, '../.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/^DEVTO_API_KEY=(.*)$/m);
            if (match) {
                process.env.DEVTO_API_KEY = match[1].trim();
                console.log("✅ Loaded API Key from .env.local");
            }
        }
    } catch (e) {
        // Ignore error
    }
}

const API_KEY = process.env.DEVTO_API_KEY;

// --- 1. Validation Checks ---
console.log("🔍 Running Pre-flight Checks...");

if (!API_KEY) {
    console.error("❌ Error: DEVTO_API_KEY is not set.");
    console.error("   Please add 'DEVTO_API_KEY=your_key' to your .env.local file");
    console.error("   OR run: export DEVTO_API_KEY='your_key'");
    process.exit(1);
}

if (!fs.existsSync(FILE_PATH)) {
    console.error(`❌ Error: Draft file not found at: ${FILE_PATH}`);
    console.error("   Make sure the file exists.");
    process.exit(1);
}

const content = fs.readFileSync(FILE_PATH, 'utf8');

// Check for placeholders
if (content.includes("[App Store Link]") || content.includes("[Link to App Store]")) {
    console.error("❌ Error: Valid App Store Link NOT found.");
    console.error("   Found placeholder '[App Store Link]'. Please replace it with the real URL.");
    process.exit(1);
}

// Check for broken/case-sensitive image URLs (Vercel specific warning)
const imageMatches = content.match(/https:\/\/mandaact\.vercel\.app\/[^)\s]+/g) || [];
let hasImageWarning = false;
for (const url of imageMatches) {
    if (url.includes("Vision.png")) { // Known issue
        console.error(`❌ Error: Invalid image URL detected (Case Sensitivity).`);
        console.error(`   Found: ${url}`);
        console.error(`   Should be: .../01_vision.png (lowercase 'v')`);
        hasImageWarning = true;
    }
}

if (hasImageWarning) {
    process.exit(1);
}

console.log("✅ All checks passed.");

// --- 2. Publish Logic ---

const payload = JSON.stringify({
    article: {
        body_markdown: content
    }
});

const options = {
    hostname: 'dev.to',
    path: '/api/articles',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'api-key': API_KEY,
        'User-Agent': 'MandaAct-Publisher/1.0' // Good practice
    }
};

console.log("🚀 Publishing to Dev.to...");

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 201) {
            const response = JSON.parse(data);
            console.log("✅ Success! Article Created.");
            console.log(`   URL: ${response.url}`);
            console.log(`   ID:  ${response.id}`);
            console.log("   (Note: If published: false in frontmatter, it is saved as a Draft)");
        } else {
            console.error(`❌ Failed to publish. Status: ${res.statusCode}`);
            try {
                const error = JSON.parse(data);
                console.error("   Error Message:", error.error);
            } catch (e) {
                console.error("   Raw Response:", data);
            }
        }
    });
});

req.on('error', (e) => {
    console.error(`❌ Network Error: ${e.message}`);
});

req.write(payload);
req.end();
