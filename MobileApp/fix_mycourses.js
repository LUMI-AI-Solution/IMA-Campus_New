const fs = require('fs');

let content = fs.readFileSync('src/screens/MyCoursesScreen.jsx', 'utf8');

// 1. Remove selectedBusiness state and businesses useMemo
content = content.replace(/const \[selectedBusiness, setSelectedBusiness\] = useState\(null\);\n/, '');
content = content.replace(/const businesses = useMemo\(\(\) => \{[\s\S]*?\}, \[mySubjects\]\);\n/, '');

// 2. Fix batches useMemo (no longer depends on selectedBusiness)
content = content.replace(/const batches = useMemo\(\(\) => \{[\s\S]*?\}, \[mySubjects, selectedBusiness\]\);/, `const batches = useMemo(() => {
    const map = new Map();
    mySubjects.forEach(s => {
        const key = s.batchName + '-' + s.businessName;
        if (!map.has(key)) {
            let bLogo = s.batchLogo;
            if (!bLogo || bLogo === 'default.png') bLogo = s.businessLogo;
            map.set(key, { name: s.batchName, businessName: s.businessName, logo: bLogo });
        }
    });
    return Array.from(map.values());
  }, [mySubjects]);`);

// 3. Fix subjectsWithHeaders useMemo
content = content.replace(/const subjectsWithHeaders = useMemo\(\(\) => \{[\s\S]*?\}, \[mySubjects, selectedBusiness, selectedBatch\]\);/, `const subjectsWithHeaders = useMemo(() => {
    if (!selectedBatch) return [];
    const batchSubjects = mySubjects.filter(s => s.businessName === selectedBatch.businessName && s.batchName === selectedBatch.name);
    
    const streamMap = new Map();
    batchSubjects.forEach(s => {
        const stream = s.stream || "General Subjects";
        if (!streamMap.has(stream)) streamMap.set(stream, []);
        streamMap.get(stream).push(s);
    });

    const finalList = [];
    streamMap.forEach((subjects, stream) => {
        finalList.push({ isHeader: true, title: stream });
        subjects.forEach(sub => finalList.push(sub));
    });

    return finalList;
  }, [mySubjects, selectedBatch]);`);

// 4. Fix handleBack
content = content.replace(/const handleBack = \(\) => \{[\s\S]*?\};/, `const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedBatch(null);
    } else {
      navigation.goBack();
    }
  };`);

// 5. Remove renderBusinessCard
content = content.replace(/const renderBusinessCard = \(\{ item \}\) => \([\s\S]*?\);\n  \};\n/, '');

// 6. Fix renderBatchCard onPress
content = content.replace(/onPress=\{[\s\S]*?setSelectedBatch\(item\); setStep\(3\); \}\}/, `onPress={() => {
        setSelectedBatch(item);
        setStep(2);
      }}`);

// 7. Enlarge lecturer image
content = content.replace(/logoContainer: \{ width: 60, height: 60/g, 'logoContainer: { width: 75, height: 75');
content = content.replace(/logo: \{ width: 45, height: 45 \}/g, "logo: { width: '90%', height: '90%' }");

// 8. Fix headerText
content = content.replace(/let headerText = "My Classroom";\n\s+let subText = "Select your institute";\n\s+if \(step === 2\) \{ headerText = selectedBusiness\?\.name; subText = "Select your batch"; \}\n\s+if \(step === 3\) \{ headerText = selectedBatch\?\.name; subText = "Select a subject to learn"; \}/, `let headerText = "My Batches";
  let subText = "Select your batch";
  if (step === 2) { 
      headerText = selectedBatch?.name || "Subjects"; 
      subText = "Select a subject to learn"; 
  }`);

// 9. Fix FlatList data & renderItem
content = content.replace(/data=\{step === 1 \? businesses : step === 2 \? batches : subjectsWithHeaders\}/, 'data={step === 1 ? batches : subjectsWithHeaders}');
content = content.replace(/renderItem=\{step === 1 \? renderBusinessCard : step === 2 \? renderBatchCard : renderSubjectCard\}/, 'renderItem={step === 1 ? renderBatchCard : renderSubjectCard}');

fs.writeFileSync('src/screens/MyCoursesScreen.jsx', content);
