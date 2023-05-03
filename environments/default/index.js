function uploadFileFetch() {
    const fileInput = document.querySelector('input[type="file"]');
    const file = fileInput.files[0];
    const containerID = window.location.pathname.split('/')[2];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('containerID', containerID);

    fetch('https://miranda.alexinabox.de:3000/upload', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        console.log('Upload successful');
        getFileList();
    }).catch(error => {
        console.error(error);
        getFileList();
    });
}

function sendCleanCommand() {
    const containerID = window.location.pathname.split('/')[2];
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var raw = JSON.stringify({
        "containerID": containerID
    });
    fetch('https://miranda.alexinabox.de:3000/clean', {
        method: 'DELETE',
        headers: myHeaders,
        body: raw
    }).then(response => {
        if (!response.ok) {
            throw new Error('Clean failed');
        }
        console.log('Clean successful');
        getFileList();
    }).catch(error => {
        console.error(error);
        getFileList();
    });
}

function getFileList() {
    const containerID = window.location.pathname.split('/')[2];
    fetch('https://miranda.alexinabox.de:3000/getFileList', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            containerID: containerID
        })
    }).then(response => response.json())
        .then(data => {
            console.log(data);
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            data.forEach(file => {
                const li = document.createElement('li');
                const p = document.createElement('p');
                const b = document.createElement('button');
                li.className = 'listFile';
                p.className = 'fileName';
                p.innerHTML = file;
                b.className = 'deleteButton';
                b.innerHTML = 'Delete';
                li.appendChild(p);
                li.innerHTML = li.innerHTML + '<button class="deleteButton" onclick=deleteFile("' + file + '")>Delete</button>';
                fileList.appendChild(li);
            });
        });
}

getFileList();

function deleteFile(fileName) {
    console.log(fileName);
    const containerID = window.location.pathname.split('/')[2];
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var raw = JSON.stringify({
        "containerID": containerID,
        "fileName": fileName
    });
    fetch('https://miranda.alexinabox.de:3000/deleteFile', {
        method: 'DELETE',
        headers: myHeaders,
        body: raw
    }).then(response => {
        if (!response.ok) {
            throw new Error('Delete failed');
        }
        console.log('Delete successful');
        //reload page
        location.reload();
    }).catch(error => {
        console.error(error);
        //reload page
        location.reload();
    });
}

function sendCommand() {
    //send command to server and append response to terminal as text
    const message = document.getElementById('terminalInput').value;
    const containerID = window.location.pathname.split('/')[2];
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var raw = JSON.stringify({
        "containerID": containerID,
        "command": message
    });
    fetch('https://miranda.alexinabox.de:3000/executeCommand', {
        method: 'POST',
        headers: myHeaders,
        body: raw
    }).then(response => response.text())
        .then(data => {
            console.log(data);
            const terminal = document.getElementById('terminal');
            const p = document.createElement('p');
            p.innerHTML = data;
            terminal.appendChild(p);
        });
}