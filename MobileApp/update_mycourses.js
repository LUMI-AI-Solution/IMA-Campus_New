const fs = require('fs');

let content = fs.readFileSync('src/screens/MyCoursesScreen.jsx', 'utf8');

content = content.replace(/const businesses = useMemo\([\s\S]*?\}, \[mySubjects\]\);/, '');

content = content.replace(/const batches = useMemo\([\s\S]*?\}, \[mySubjects, selectedBusiness\]\);/, `const batches = useMemo(() => {
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

content = content.replace(/const subjectsWithHeaders = useMemo\([\s\S]*?if \(\!selectedBusiness \|\| \!selectedBatch\) return \[\];\n\s+const batchSubjects = mySubjects\.filter\(s => s\.businessName === selectedBusiness\.name && s\.batchName === selectedBatch\.name\);/, `const subjectsWithHeaders = useMemo(() => {
      if (!selectedBatch) return [];
      const batchSubjects = mySubjects.filter(s => s.businessName === selectedBatch.businessName && s.batchName === selectedBatch.name);`);
content = content.replace(/return finalList;\n  \}, \[mySubjects, selectedBusiness, selectedBatch\]\);/, `return finalList;\n  }, [mySubjects, selectedBatch]);`);

content = content.replace(/const handleBack = \(\) => \{\n\s+if \(step === 3\) \{ setStep\(2\); setSelectedBatch\(null\); \}\n\s+else if \(step === 2\) \{ setStep\(1\); setSelectedBusiness\(null\); \}\n\s+else \{ navigation\.goBack\(\); \}\n\s+\};/, `const handleBack = () => {
      if (step === 2) { setStep(1); setSelectedBatch(null); }
      else { navigation.goBack(); }
  };`);

// Remove selectedBusiness state
content = content.replace(/const \[selectedBusiness, setSelectedBusiness\] = useState\(null\);\n/, '');

// Fix FlatList data prop
content = content.replace(/data=\{step === 1 \? businesses : step === 2 \? batches : subjectsWithHeaders\}/, 'data={step === 1 ? batches : subjectsWithHeaders}');

// Fix FlatList renderItem prop
content = content.replace(/renderItem=\{step === 1 \? renderBusinessCard : step === 2 \? renderBatchCard : renderSubjectCard\}/, 'renderItem={step === 1 ? renderBatchCard : renderSubjectCard}');

// Fix renderBatchCard onPress
content = content.replace(/onPress=\{[\s\S]*?setSelectedBatch\(item\); setStep\(3\); \}\}/, `onPress={() => { setSelectedBatch(item); setStep(2); }}`);

// Enlarge lecturer image
content = content.replace(/logoContainer: \{ width: 60, height: 60/g, 'logoContainer: { width: 75, height: 75');
content = content.replace(/logo: \{ width: 45, height: 45 \}/g, "logo: { width: '90%', height: '90%' }");

fs.writeFileSync('src/screens/MyCoursesScreen.jsx', content);
