# Migrate Tute & Lecturer Allocation to Delivery Department

This plan outlines the steps to move the allocation of Tute Names, Tute Covers, and Lecturer Images out of the Content Hub and into the Delivery Department's Tute Stock page, without harming any existing data.

## Open Questions
- Should the `deliverTute` checkbox (which determines if a physical tute is provided at all for a subject) remain in the Content Hub for managers to decide, or should that move to the Delivery Department too? (I have planned to keep it in the Content Hub for now).

## Proposed Changes

### Backend Updates

---

#### [MODIFY] `backend/controllers/courseController.js`
- **Data Preservation**: When updating a subject from the Content Hub, intercept the `groupPrices` update to merge with the existing `groupPrices` from the database. This ensures that any `tuteName`, `tuteCover`, and `lecturerImage` previously allocated are strictly preserved and never accidentally overwritten or wiped by the Content Hub.

#### [MODIFY] `backend/controllers/deliveryController.js`
- **New Endpoint `allocateTute`**: Create a new function that accepts `courseId`, `groupId`, `tuteName`, `tuteCover` (image file), and `lecturerImage` (image file).
- The function will read the subject's existing `groupPrices`, update the specific group with the new allocated data, and save it back to the database.
- It will also automatically create a `TuteStock` record (with 0 quantity) if a stock item for this `tuteName` and `courseId` doesn't already exist.

#### [MODIFY] `backend/routes/deliveryRoutes.js`
- Map the new `PUT /allocate-tute` endpoint to the `deliveryController`.

### Frontend Updates

---

#### [MODIFY] `frontend/src/components/common/contenthub/ContentHub.jsx`
- **UI Cleanup**: Remove the Tute Name input and Tute Cover file upload fields from the Subject Creation/Edit modal.
- Stop sending `tuteName` and `tuteCover` files in the `handleCourseSubmit` function.

#### [MODIFY] `frontend/src/pages/delivery/components/TuteStock.jsx`
- **New UI**: Add a prominent "Allocate Tute & Lecturer" button.
- **Allocation Modal**: Build a new modal containing cascaded dropdowns (Business -> Batch -> Group -> Subject).
- The modal will allow the Delivery Department to input the Tute Name, upload a Tute Cover, and upload a Lecturer Image for the selected Subject & Group.
- **Integration**: On submit, send this data to the new backend endpoint as a `multipart/form-data` request.

## Verification Plan
### Automated Tests
- N/A

### Manual Verification
- Go to Content Hub, edit a subject, and verify that tute allocation fields are gone and saving doesn't wipe existing tute data.
- Go to Delivery Department -> Tute Stock.
- Open the new "Allocate Tute & Lecturer" modal.
- Select an existing subject and group, upload new images and a tute name.
- Verify the subject updates correctly and the new images are visible in the Tute Stock list and Pending/Delivered lists.