// debug-tgb-auth.js
// Run this to test your TGB authentication
import 'dotenv/config';

console.log('🔍 TGB Authentication Debug');
console.log('============================\n');

// 1. Check environment variables
console.log('1. Environment Variables:');
console.log('   TGB_USE_SANDBOX:', process.env.TGB_USE_SANDBOX);
console.log('   TGB_AUTH_MODE:', process.env.TGB_AUTH_MODE);
console.log('   TGB_USERNAME:', process.env.TGB_USERNAME ? `"${process.env.TGB_USERNAME}"` : 'NOT SET');
console.log('   TGB_USERNAME length:', process.env.TGB_USERNAME?.length ?? 0);
console.log('   TGB_PASSWORD:', process.env.TGB_PASSWORD ? '****' + process.env.TGB_PASSWORD.slice(-4) : 'NOT SET');
console.log('   TGB_PASSWORD length:', process.env.TGB_PASSWORD?.length ?? 0);
console.log('   TGB_STATIC_BEARER:', process.env.TGB_STATIC_BEARER ? 'SET' : 'NOT SET');
console.log('');

// 2. Check for hidden characters
console.log('2. Checking for hidden characters:');
if (process.env.TGB_USERNAME) {
  const usernameBytes = Buffer.from(process.env.TGB_USERNAME);
  console.log('   Username bytes:', usernameBytes);
  console.log('   Username trimmed:', `"${process.env.TGB_USERNAME.trim()}"`);
}
if (process.env.TGB_PASSWORD) {
  console.log('   Password first char code:', process.env.TGB_PASSWORD.charCodeAt(0));
  console.log('   Password last char code:', process.env.TGB_PASSWORD.charCodeAt(process.env.TGB_PASSWORD.length - 1));
}
console.log('');

// 3. Determine base URL
const useSandbox = process.env.TGB_USE_SANDBOX === 'true';
const baseUrl = useSandbox 
  ? (process.env.TGB_SANDBOX_BASE_URL || 'https://public-api.sandbox.thegivingblock.com')
  : (process.env.TGB_BASE_URL || 'https://public-api.tgbwidget.com');

console.log('3. API Configuration:');
console.log('   Using Sandbox:', useSandbox);
console.log('   Base URL:', baseUrl);
console.log('   Login URL:', `${baseUrl}/v1/login`);
console.log('');

// 4. Test login
async function testLogin() {
  console.log('4. Testing Login:');
  
  const login = process.env.TGB_USERNAME;
  const password = process.env.TGB_PASSWORD;
  
  if (!login || !password) {
    console.log('   ❌ ERROR: Username or password not set');
    return;
  }
  
  const payload = { login, password };
  console.log('   Payload:', JSON.stringify({ login, password: '****' }));
  
  try {
    const loginUrl = `${baseUrl}/v1/login`;
    console.log('   Calling:', loginUrl);
    
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('   Response status:', response.status);
    
    const text = await response.text();
    console.log('   Response body:', text);
    
    if (!response.ok) {
      console.log('   ❌ Login failed!');
      
      // Try to parse error
      try {
        const error = JSON.parse(text);
        console.log('   Error message:', error?.data?.errorMessage || error?.message || 'Unknown');
      } catch (e) {
        // Not JSON
      }
      return;
    }
    
    const data = JSON.parse(text);
    console.log('   ✅ Login successful!');
    
    // Try to extract token
    const access = data.access_token || data.accessToken || data.token || data?.data?.access_token || data?.data?.accessToken;
    const refresh = data.refresh_token || data.refreshToken || data?.data?.refresh_token || data?.data?.refreshToken;
    
    if (access) {
      console.log('   Access token (first 30 chars):', access.substring(0, 30) + '...');
      console.log('   Token starts with "Bearer":', access.startsWith('Bearer'));
    } else {
      console.log('   ⚠️  No access token found in response');
    }
    
    if (refresh) {
      console.log('   Refresh token (first 30 chars):', refresh.substring(0, 30) + '...');
    }
    
  } catch (error) {
    console.log('   ❌ Request failed:', error.message);
    console.log('   Error:', error);
  }
}

testLogin();