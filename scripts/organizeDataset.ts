import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const copyFile = promisify(fs.copyFile);

const DATASET_PATH = path.join(__dirname, '..', 'test-data');
const OUTPUT_PATH = path.join(__dirname, '..', 'dataset');

// Split ratios
const TRAIN_RATIO = 0.7;
const VALIDATION_RATIO = 0.15;
const TEST_RATIO = 0.15;

async function organizeDataset() {
  try {
    // Create output directories
    const dirs = ['train', 'validation', 'test'];
    for (const dir of dirs) {
      await mkdir(path.join(OUTPUT_PATH, dir), { recursive: true });
    }

    // Read all images from the dataset
    const files = await readdir(DATASET_PATH);
    const imageFiles = files.filter(file => 
      file.toLowerCase().endsWith('.jpg') || 
      file.toLowerCase().endsWith('.png')
    );

    // Shuffle files
    const shuffledFiles = imageFiles.sort(() => Math.random() - 0.5);

    // Calculate split sizes
    const totalFiles = shuffledFiles.length;
    const trainSize = Math.floor(totalFiles * TRAIN_RATIO);
    const validationSize = Math.floor(totalFiles * VALIDATION_RATIO);

    // Split files
    const trainFiles = shuffledFiles.slice(0, trainSize);
    const validationFiles = shuffledFiles.slice(trainSize, trainSize + validationSize);
    const testFiles = shuffledFiles.slice(trainSize + validationSize);

    // Copy files to respective directories
    console.log('Copying files...');
    
    for (const file of trainFiles) {
      await copyFile(
        path.join(DATASET_PATH, file),
        path.join(OUTPUT_PATH, 'train', file)
      );
    }

    for (const file of validationFiles) {
      await copyFile(
        path.join(DATASET_PATH, file),
        path.join(OUTPUT_PATH, 'validation', file)
      );
    }

    for (const file of testFiles) {
      await copyFile(
        path.join(DATASET_PATH, file),
        path.join(OUTPUT_PATH, 'test', file)
      );
    }

    console.log('Dataset organization completed!');
    console.log(`Total files: ${totalFiles}`);
    console.log(`Train set: ${trainFiles.length} files`);
    console.log(`Validation set: ${validationFiles.length} files`);
    console.log(`Test set: ${testFiles.length} files`);

  } catch (error) {
    console.error('Error organizing dataset:', error);
    process.exit(1);
  }
}

organizeDataset(); 