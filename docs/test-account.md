# Test Account Setup

## Google Sheets Test Row

Add a new row to the **GUESTS** tab in your wedding config Google Sheet:

| Column          | Value                 | Notes                                             |
|-----------------|-----------------------|---------------------------------------------------|
| Title           | Mr.                    |                                                   |
| First Name      | Test                   | Used for name search in auth modal                |
| Middle Initial  |                        | Leave blank                                       |
| Last Name       | User                   |                                                   |
| Relationship    | Friend                 |                                                   |
| Role            | Guest                  | Accepted values: Bride, Groom, CloseFamily, Br-Family |
| Invited To      | Both                   | Options: Both, US, India                          |
| Plus One        | N/A                    | Options: N/A, Allowed+1, +1NOTALLOWED             |
| Email Address   | test@example.com       | EmailJS will send codes here                      |
| Phone Number    | +1 5555550100          | **Firebase test number** — no real SMS needed     |
| Mailing Address | 123 Test St, Test City, TC 12345 |                                           |
| Dietary Preferences | None              |                                                   |

## Firebase Test Phone Number

Firebase provides a test phone number for development:

- **Phone:** `+1 555-555-0100`
- **SMS Code:** Any 6-digit code you enter (e.g., `123456`)

This works without sending real SMS. Firebase will accept any 6-digit code for this number during development.

### Firebase Console Configuration

1. Go to [Firebase Console](https://console.firebase.google.com) → Authentication → Sign-in method
2. Enable **Phone** provider
3. Under **Test phone numbers**, add:
   - Phone: `+1 5555550100`
   - Verification code: `123456` (or any code you want to use for testing)

## Testing the Auth Flow

1. Run `vercel dev` or `npm run dev`
2. Click "Sign In" on the website
3. Type "Test" in the name search field
4. Select "Test User" from the dropdown
5. Choose **Email Code** or **SMS Code** verification
6. For SMS: Enter `123456` as the code (Firebase test mode accepts any code)
7. For Email: Check the browser console for the generated code, or check email if EmailJS is configured

## Automated E2E Tests

The deploy process includes automated E2E tests that:
1. Launch a headless browser
2. Navigate to the deployed site
3. Sign in with the test user
4. Scroll the entire page
5. Check for console errors

Run manually: `npm run deploy`

The tests require `puppeteer`: `npm install --no-save puppeteer`
