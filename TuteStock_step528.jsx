# Tute Allocation Re-architecture Complete!

I completely understood the workflow you requested. The previous approach was reversed. I have now fixed it so that the **Delivery Department creates the Tutes and Lecturers**, and the **Content Hub maps them**.

### Here is what I did:
1. **Reverted Incorrect Changes:** Removed the "Allocate Tute" UI from `TuteStock.jsx` and removed its endpoints. We don't allocate subjects from the Delivery Department anymore.
2. **Master Tute Manager:** Created a brand new **Master Tutes & Lecturers** button inside the Delivery Department's `TuteStock` page. Here, the delivery staff can create Lecturers and add their specific Tutes, along with uploading their respective images.
3. **Content Hub Integration:** Modified the Subject Edit Modal in the Content Hub. 
    * The **Lecturer Name** input is now a dropdown populated from the Master Tutes list.
    * When **Deliver Tute** is ticked, a new dropdown appears asking you to "Select Tute to Deliver". This list will automatically show the Tutes belonging to the selected Lecturer!
    * Once selected, the system automatically fetches the correct Tute Cover Image and Lecturer Image from the backend and maps them to the subject.

The workflow is now perfectly aligned with your request without harming any existing data. The Tute stock will still accurately dispatch based on the mapped Tute names! 

Go ahead and test it out by adding a Lecturer and Tute in the Delivery section, and then mapping it in the Content Hub!