# Razorpay setup for job listings

Job posts are charged at **₹10 per day**, paid up front. Posters choose a duration from 1 to 365 days. The listing becomes public only after the server verifies a captured Razorpay payment, and it expires automatically after the selected duration. There is no automatic renewal.

## 1. Apply the database changes

In the Supabase Dashboard, open **SQL Editor**, paste the current contents of [`schema.sql`](./schema.sql), and run it. The script is designed to be re-runnable. This adds payment-order storage and the server-only function that publishes a paid listing. Existing listings remain visible as before; new listings get an expiry.

## 2. Get Razorpay API keys

In Razorpay, enable **Test Mode** and create an API key pair. Keep the **Key Secret private**; never put it in Vite environment variables or browser code. The Key ID is returned to the browser by the payment-order function.

## 3. Install and link the Supabase CLI

From the repository root in PowerShell, sign in and link the CLI to this project's ref:

```powershell
npx supabase login
npx supabase link --project-ref nmqkiezgfaumyryabiau
```

The repo's [`config.toml`](./config.toml) keeps both payment functions' normal JWT verification enabled.

## 4. Add Edge Function secrets

From the repository root, set the test credentials (replace the values with your own):

```powershell
npx supabase secrets set RAZORPAY_KEY_ID=rzp_test_your_key_id RAZORPAY_KEY_SECRET=your_test_key_secret --project-ref nmqkiezgfaumyryabiau
```

Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed Edge Functions. Do not expose or share the service-role key.

## 5. Deploy the payment functions

Deploy both functions from the repository root:

```powershell
npx supabase functions deploy create-job-payment-order --project-ref nmqkiezgfaumyryabiau
npx supabase functions deploy verify-job-payment --project-ref nmqkiezgfaumyryabiau
```

Keep the normal JWT verification enabled. Both endpoints also verify the signed-in user themselves. No Razorpay webhook is required for this checkout flow: the verification endpoint checks the signature and fetches the payment status directly from Razorpay before publishing.

## 6. Test, then go live

1. Keep the test API keys configured and publish a short-duration test job.
2. In Test Mode, do not scan the checkout QR with a real UPI app or enter a real UPI ID. The test QR is not a real collectible payment address and a UPI app may report that its ID is invalid. Use Razorpay's simulated UPI flow instead: where Checkout offers UPI ID entry, enter `success@razorpay` to simulate success or `failure@razorpay` to simulate failure. If Checkout only offers a QR, use another available test payment method or verify the QR test workflow in your Razorpay Dashboard; do not send real money.
3. Ensure automatic payment capture is enabled in the Razorpay account, then complete checkout with Razorpay's test-mode payment details. Confirm that a successful captured payment creates the job, while cancelling/failing checkout does not.
4. Check that the job is visible in the listings, its `expires_at` is set in `job_listings`, and it is no longer publicly browsable after that timestamp.
5. Before launch, replace the secrets with the **Live Mode** Key ID and Key Secret, and complete any Razorpay account activation/KYC steps. Deploy the functions again only if you change function code; secrets take effect without changing the app bundle.

The amount is calculated and enforced on the server as `days × 1000` paise. Do not change the browser-side displayed price without making the corresponding server and database policy changes.
