import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function downloadDataset() {
  try {
    console.log('Installing kagglehub...');
    await execAsync('pip install kagglehub');
    
    console.log('Running Python script to download dataset...');
    const scriptPath = path.join(__dirname, 'download_dataset.py');
    const { stdout, stderr } = await execAsync(`python ${scriptPath}`);
    
    console.log(stdout);
    if (stderr) {
      console.error('Python script errors:', stderr);
    }
    
    console.log('Test images prepared successfully!');
  } catch (error) {
    console.error('Error preparing test images:', error);
    process.exit(1);
  }
}

downloadDataset(); 