import express from 'express';
import multer from 'multer';
import { OfflineCompiler } from 'mind-ar/src/image-target/offline-compiler.js';
import { createCanvas, loadImage } from 'canvas'; // <--- MUDANCA AQUI (loadImage)
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
        console.log("1. Pedido recebido");
        if (!req.files || !req.files['target'] || !req.files['video']) {
            return res.status(400).json({ error: 'Faltam ficheiros (imagem ou video)' });
        }

        const targetBuffer = req.files['target'][0].buffer;
        const videoBuffer = req.files['video'][0].buffer;
        const experienceId = uuidv4();
        
        console.log("2. A carregar imagem...");
        
        // --- CORRECAO CRITICA ---
        // Usamos await loadImage para garantir que a imagem esta carregada
        // antes de tentarmos ler a largura
        const img = await loadImage(targetBuffer);
        
        console.log(`3. Imagem carregada: ${img.width}x${img.height}`);
        
        if (img.width === 0 || img.height === 0) {
            throw new Error("A imagem tem tamanho 0. Tenta outro ficheiro JPG/PNG.");
        }

        const expDir = path.join(uploadsDir, experienceId);
        fs.mkdirSync(expDir);

        let width = img.width;
        let height = img.height;
        
        // Redimensionar se for gigante (seguranca para RAM)
        if (width > 800) { // Baixei para 800 para ser mais seguro
            const scale = 800 / width;
            width = 800;
            height = Math.floor(height * scale);
        }

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = new Uint8Array(imageData.data.buffer);

        console.log("4. A iniciar compilador AR...");
        const compiler = new OfflineCompiler();
        await compiler.compileImageTargets([data], [width], [height]);
        const exportedBuffer = compiler.exportData();

        console.log("5. Compilacao terminada. A guardar ficheiros...");
        fs.writeFileSync(path.join(expDir, 'targets.mind'), Buffer.from(exportedBuffer));
        fs.writeFileSync(path.join(expDir, 'video.mp4'), videoBuffer);
        
        const viewerUrl = `https://${req.get('host')}/viewer.html?id=${experienceId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(viewerUrl);

        console.log("6. Sucesso!");
        res.json({
            success: true,
            viewerUrl: viewerUrl,
            qrCode: qrCodeDataUrl
        });

    } catch (error) {
        console.error('ERRO FATAL:', error);
        res.status(500).json({ error: error.message || "Erro desconhecido no servidor" });
    }
});

app.listen(port, () => {
    console.log(`Servidor a correr na porta ${port}`);
});
