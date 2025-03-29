import kagglehub
import os
import shutil
import glob

def download_dataset():
    print("Downloading CTooth dataset...")
    path = kagglehub.dataset_download("weiweicui/ctooth-dataset")
    print(f"Dataset downloaded to: {path}")
    
    # Create test images directory
    test_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test', 'images')
    os.makedirs(test_dir, exist_ok=True)
    
    # Search for image files recursively
    for root, dirs, files in os.walk(path):
        for file in files:
            file_lower = file.lower()
            if any(ext in file_lower for ext in ['.jpg', '.jpeg', '.png']):
                if any(term in file_lower for term in ['xray', 'panoramic', 'intraoral']):
                    source_path = os.path.join(root, file)
                    if 'xray' in file_lower:
                        target_name = 'xray.jpg'
                    elif 'panoramic' in file_lower:
                        target_name = 'panoramic.jpg'
                    else:
                        target_name = 'intraoral.jpg'
                    
                    target_path = os.path.join(test_dir, target_name)
                    shutil.copy2(source_path, target_path)
                    print(f"Copied {file} to {target_name}")

if __name__ == "__main__":
    download_dataset() 