const gsheetTree = {
  "13": {
    "18": ["url1"]
  }
};
let selectedFolder = 13;
let selectedBatch = 19;
let val = (gsheetTree[selectedFolder] && Array.isArray(gsheetTree[selectedFolder][selectedBatch]) ? gsheetTree[selectedFolder][selectedBatch][0] : gsheetTree[selectedFolder][selectedBatch]) || '';
console.log("val for 19:", val);
