import multer from 'multer';

// Uploads are buffered temporarily and immediately persisted to Firebase Storage.
const storage = process.env.NODE_ENV === 'production' ? multer.memoryStorage() : multer.diskStorage({
  destination: (req, file, callback) => {
    import('node:fs').then(({ mkdirSync }) => {
      const directory = `${process.cwd()}/server/data/media`;
      mkdirSync(directory, { recursive: true });
      callback(null, directory);
    }).catch(callback);
  },
  filename: (req, file, callback) => callback(null, `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${file.originalname.slice(file.originalname.lastIndexOf('.'))}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});
