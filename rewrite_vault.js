const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/admin/AISlipVerification.jsx', 'utf-8');

// 1. Add new state variables right after months state
const newStates = `
  const [gsheetConfigTree, setGsheetConfigTree] = useState({});
  const [selectedFolder, setSelectedFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState('');
`;

content = content.replace(/const \[months, setMonths\] = useState\(\[\]\);/, "const [months, setMonths] = useState([]);" + newStates);


// 2. Fetch the gsheet config tree in useEffect
const fetchTreeCode = `
      try {
          const res = await api.get('/ai-verification/gsheet-config/tree');
          setGsheetConfigTree(res.data);
      } catch (e) { console.error("Error fetching gsheet config tree"); }
`;

content = content.replace(/(const fetchPendingSlips = async \(\) => \{[\s\S]*?\} catch \(e\) \{[\s\S]*?\}\s*\})/, "$1" + fetchTreeCode);

// 3. Add functions to handle Tree changes
const treeFunctions = `
  const saveTree = async (newTree) => {
      setGsheetConfigTree(newTree);
      try {
          await api.post('/ai-verification/gsheet-config/tree', { tree: newTree });
      } catch(e) { console.error(e); }
  };

  const handleAddFolder = () => {
      if(!newFolderName) return;
      const t = {...gsheetConfigTree, [newFolderName]: {}};
      saveTree(t);
      setNewFolderName('');
  };

  const handleDeleteFolder = (folder) => {
      if(!window.confirm('Delete folder '+folder+'?')) return;
      const t = {...gsheetConfigTree};
      delete t[folder];
      if(selectedFolder === folder) setSelectedFolder('');
      saveTree(t);
  };

  const handleCreateMonthInFolder = (folder) => {
      if(!newMonthName) return;
      const t = {...gsheetConfigTree};
      if(!t[folder][newMonthName]) t[folder][newMonthName] = [];
      saveTree(t);
      setShowNewMonthModal(false);
      setNewMonthName('');
  };

  const handleAddLink = (folder, month) => {
      if(!spreadsheetUrl) return;
      let sheetId = spreadsheetUrl;
      const match = spreadsheetUrl.match(/\\/d\\/([a-zA-Z0-9-_]+)/);
      if (match) sheetId = match[1];

      const t = {...gsheetConfigTree};
      if(!t[folder][month]) t[folder][month] = [];
      t[folder][month].push(sheetId);
      saveTree(t);
      setSpreadsheetUrl('');
  };
  
  const handleDeleteLink = (folder, month, linkIndex) => {
      const t = {...gsheetConfigTree};
      t[folder][month].splice(linkIndex, 1);
      saveTree(t);
  };

  const handleDeleteMonthInFolder = (folder, month) => {
      if(!window.confirm('Delete month '+month+' from '+folder+'?')) return;
      const t = {...gsheetConfigTree};
      delete t[folder][month];
      if(selectedMonth === month) setSelectedMonth('');
      saveTree(t);
  };

`;

content = content.replace(/(const handleAuthSettings = async \(\) => \{)/, treeFunctions + "\n$1");

fs.writeFileSync('frontend/src/components/admin/AISlipVerification.jsx', content);
