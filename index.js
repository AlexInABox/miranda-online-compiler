function getNewPage() {
    //send post request to the backend at /server.js with the url localhost on port 3000
    //open response in new tab
    fetch('https://miranda.alexinabox.de:3000/server.js', {
        method: 'POST',
        Headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => response.text())
        .then(text => {
            window.open('environments/' + text, '_blank');
        });
}

function deleteAllSubs() {
    //send a delete request to the backend at /server.js with the url localhost on port 3000
    fetch('https://miranda.alexinabox.de:3000/server.js', {
        method: 'DELETE',
        Headers: {
            'Content-Type': 'application/json'
        }
    })
}