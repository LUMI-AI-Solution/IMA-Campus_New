/**
 * Production-Ready Sinhala Unicode <-> FM-Abhaya / DL-Fonts ANSI Converter
 * Optimized for CapCut, Adobe Premiere Pro, After Effects & Photoshop
 * Eliminates stray "ග" by safely stripping and handling punctuation/full stops.
 */

export const unicodeToLegacy = (text) => {
    if (!text) return "";
    let s = String(text);

    // 0. Remove English punctuation and full stops that collide with FM font glyphs (e.g. '.' maps to 'ග')
    s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();

    // 1. Special Compound Glyphs, Rakaranshaya, Yanshaya & Ligatures
    const compounds = [
        // Rakaranshaya + Kombuwa
        ['ක්‍රේ', 'fl%a'], ['ප්‍රේ', 'fm%a'], ['ත්‍රේ', 'f;%a'], ['ශ්‍රේ', 'fY%a'],
        ['ද්‍රේ', 'føa'], ['ග්‍රේ', 'f.%a'], ['බ්‍රේ', 'fn%a'],
        ['ක්‍රෝ', 'fl%da'], ['ප්‍රෝ', 'fm%da'], ['ත්‍රෝ', 'f;%da'],
        ['ක්‍රො', 'fl%d'], ['ප්‍රො', 'fm%d'],
        ['ක්‍රෙ', 'fl%'], ['ප්‍රෙ', 'fm%'],
        // Rakaranshaya
        ['ක්‍ර', 'l%'], ['ප්‍ර', 'm%'], ['ත්‍ර', ';%'], ['ශ්‍ර', 'Y%'],
        ['ද්‍ර', 'ø'], ['ග්‍ර', '.%'], ['බ්‍ර', 'n%'], ['ධ්‍ර', 'O%'], ['ව්‍ර', 'j%'],
        // Yanshaya
        ['ක්‍ය', 'lH'], ['ත්‍ය', ';H'], ['ප්‍ය', 'mH'], ['භ්‍ය', 'NH'],
        ['ම්‍ය', 'uH'], ['ව්‍ය', 'jH'], ['න්‍ය', 'kH'], ['ල්‍ය', ',H'],
        ['ද්‍ය', 'oH'], ['ග්‍ය', '.H'],
        // Special Ligatures / Bandi Akuru
        ['ක්‍ෂ', 'laI'], ['ඥ', '{\\'], ['ඤ', '['],
        ['ඳ', '`o'], ['ඟ', '`.'], ['ඬ', '`v'], ['ඹ', '`n'],
        // Special Paapili and Ispili Ligatures
        ['දු', 'ÿ'], ['ඳු', '`ÿ'], ['දූ', '¥'], ['ඳූ', '`¥'],
        ['රු', 're'], ['රූ', 'rE'],
        ['ලු', '¨'], ['ලූ', '¿'],
        ['තු', ';='], ['තූ', ';+']
    ];

    compounds.forEach(([u, f]) => {
        s = s.split(u).join(f);
    });

    // 2. Reorder Kombuwa (Kombuwa is 'f' in FM-Abhaya / FMBindumathi)
    // ේ -> 'f' + Consonant + 'a'
    s = s.replace(/([ක-ෆ])ේ/g, 'f$1a');
    // ෝ -> 'f' + Consonant + 'da'
    s = s.replace(/([ක-ෆ])ෝ/g, 'f$1da');
    // ො -> 'f' + Consonant + 'd'
    s = s.replace(/([ක-ෆ])ො/g, 'f$1d');
    // ෞ -> 'f' + Consonant + '!'
    s = s.replace(/([ක-ෆ])ෞ/g, 'f$1!');
    // ෛ -> 'ff' + Consonant
    s = s.replace(/([ක-ෆ])ෛ/g, 'ff$1');
    // ෙ -> 'f' + Consonant
    s = s.replace(/([ක-ෆ])ෙ/g, 'f$1');

    // 3. Standalone Vowels
    const vowels = [
        ['අ', 'w'], ['ආ', 'wd'], ['ඇ', 'we'], ['ඈ', 'wE'],
        ['ඉ', 'b'], ['ඊ', 'B'], ['උ', 'W'], ['ඌ', 'W`'],
        ['එ', 't'], ['ඒ', 'ta'], ['ඔ', 'T'], ['ඕ', 'Ta'], ['ඖ', 'TO']
    ];
    vowels.forEach(([u, f]) => {
        s = s.split(u).join(f);
    });

    // 4. Exact Consonants (Wijesekara FM-Abhaya Mapping)
    const consonants = [
        ['ක', 'l'], ['ඛ', 'L'], ['ග', '.'], ['ඝ', '>'], ['ඞ', 'X'],
        ['ච', 'p'], ['ඡ', 'P'], ['ජ', 'c'], ['ඣ', 'C'],
        ['ට', 'g'], ['ඨ', 'G'], ['ඩ', 'v'], ['ඪ', 'V'], ['ණ', 'K'],
        ['ත', ';'], ['ථ', ':'], ['ද', 'o'], ['ධ', 'O'], ['න', 'k'],
        ['ප', 'm'], ['ඵ', 'M'], ['බ', 'n'], ['භ', 'N'], ['ම', 'u'],
        ['ය', 'h'], ['ර', 'r'], ['ල', ','], ['ව', 'j'], ['ශ', 'Y'], ['ෂ', 'I'],
        ['ස', 'i'], ['හ', 'y'], ['ළ', '<'], ['ෆ', '*']
    ];
    consonants.forEach(([u, f]) => {
        s = s.split(u).join(f);
    });

    // 5. Vowel Modifiers & Hal Lakuna
    const modifiers = [
        ['ා', 'd'], ['ැ', 'e'], ['ෑ', 'E'], ['ි', 's'], ['ී', 'S'],
        ['ු', 'q'], ['ූ', 'Q'], ['්', 'a'], ['ෲ', 'D'], ['ෘ', 'D'], ['ං', 'x']
    ];
    modifiers.forEach(([u, f]) => {
        s = s.split(u).join(f);
    });

    return s;
};

