const { updateLecturerInfo } = require('./controllers/deliveryController');

async function run() {
    const req = {
        body: { oldName: '', newName: 'Test Lecturer 4' },
        file: null
    };
    const res = {
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        json: function(data) {
            console.log('Status:', this.statusCode, 'Data:', data);
        }
    };
    
    try {
        await updateLecturerInfo(req, res);
    } catch(e) {
        console.error('Error:', e);
    }
}
run();
