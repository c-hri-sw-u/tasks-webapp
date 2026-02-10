const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

async function convert() {
    await app.whenReady();

    const win = new BrowserWindow({
        show: false,
        width: 512,
        height: 512,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            offscreen: true
        }
    });

    const svgPath = path.join(__dirname, '../app/icon.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf8');

    // Create a data URI for the SVG
    const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

    await win.loadURL(dataUri);

    // Wait a bit for rendering
    await new Promise(resolve => setTimeout(resolve, 500));

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();

    const buildDir = path.join(__dirname, '../build');
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }

    const outPath = path.join(buildDir, 'icon.png');
    fs.writeFileSync(outPath, pngBuffer);

    console.log(`Generic icon saved to ${outPath}`);

    app.quit();
}

convert();
