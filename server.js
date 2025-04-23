const express = require('express');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const app = express();
const port = 3000;

// Define directory paths
const cemeteriesDir = path.join(__dirname, 'cemeteries');
const geojsonDir = path.join(__dirname, 'geojson');
const notesDir = path.join(__dirname, 'notes');
const excelFilePath = path.join(__dirname, 'Data.xlsx');

// Middleware
app.use(express.static('public'));
app.use('/cemeteries', express.static(cemeteriesDir));
app.use('/geojson', express.static(geojsonDir));
app.use('/notes', express.static(notesDir));

// Get list of cemeteries
app.get('/api/cemeteries', (req, res) => {
    fs.readdir(cemeteriesDir, (err, files) => {
        if (err) {
            console.error('Unable to scan directory:', err);
            return res.status(500).json({ error: 'Unable to scan directory' });
        }
        const directories = files.filter(file => 
            fs.statSync(path.join(cemeteriesDir, file)).isDirectory()
        );
        res.json(directories);
    });
});

// Get files for specific cemetery
app.get('/api/cemeteries/:name/files', (req, res) => {
    const cemeteryName = req.params.name;
    const cemeteryPath = path.join(cemeteriesDir, cemeteryName);

    fs.readdir(cemeteryPath, (err, files) => {
        if (err) {
            console.error('Unable to scan directory:', err);
            return res.status(500).json({ error: 'Unable to scan directory' });
        }
        const filteredFiles = files.filter(file => file.toLowerCase() !== 'thumbs.db');
        res.json(filteredFiles);
    });
});

// Get notes for specific cemetery (now using HTML files)
app.get('/api/cemeteries/:name/notes', (req, res) => {
    const cemeteryName = req.params.name;
    const notesPath = path.join(notesDir, `${cemeteryName}.html`);

    fs.readFile(notesPath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                return res.json({ notes: '<p>No notes available</p>' });
            }
            console.error('Error reading notes file:', err);
            return res.status(500).json({ error: 'Error reading notes file' });
        }
        res.json({ notes: data });
    });
});

// Get cemetery information from Excel file
app.get('/api/cemeteries/info', (req, res) => {
    try {
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet, {
            header: ['Zone', 'Name', 'Address', 'Distance']
        });
        res.json(data);
    } catch (error) {
        console.error('Error reading Excel file:', error);
        res.status(500).json({ error: 'Error reading Excel file' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});