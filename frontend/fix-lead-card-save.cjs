const fs = require('fs');
const file = '/root/IMA-Campus/frontend/src/components/AfterSeminarCRM/CallCampaign/AfterSemOpen/LeadCard.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldSave = `                            <button disabled={invalidPending} onClick={handleLocalSave} className={\`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-transform bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:scale-[1.02]\`}>
                                <FaSave size={12}/> SAVE
                            </button>`;

const newSave = `                            <button disabled={invalidPending || isLocked} onClick={handleLocalSave} className={\`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider transition-transform \${isLocked ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:scale-[1.02]'}\`}>
                                <FaSave size={12}/> {isLocked ? 'FROZEN' : 'SAVE'}
                            </button>`;

content = content.replace(oldSave, newSave);

fs.writeFileSync(file, content);
console.log('LeadCard.jsx save button updated');
