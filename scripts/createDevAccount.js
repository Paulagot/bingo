/**
 * Create a development account for testing
 * Usage: node scripts/createDevAccount.js
 */

const MGMT_API_URL = process.env.MGMT_API_URL || 'http://localhost:3001/api';

async function createDevAccount() {
  console.log('🔧 Creating Development Account...\n');

  const devAccount = {
    name: 'Dev Test Account',
    email: 'dev@test.local',
    password: 'dev123456',
    gdprConsent: true,
    privacyPolicyAccepted: true,
    marketingConsent: false
  };

  console.log('Account Details:');
  console.log('  Email:', devAccount.email);
  console.log('  Password:', devAccount.password);
  console.log('  Name:', devAccount.name);
  console.log('');

  try {
    console.log(`📡 Sending registration request to: ${MGMT_API_URL}/clubs/register`);

    const response = await fetch(`${MGMT_API_URL}/clubs/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(devAccount),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Registration failed:', data.error || data.message);

      if (response.status === 409 || data.error?.includes('already exists')) {
        console.log('\n💡 Account already exists! You can log in with:');
        console.log('   Email:', devAccount.email);
        console.log('   Password:', devAccount.password);
        console.log('');
        console.log('   Login URL: http://localhost:5175/login');
        return;
      }

      throw new Error(data.error || `HTTP ${response.status}`);
    }

    console.log('✅ Registration successful!');
    console.log('');
    console.log('📧 Check if email verification is required.');
    console.log('   If so, check your backend logs for the verification link.');
    console.log('');
    console.log('🔐 Login credentials:');
    console.log('   Email:', devAccount.email);
    console.log('   Password:', devAccount.password);
    console.log('');
    console.log('🌐 Login at: http://localhost:5175/login');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating dev account:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('1. Make sure the management API server is running');
    console.log('2. Check the MGMT_API_URL:', MGMT_API_URL);
    console.log('3. Try accessing:', `${MGMT_API_URL}/health`);
    console.log('');
    process.exit(1);
  }
}

createDevAccount().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
