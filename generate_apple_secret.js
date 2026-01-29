const crypto = require('crypto');
const fs = require('fs');

try {
    // Configuration
    const privateKeyPath = '/Users/jhsy/Downloads/AuthKey_9ZBZNXH62S.p8';
    const teamId = 'NRHYC97U5U'; // From app.json
    const keyId = '9ZBZNXH62S'; // From filename
    const clientId = 'com.mandaact.app'; // Bundle ID

    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

    const header = {
        alg: 'ES256',
        kid: keyId,
        typ: 'JWT'
    };

    const now = Math.floor(Date.now() / 1000);
    const exp = now + 15777000; // 6 months in seconds

    const payload = {
        iss: teamId,
        iat: now,
        exp: exp,
        aud: 'https://appleid.apple.com',
        sub: clientId
    };

    // Helper for Base64URL encoding
    function base64Url(str) {
        return Buffer.from(str).toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    function signES256(header, payload, privateKey) {
        const encodedHeader = base64Url(JSON.stringify(header));
        const encodedPayload = base64Url(JSON.stringify(payload));
        const data = `${encodedHeader}.${encodedPayload}`;

        const sign = crypto.createSign('SHA256');
        sign.update(data);
        sign.end();
        const signature = sign.sign(privateKey, 'base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        return `${data}.${signature}`;
    }

    const token = signES256(header, payload, privateKey);
    console.log(token);
} catch (error) {
    console.error('Error generating token:', error);
    process.exit(1);
}
