const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store pending verifications
const pendingVerifications = new Map();

// 1. CLI requests a device code
app.post('/v1/auth/device/code', (req, res) => {
  const deviceCode = uuidv4();
  const userCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  console.log(`[1] Device code requested: ${deviceCode}, User code: ${userCode}`);
  
  pendingVerifications.set(deviceCode, {
    userCode: userCode,
    verified: false,
    email: null,
    expiresAt: Date.now() + 300000
  });
  
  res.json({
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `http://localhost:3000/verify?code=${userCode}`,
    expires_in: 300,
    interval: 5
  });
});

// 2. Browser verification page
app.get('/verify', (req, res) => {
  const code = req.query.code;
  console.log(`[2] Verification page accessed for code: ${code}`);
  
  // Find device by user code
  let foundDeviceCode = null;
  for (const [deviceCode, data] of pendingVerifications) {
    console.log(`  Checking: ${data.userCode} == ${code} ? ${data.userCode === code}`);
    if (data.userCode === code && !data.verified && Date.now() < data.expiresAt) {
      foundDeviceCode = deviceCode;
      break;
    }
  }
  
  if (!foundDeviceCode) {
    console.log(`[2] No device found for code: ${code}`);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>RealityDB Auth</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Invalid or Expired Code</h1>
        <p>Please run <code>realitydb login</code> again to get a new code.</p>
      </body>
      </html>
    `);
    return;
  }
  
  console.log(`[2] Device found, showing verification page`);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RealityDB Authentication</title>
      <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        input { padding: 10px; width: 250px; margin: 10px; font-size: 16px; }
        button { padding: 10px 20px; background: #28a745; color: white; border: none; cursor: pointer; font-size: 16px; }
      </style>
    </head>
    <body>
      <h1>🔐 RealityDB Authentication</h1>
      <p>Code: <strong>${code}</strong></p>
      <form method="POST" action="/verify-submit">
        <input type="hidden" name="code" value="${code}" />
        <input type="email" name="email" placeholder="Enter your email address" required />
        <br/>
        <button type="submit">Authenticate</button>
      </form>
    </body>
    </html>
  `);
});

// 3. Handle verification submission
app.post('/verify-submit', (req, res) => {
  const code = req.body.code;
  const email = req.body.email;
  
  console.log(`[3] Verification submission for code: ${code}, email: ${email}`);
  
  // Find and verify the device
  let foundDeviceCode = null;
  for (const [deviceCode, data] of pendingVerifications) {
    if (data.userCode === code && !data.verified && Date.now() < data.expiresAt) {
      foundDeviceCode = deviceCode;
      data.verified = true;
      data.email = email;
      console.log(`[3] Device verified: ${deviceCode}, email: ${email}`);
      break;
    }
  }
  
  if (!foundDeviceCode) {
    console.log(`[3] No device found for code: ${code}`);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>RealityDB Auth</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px;">
        <h1>❌ Invalid or Expired Code</h1>
        <p>Please try again.</p>
      </body>
      </html>
    `);
    return;
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>RealityDB Auth</title></head>
    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>✅ Successfully Authenticated!</h1>
      <p>You can now close this window and return to the CLI.</p>
      <script>setTimeout(function() { window.close(); }, 3000);</script>
    </body>
    </html>
  `);
});

// 4. CLI polls for token
app.post('/v1/auth/device/token', (req, res) => {
  const device_code = req.body.device_code;
  const grant_type = req.body.grant_type;
  
  console.log(`[4] Token poll received for device: ${device_code}`);
  
  const pending = pendingVerifications.get(device_code);
  
  if (!pending) {
    console.log(`[4] No pending verification for device: ${device_code}`);
    res.status(400).json({ error: 'invalid_device_code' });
    return;
  }
  
  console.log(`[4] Device found. Verified: ${pending.verified}, Email: ${pending.email}`);
  
  if (Date.now() > pending.expiresAt) {
    console.log(`[4] Device expired`);
    pendingVerifications.delete(device_code);
    res.status(400).json({ error: 'expired_token' });
    return;
  }
  
  if (!pending.verified) {
    console.log(`[4] Device not yet verified - sending authorization_pending`);
    res.status(400).json({ error: 'authorization_pending' });
    return;
  }
  
  // Success! Generate tokens
  console.log(`[4] Device verified! Sending tokens...`);
  
  const accessToken = 'access_' + uuidv4();
  const refreshToken = 'refresh_' + uuidv4();
  
  const license = {
    id: 'lic_' + uuidv4().slice(0, 8),
    tier: 'pro',
    email: pending.email,
    user_id: 'usr_' + uuidv4().slice(0, 12),
    issued_at: new Date().toISOString(),
    expires_at: null,
    features: ['16_tables', 'unlimited_rows', 'run', 'mask', 'capture'],
    seat_limit: null,
    organization_id: null,
    organization_name: null,
    signature: 'sig_' + uuidv4()
  };
  
  pendingVerifications.delete(device_code);
  
  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 86400,
    token_type: 'Bearer',
    license: license
  });
  
  console.log(`[4] Tokens sent successfully`);
});

// 5. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('🚀 RealityDB Auth Server running on http://localhost:' + PORT);
  console.log('   Verification URL: http://localhost:' + PORT + '/verify');
  console.log('');
});