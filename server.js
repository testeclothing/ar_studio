import express from 'express';
import multer from 'multer';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { createCanvas, Image } from 'canvas';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Configurar uploads
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));
app.use(express.json());

// Criar pasta de uploads se não existir
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.post('/api/create', upload.fields([{ name: 'target' }, { name: 'video' }]), async (req, res) => {
    try {
        if (!req.files || !req.files['target'] || !req.files['video']) {
            return res.status(400).json({ error: 'Faltam ficheiros (imagem ou video)' });
        }

        const targetBuffer = req.files['target'][0].buffer;
        const videoBuffer = req.files['video'][0].buffer;
        const experienceId = uuidv4();
        
        // Criar pasta para esta experiência
        const expDir = path.join(uploadsDir, experienceId);
        fs.mkdirSync(expDir);

        // 1. Processar Imagem com Canvas (Redimensionar se for gigante)
        const img = new Image();
        img.src = targetBuffer;
        
        let width = img.width;
        let height = img.height;
        
        // Limite de segurança para não rebentar a memória (Max 1000px)
        if (width > 1000) {
            const scale = 1000 / width;
            width = 1000;
            height = Math.floor(height * scale);
        }

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Obter dados brutos da imagem para o compilador
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = new Uint8Array(imageData.data.buffer);

        // 2. Compilar Target (.mind) usando a biblioteca OFICIAL
        console.log("A iniciar compilacao...");
        const compiler = new OfflineCompiler();
        await compiler.compileImageTargets([data], [width], [height]);
        const exportedBuffer = compiler.exportData();

        // 3. Guardar ficheiros
        fs.writeFileSync(path.join(expDir, 'targets.mind'), Buffer.from(exportedBuffer));
        fs.writeFileSync(path.join(expDir, 'video.mp4'), videoBuffer);
        
        // Guardar a imagem original para referência (opcional)
        fs.writeFileSync(path.join(expDir, 'target.jpg'), targetBuffer);

        // 4. Gerar QR Code
        // URL final onde o utilizador vai ver a experiência
        const viewerUrl = `https://${req.get('host')}/viewer.html?id=${experienceId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(viewerUrl);

        res.json({
            success: true,
            viewerUrl: viewerUrl,
            qrCode: qrCodeDataUrl
        });

    } catch (error) {
        console.error('Erro no servidor:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});
