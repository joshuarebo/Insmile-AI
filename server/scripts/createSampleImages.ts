import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

async function createSampleImages() {
  const TEST_IMAGES_DIR = path.join(__dirname, '../test/images');
  
  // Create test images directory if it doesn't exist
  if (!fs.existsSync(TEST_IMAGES_DIR)) {
    fs.mkdirSync(TEST_IMAGES_DIR, { recursive: true });
  }

  // Create a simple white image with black text for each type
  const types = ['xray', 'panoramic', 'intraoral'];
  
  for (const type of types) {
    const width = 800;
    const height = 600;
    const text = `Sample ${type} image`;

    // Create a white background
    const image = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    });

    // Save the image
    await image
      .jpeg()
      .toFile(path.join(TEST_IMAGES_DIR, `${type}.jpg`));
    
    console.log(`Created sample ${type} image`);
  }
}

createSampleImages(); 