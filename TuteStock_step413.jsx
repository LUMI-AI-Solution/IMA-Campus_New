# Corrected Implementation Plan for Tute & Lecturer Management

I completely misunderstood your requirement before, and I am very sorry for that! I have carefully read your explanation and I understand exactly how the workflow should work now.

## Open Questions
- None. The flow is very clear now. I will revert the previous changes and build this new system.

## Proposed New Workflow

### 1. Delivery Department (Tute Stock Page)
- I will create a **Master Tute & Lecturer Manager** inside the Tute Stock page.
- You will be able to **Create, Edit, and Delete Lecturers**.
- Inside each Lecturer, you will be able to **Create, Edit, and Delete Tutes** (Name + Image) that belong to them.
- This acts as a centralized "Tute Inventory Database" managed purely by the Delivery Department.

### 2. Content Hub (Subject Modal)
- I will change the `Lecturer Name` text input into a **Dropdown Menu**.
- This dropdown will show the list of Lecturers created by the Delivery Department.
- When you tick **"Deliver Tute"** for a specific group (e.g., Full Payment), it will show a dropdown containing the specific Tutes that belong to the selected Lecturer.
- You simply select which Tute you want to give.

### 3. Backend & Auto-Dispatch
- When the Content Hub manager saves the subject, the system will save the selected Tute Name and Tute Cover into the subject's `groupPrices`.
- It will also ensure that the Tute Stock table is updated correctly so that **Auto-Dispatch stock reduction continues to work flawlessly**.

## Verification Plan
1. Completely remove my previous wrong updates to `TuteStock.jsx` and `ContentHubModals.jsx`.
2. Use the `AppSetting` table to store the master list of Lecturers and Tutes so we don't need to do any risky database migrations.
3. Build the new Master Tute Manager UI in Tute Stock.
4. Update the Content Hub Subject Modal with the new dropdowns.