//a server backend that creates a new subdirectory in this directory on receiving a post request
//and returns the url of the new subdirectory

const express = require('express');
const https = require('https');
const app = express();
var cors = require('cors')
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const uuid = require('uuid');
var multer = require('multer');
var upload = multer();
var bodyParser = require('body-parser');
var pug = require('pug');

var privateKey = fs.readFileSync('/etc/letsencrypt/live/alexinabox.de/privkey.pem');
var certificate = fs.readFileSync('/etc/letsencrypt/live/alexinabox.de/cert.pem');

https.createServer({
    key: privateKey,
    cert: certificate
}, app).listen(3000, () => {
    console.log('listening on port 3000');
});

//prevent cors errors
app.use(cors())

//on post request, create a new subdirectory in the directory "environments" by cloning the default subdirectory
app.post('/server.js', (req, res) => {
    console.log('new request');
    //create a new subdirectory
    let uuidName = uuid.v4();
    let newDir = path.join(__dirname + '/environments/', uuidName);
    fs.mkdirSync(newDir);

    const srcDir = __dirname + '/environments/default';
    const destDir = newDir;
    // To copy a folder or file, select overwrite accordingly
    try {
        fse.copySync(srcDir, destDir, { overwrite: true | false })
        console.log('success!')
    } catch (err) {
        console.error(err)
    }
    res.send(uuidName);
});

//on delete, delete all subdirectories in this directory
app.delete('/server.js', (res) => {
    console.log('delete request');
    //get all subdirectories in this directory
    let subDirs = fs.readdirSync(__dirname + '/environments/');
    //now subDirs is an array of all files and subdirectories in this directory, therefore we need to filter out the files
    subDirs = subDirs.filter(subDir => {
        return fs.lstatSync(path.join(__dirname + '/environments/', subDir)).isDirectory();
    }); //this returns an array of all subdirectories in this directory by filtering out all files by checking if they are directories
    //delete all subdirectories except "node_modules, .vscode, .git, assets"
    subDirs.forEach(subDir => {
        if (subDir !== 'default') {
            fs.rmSync(path.join(__dirname + '/environments/', subDir), { recursive: true });
        }
    });
    res.status(200).send('deleted all subdirectories');
});

//on post to /upload, upload a file to the subdirectory with the containerID from the request body in a formdata object

app.post('/upload', upload.single('file'), async (req, res) => {
    console.log('Upload request received');

    if (!req.file) {
        res.status(400).send('No file uploaded');
        return;
    }

    const containerID = req.body.containerID;
    const file = req.file;

    if (await enoughSpace(file.size, containerID)) {
        console.log('Enough space');
        const uploadDir = path.join(__dirname, 'environments', containerID, 'container');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        fs.writeFileSync(path.join(uploadDir, file.originalname), file.buffer);

        console.log('File uploaded');
        res.send('File uploaded');
        return;
    }
    console.log('Not enough space');
    res.status(400).send('Not enough space');
});

async function enoughSpace(size, containerID) {
    const containerDir = path.join(__dirname, 'environments', containerID, 'container');
    const containerSize = await dirSize(containerDir); // in bytes
    const maxSize = 1024 * 1024 * 1024; // 1GB
    console.log('Container size: ' + containerSize + ' bytes');
    console.log('Max size: ' + maxSize + ' bytes');
    console.log('File size: ' + size + ' bytes');
    console.log('Enough space: ' + (containerSize + size <= maxSize));
    return containerSize + size <= maxSize;
}

const { readdir, stat } = require('fs/promises');

const dirSize = async directory => {
    const files = await readdir(directory);
    const stats = files.map(file => stat(path.join(directory, file)));

    return (await Promise.all(stats)).reduce((accumulator, { size }) => accumulator + size, 0);
}

//clean the container directory without deleting the container
app.delete('/clean', express.json(), (req, res) => {
    console.log('Clean request received');

    console.log(req.body);

    const containerID = req.body.containerID;
    console.log('Container ID: ' + containerID);
    const containerDir = path.join(__dirname, 'environments', containerID, 'container');
    console.log('Container directory: ' + containerDir);

    fs.rmdirSync(containerDir, { recursive: true });
    fs.mkdirSync(containerDir);
    res.send('Cleaned');
});

app.post('/getFileList', express.json(), async (req, res) => {
    console.log('Get file list request received');

    const containerID = req.body.containerID;
    const containerDir = path.join(__dirname, 'environments', containerID, 'container');
    const files = await readdir(containerDir);
    res.send(files);
});

app.delete('/deleteFile', express.json(), (req, res) => {
    console.log('Delete file request received');

    const containerID = req.body.containerID;
    const fileName = req.body.fileName;
    const containerDir = path.join(__dirname, 'environments', containerID, 'container');
    fs.unlinkSync(path.join(containerDir, fileName));
    res.send('Deleted');
});

app.post('/executeCommand', express.json(), async (req, res) => {
    console.log('Execute command request received');

    const containerID = req.body.containerID;
    const command = req.body.command;
    const containerDir = path.join(__dirname, 'environments', containerID, 'container');
    const result = await executeCommand(command, containerDir);
    res.send(result);
});

const { execSync, spawn } = require('child_process');

function executeCommand(command, cwd) {
    const childProcess = spawn(command, { cwd: cwd, shell: true });
    let result = '';

    childProcess.stdout.on('data', (data) => {
        result += data.toString();
        console.log(data.toString());
    }
    );

    childProcess.stderr.on('data', (data) => {
        result += data.toString();
        console.log(data.toString());
    }
    );

    childProcess.on('close', (code) => {
        console.log('Command exited with code ' + code);
    }
    );
}

app.post('/compileFile', express.json(), async (req, res) => {
    console.log('Compile file request received');

    const containerID = req.body.containerID;
    const fileName = req.body.fileName;
    const containerDir = path.join(__dirname, 'environments', containerID, 'container');
    const result = await compileFile(fileName, containerDir);
    res.send(result);
});

function compileFile(fileName, cwd) { //here we open the miranda file and compile it
    console.log('Compiling file: ' + fileName);
    console.log('CWD: ' + cwd);
    try {
        const result = execSync('mira ' + fileName, { cwd: cwd }).toString();
        console.log('Result: ' + result);
        return result;
    }
    catch (error) {
        console.log('Error: ' + error);
        return error.toString();
    }
}

