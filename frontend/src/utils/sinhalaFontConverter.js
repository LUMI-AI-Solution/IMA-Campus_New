// Simple Unicode to FM-Abhaya Legacy Sinhala Converter logic.
// In a full implementation, this maps Unicode codepoints to FM-Abhaya character combinations.
export const unicodeToLegacy = (text) => {
    if (!text) return "";
    
    let converted = text;
    
    // Basic vowel modifiers and consonants replacements for FM-Abhaya
    // Note: A production-ready converter would have a comprehensive dictionary mapping.
    // This is a simplified version for demonstration purposes.
    
    // Consonants
    converted = converted.replace(/ක/g, "l");
    converted = converted.replace(/ඛ/g, "L");
    converted = converted.replace(/ග/g, ".");
    converted = converted.replace(/ඝ/g, ">");
    converted = converted.replace(/ඟ/g, "Õ");
    converted = converted.replace(/ච/g, "p");
    converted = converted.replace(/ඡ/g, "P");
    converted = converted.replace(/ජ/g, "c");
    converted = converted.replace(/ට/g, "g");
    converted = converted.replace(/ඨ/g, "G");
    converted = converted.replace(/ඩ/g, "v");
    converted = converted.replace(/ඪ/g, "V");
    converted = converted.replace(/ණ/g, "K");
    converted = converted.replace(/ත/g, ";");
    converted = converted.replace(/ථ/g, ":");
    converted = converted.replace(/ද/g, "o");
    converted = converted.replace(/ධ/g, "O");
    converted = converted.replace(/න/g, "k");
    converted = converted.replace(/ප/g, "m");
    converted = converted.replace(/ඵ/g, "M");
    converted = converted.replace(/බ/g, "a");
    converted = converted.replace(/භ/g, "A");
    converted = converted.replace(/ම/g, "u");
    converted = converted.replace(/ය/g, "h");
    converted = converted.replace(/ර/g, "r");
    converted = converted.replace(/ල/g, "e");
    converted = converted.replace(/ව/g, "j");
    converted = converted.replace(/ශ/g, "Y");
    converted = converted.replace(/ෂ/g, "I");
    converted = converted.replace(/ස/g, "i");
    converted = converted.replace(/හ/g, "y");
    converted = converted.replace(/ළ/g, "E");
    converted = converted.replace(/ෆ/g, "*");
    
    // Vowels
    converted = converted.replace(/අ/g, "w");
    converted = converted.replace(/ආ/g, "wd");
    converted = converted.replace(/ඇ/g, "we");
    converted = converted.replace(/ඈ/g, "wE");
    converted = converted.replace(/ඉ/g, "b");
    converted = converted.replace(/ඊ/g, "B");
    converted = converted.replace(/උ/g, "W");
    converted = converted.replace(/ඌ/g, "W`");
    converted = converted.replace(/එ/g, "t");
    converted = converted.replace(/ඒ/g, "ta");
    converted = converted.replace(/ඔ/g, "T");
    converted = converted.replace(/ඕ/g, "Ta");

    // Vowel Modifiers (Ispilla, Pilla, etc.)
    converted = converted.replace(/ා/g, "d");
    converted = converted.replace(/ැ/g, "e");
    converted = converted.replace(/ෑ/g, "E");
    converted = converted.replace(/ි/g, "s");
    converted = converted.replace(/ී/g, "S");
    converted = converted.replace(/ු/g, "q");
    converted = converted.replace(/ූ/g, "Q");
    converted = converted.replace(/ෙ/g, "t"); // Kombuwa goes before consonant in FM fonts, needs advanced processing
    converted = converted.replace(/ේ/g, "ta");
    converted = converted.replace(/ෛ/g, "tt");
    converted = converted.replace(/ො/g, "td");
    converted = converted.replace(/ෝ/g, "tda");
    converted = converted.replace(/ෞ/g, "tO");
    converted = converted.replace(/්/g, "a");

    // Simplified kombuwa logic (move 't' before the consonant)
    // In a real scenario, this requires a complex Regex to find the consonant and place the kombuwa before it.
    
    return converted;
};
