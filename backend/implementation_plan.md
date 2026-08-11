# [Backend Fixes] App Online Payment Issue & AI Verification Delivery Issue

We have investigated both issues reported. Here are the findings and the proposed backend fixes.

## 1. App Online Payment (Due Payments) Issue
**Cause:** When a student pays a *due payment* via PayHere on the app, the app successfully processes the payment and then calls the backend API `/student/upload-due-slip` to update the payment record. However, the backend is hardcoded to expect a slip image (since it was originally designed only for manual bank slips). Because online payments don't have slip images, the API throws a `400 No slips provided` error, and the payment remains in a "Pending" or "Due" state, denying the student access despite the money being deducted.

**Fix in `backend/controllers/studentController.js` (`uploadDueSlip`):**
- Update the API to read the `method` from the request.
- If `method === 'payhere'`, skip the slip image validation.
- Automatically update the payment status to `1` (Approved) and method to `'PayHere'`.
- Automatically trigger the Delivery Creation and CRM Lead Sync logic, just like standard manual approvals.

## 2. AI Verified Slips Missing in Delivery Department
**Findings:** 
I checked the database without making any modifications.
- **Total AI Verified Slips:** 100
- **Slips successfully sent to Delivery:** 83
- **Slips missing Delivery:** 17

**Cause:** The 83 slips likely got deliveries because staff members manually clicked "Approve" on them in the dashboard (which triggers the delivery creation) or they were monthly payments for groups that already had active deliveries. The core issue is that when the AI automatically verifies a slip (`backend/controllers/aiVerificationController.js`), it only updates the payment status to `1` (Approved) but completely skips the "Delivery Creation" and "CRM Lead Sync" steps that normally happen during a manual approval.

**Fix in `backend/controllers/aiVerificationController.js`:**
- When AI successfully verifies a slip (`autoVerify === true` and `confidence >= 0.80`), we will execute the same Auto-Delivery creation logic used in `paymentController.js`.
- We will also execute `syncLeadEnrollment` so the CRM is updated correctly.
- Additionally, we can run a one-time script to retroactively create the missing deliveries for the 17 AI verified slips that missed out.

## Open Questions
- Do you want me to write a script to automatically create the missing deliveries for those 17 slips that were skipped yesterday?
- Shall I proceed with applying the fixes to `studentController.js` and `aiVerificationController.js`?
