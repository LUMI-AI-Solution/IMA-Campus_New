# Migrate Tute & Lecturer Allocation to Delivery Department

This plan outlines the steps to build the allocation of Tute Names, Tute Covers, and Lecturer Images inside the Delivery Department's Tute Stock page, exactly as requested, while ensuring ZERO harm to any existing data.

## Open Questions
- None. The plan accurately reflects building the Add/Edit/Delete UI in Tute Stock while keeping existing data completely intact.

## Proposed Changes

### Frontend Updates

---

#### [MODIFY] `frontend/src/pages/delivery/components/TuteStock.jsx`
- **New UI for Allocation**: Add a prominent "+ Allocate New Tute & Lecturer" button.
- **Allocation Modal**: Build a new dropdown modal (Business -> Batch -> Subject -> Group).
- The modal will allow the Delivery Department to input the **Tute Name**, upload a **Tute Cover**, and upload a **Lecturer Image**.
- **Edit/Delete Features**: Enhance the existing edit/delete buttons on the Tute Stock cards to allow updating the Tute Name, Cover, or Lecturer Image directly from the Tute Stock UI.
- On submit, this will send the data to a new backend endpoint.

#### [MODIFY] `frontend/src/components/common/contenthub/ContentHub.jsx`
- Remove the Tute Name input and Tute Cover file upload fields from the Subject Creation/Edit modal, so future allocations only happen from Tute Stock. (Old data remains untouched).

### Backend Updates

---

#### [MODIFY] `backend/controllers/deliveryController.js`
- **New Endpoint `allocateTute`**: Create a function that accepts the new allocation data from Tute Stock.
- **Data Preservation Strategy**: To ensure checkout and pending deliveries continue to work automatically without any code changes, this endpoint will **update the existing `groupPrices` JSON** of the selected course with the new `tuteName` and images. 
- It will also automatically create a `TuteStock` record so that auto-dispatch reduction works immediately when a package is packed.

#### [MODIFY] `backend/routes/deliveryRoutes.js`
- Map the new `PUT /allocate-tute` endpoint to the `deliveryController`.

## Verification Plan
### Manual Verification
- Go to Delivery Department -> Tute Stock.
- Open the new "Allocate New Tute" modal.
- Select an existing subject and group, upload new images and a tute name.
- Pack a delivery containing this subject and verify the stock automatically reduces.