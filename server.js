import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
// Import Canvas dependencies explicitly for the compiler
import { createCanvas, Image, loadImage } from 'canvas';
import { Compiler } from 'offline-mind-ar-compiler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Uploads
const upload = multer({
  dest: path.join(__dirname, 'temp_uploads/'),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Middleware
app.use(express.json());
// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));
// Serve static files for the AR viewer and generated assets
app.use(express.static(path.join(__dirname, 'public')));

// Ensure directories exist
const publicUploads = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploads)) {
  fs.mkdirSync(publicUploads, { recursive: true });
}

// API: Create AR Experience
app.post('/api/create', upload.fields([{ name: 'target', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const targetFile = req.files['target']?.[0];
    const videoFile = req.files['video']?.[0];

    if (!targetFile || !videoFile) {
      return res.status(400).json({ error: 'Both target image and overlay video are required.' });
    }

    const experienceId = uuidv4();
    const outputDir = path.join(publicUploads, experienceId);
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Prepare the Target Image
    const targetBuffer = await fs.promises.readFile(targetFile.path);
    let targetImage = await loadImage(targetBuffer);

    // SAFETY: Resize image if too large to prevent Compiler OOM (Out of Memory)
    const MAX_WIDTH = 1000;
    if (targetImage.width > MAX_WIDTH) {
      const scale = MAX_WIDTH / targetImage.width;
      const newWidth = MAX_WIDTH;
      const newHeight = Math.round(targetImage.height * scale);

      console.log(`[${experienceId}] Image too large (${targetImage.width}x${targetImage.height}). Resizing to ${newWidth}x${newHeight} for compilation.`);

      const canvas = createCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(targetImage, 0, 0, newWidth, newHeight);
      
      // Convert canvas back to buffer and reload into an Image object
      const resizedBuffer = canvas.toBuffer('image/jpeg');
      targetImage = await loadImage(resizedBuffer);
    }

    // 2. Initialize Compiler (The Hard Part)
    // We must pass the canvas Image class and createCanvas function
    const compiler = new Compiler({
      image: Image,
      createCanvas: createCanvas
    });

    console.log(`[${experienceId}] Starting compilation...`);

    // 3. Compile
    await compiler.compileImageTargets([targetImage], (progress) => {
      console.log(`[${experienceId}] Progress: ${progress.toFixed(2)}%`);
    });

    const exportedBuffer = await compiler.exportData();

    // 4. Save .mind file
    await fs.promises.writeFile(path.join(outputDir, 'targets.mind'), exportedBuffer);

    // 5. Save Video file
    const videoExt = path.extname(videoFile.originalname);
    await fs.promises.rename(videoFile.path, path.join(outputDir, `video${videoExt}`));
    
    // Cleanup the temp target file
    await fs.promises.unlink(targetFile.path);

    // 6. Generate QR Code
    const protocol = req.protocol;
    const host = req.get('host');
    const viewerUrl = `${protocol}://${host}/viewer.html?id=${experienceId}&ext=${videoExt.replace('.', '')}`;
    
    const qrCodeDataUrl = await QRCode.toDataURL(viewerUrl);

    console.log(`[${experienceId}] Compilation complete.`);

    res.json({
      success: true,
      id: experienceId,
      viewerUrl: viewerUrl,
      qrCode: qrCodeDataUrl
    });

  } catch (error) {
    console.error('Compilation failed:', error);
    res.status(500).json({ error: 'Failed to process AR experience', details: error.message });
  }
});

// Fallback for React Router (if used, though we are using HashRouter in frontend usually)
app.get('*', (req, res) => {
  // If the request is for a file in public (like viewer.html), express.static above handles it.
  // Otherwise serve index.html
  if (req.path.endsWith('.html') || req.path.includes('.')) {
    res.status(404).send('Not Found');
  } else {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});