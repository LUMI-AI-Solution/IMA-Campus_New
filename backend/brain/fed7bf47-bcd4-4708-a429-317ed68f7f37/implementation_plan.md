# Singlish to Sinhala Auto-Transliteration

Add a feature to automatically convert Singlish to Sinhala text in the CRM chat bar, while preserving English acronyms and subject codes.

## Proposed Changes

### 1. Singlish Conversion Utility
[NEW] `frontend/src/utils/singlishConverter.js`
- Create a dictionary-based regex transliteration function (standard Singlish to Sinhala mapping).
- Add logic to **ignore uppercase words** (like `ET`, `ECON`, `SFT`, `ICT`). If a word is fully uppercase, it will be skipped during transliteration.

### 2. Chat Input Integration
[MODIFY] `frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemNew/AfterSeminarNewInq.jsx` (and other chat components)
- Add a toggle button `[A/අ]` near the WhatsApp chat bar to enable/disable auto-Sinhala typing.
- When the toggle is ON, monitor the input. When the user types a word and presses **Space**, the word will be intercepted, checked if it's an acronym (uppercase), and if not, converted to Sinhala instantly.

## Open Questions

> [!NOTE]  
> **How it works:**  
> When you type `puthe` and hit Space, it becomes `පුතේ `.  
> When you type `ET` and hit Space, it stays `ET`.  
> Do you prefer it to convert *as you type each letter*, or *only when you hit Space*? (Converting on Space is usually smoother for acronyms).

## Verification Plan

- Type regular Singlish words and verify they convert to Sinhala correctly.
- Type `ET`, `ECON`, `SFT` and verify they remain in English.
- Test the toggle button to ensure it can be turned off when pure English typing is needed.
