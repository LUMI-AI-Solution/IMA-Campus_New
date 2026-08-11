# Goal Description
Integrate the Master Lecturer and Master Tute creation/editing directly into the main `TuteStock.jsx` grids, replacing the separate popup approach. Add a search bar to the Lecturer view, allow creating/editing lecturers in the main grid, and allow creating tutes when inside a lecturer's view.

> [!WARNING]
> ## User Review Required
> The current `TuteStock` UI has 3 levels:
> 1. **Lecturers**
> 2. **Payment Groups** (e.g., Monthly, Full Payment)
> 3. **Stock Items** (Tutes mapped to the courses)
>
> If we create a *brand new* Lecturer, they won't have any Payment Groups yet because they aren't mapped to a subject in Content Hub. 
> 
> **How should we handle View Level 2 for a Lecturer?**
> My proposed approach: 
> When you click a Lecturer (View Level 1), you will see two sections in View Level 2:
> 1. **Master Tutes Inventory:** A place to Create/Edit/Delete Master Tutes for this lecturer.
> 2. **Allocated Stock (by Payment Group):** The existing Monthly/Full Payment folders for tracking actual stock.
> 
> Does this approach work for you? Or do you want to remove the "Payment Group" level entirely?

## Proposed Changes

### `TuteStock.jsx`

#### [MODIFY] `frontend/src/pages/delivery/components/TuteStock.jsx`
- Add a Search Bar in View Level 1 to filter Lecturers.
- Fetch `masterTutes` data inside `TuteStock.jsx` alongside `globalStock`.
- Merge the derived `lecturers` array with the `masterTutes` array so that newly created Master Lecturers (with no stock yet) still appear in the grid.
- Add an "Add Lecturer" card/button in the View Level 1 grid.
- Add "Edit" and "Delete" icons on the Lecturer cards.
- Modify View Level 2 (when clicking a Lecturer) to display a "Master Tutes" section where new tutes can be created, alongside the existing "Payment Groups" section for stock management.

#### [DELETE] `frontend/src/pages/delivery/components/MasterTuteManager.jsx`
- Delete this file as its functionality is being moved natively into `TuteStock.jsx`.

## Verification Plan
### Manual Verification
- Go to Delivery Department -> Tute Stock.
- Verify Search bar works for filtering Lecturers.
- Create a new Lecturer directly from the grid.
- Click the new Lecturer and create a new Tute in their Master Tutes section.
- Go to Content Hub and verify the new Lecturer and Tute appear in the dropdowns.
- Allocate it, then return to Tute Stock and verify it appears under the Payment Groups for stock tracking.