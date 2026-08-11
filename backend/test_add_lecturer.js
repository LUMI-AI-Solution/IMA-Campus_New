const { updateLecturerInfo } = require('./controllers/deliveryController');

async function run() {
    const req = {
        body: { oldName: '', newName: 'Test Lecturer 3' },
        file: null
    };
    const res = {
        status: (code) => ({
            json: (data) => console.log(code, data)
        })
    };
    
    await updateLecturerInfo(req, res);
}

run();