// Helper to guarantee single-track sequential non-overlapping timings for CapCut
export const ensureSequentialCues = (cues) => {
    if (!cues || cues.length === 0) return [];
    
    // Sort in ascending start time order
    const sorted = [...cues].sort((a, b) => a.start - b.start);

    for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i];
        const next = sorted[i + 1];

        // Ensure minimum cue duration of 0.15s
        if (curr.end <= curr.start) {
            curr.end = parseFloat((curr.start + 0.25).toFixed(2));
        }

        // Prevent overlap with next cue (leave a 40ms gap so CapCut stays strictly on Track 1)
        if (next && curr.end >= next.start) {
            curr.end = parseFloat(Math.max(curr.start + 0.1, next.start - 0.04).toFixed(2));
        }
    }

    return sorted;
};

// Word-by-Word SRT Splitter Helper for CapCut Granular Customization
export const splitCaptionsWordByWord = (captions, convertToFM = false) => {
    const granularCues = [];
    let cueId = 1;

    captions.forEach(cap => {
        // Strip full stops and commas so no stray "ග" occurs in FM font
        const cleanRaw = (cap.text || '').replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ').trim();
        if (!cleanRaw) return;

        const words = cleanRaw.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return;

        const totalDuration = Math.max(0.4, cap.end - cap.start);
        const totalChars = words.reduce((acc, w) => acc + w.length, 0);
        let currentStart = cap.start;

        words.forEach((word, wIdx) => {
            const charWeight = word.length / totalChars;
            const wordDur = Math.max(0.2, totalDuration * charWeight);
            const wordEnd = (wIdx === words.length - 1) ? cap.end : parseFloat((currentStart + wordDur).toFixed(2));
            const finalWordText = convertToFM ? unicodeToLegacy(word) : word;

            granularCues.push({
                id: cueId++,
                start: parseFloat(currentStart.toFixed(2)),
                end: parseFloat(Math.max(currentStart + 0.15, wordEnd).toFixed(2)),
                text: finalWordText,
                originalText: word
            });

            currentStart = wordEnd;
        });
    });

    return ensureSequentialCues(granularCues);
};

// Phrase-by-Phrase (2-3 words) SRT Splitter Helper
export const splitCaptionsByChunks = (captions, chunkSize = 3, convertToFM = false) => {
    const chunkedCues = [];
    let cueId = 1;

    captions.forEach(cap => {
        const cleanRaw = (cap.text || '').replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ').trim();
        if (!cleanRaw) return;

        const words = cleanRaw.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return;

        const chunks = [];
        for (let i = 0; i < words.length; i += chunkSize) {
            chunks.push(words.slice(i, i + chunkSize));
        }

        const totalDuration = Math.max(0.6, cap.end - cap.start);
        const chunkDuration = totalDuration / chunks.length;

        chunks.forEach((chunkWords, cIdx) => {
            const chunkStart = cap.start + (cIdx * chunkDuration);
            const chunkEnd = cap.start + ((cIdx + 1) * chunkDuration);
            const phraseText = chunkWords.join(' ');
            const finalPhrase = convertToFM ? unicodeToLegacy(phraseText) : phraseText;

            chunkedCues.push({
                id: cueId++,
                start: parseFloat(chunkStart.toFixed(2)),
                end: parseFloat(Math.max(chunkStart + 0.2, chunkEnd).toFixed(2)),
                text: finalPhrase,
                originalText: phraseText
            });
        });
    });

    return ensureSequentialCues(chunkedCues);
};
