import cv2
import numpy as np
import os
from datetime import datetime
from System.Data.Database import CrashDatabase

def create_test_image(text, size=(400, 600)):
    """Create a test image with text"""
    # Create a colored background
    img = np.zeros((size[0], size[1], 3), dtype=np.uint8)
    img[:] = (0, 0, 255)  # Red background
    
    # Add text
    lines = text.split('\n')
    for i, line in enumerate(lines):
        y_pos = 50 + (i * 40)
        cv2.putText(
            img,
            line,
            (30, y_pos),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),  # White text
            2
        )
    
    return img

def main():
    print("Creating test crash data...")
    
    # Initialize database
    db = CrashDatabase('crash_database.db')
    
    # Test data
    test_crashes = [
        {
            'camera_id': 9999,
            'frame_id': 1,
            'city': 'Test City',
            'district': 'Test District 1',
            'crash_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        },
        {
            'camera_id': 9999,
            'frame_id': 2,
            'city': 'Test City',
            'district': 'Test District 2',
            'crash_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    ]
    
    # Add each test crash to the database
    for crash in test_crashes:
        # Create a test image with crash info
        image_text = f"CRASH TEST DATA\n\nCamera ID: {crash['camera_id']}\nFrame ID: {crash['frame_id']}\nLocation: {crash['city']}, {crash['district']}\nTime: {crash['crash_time']}"
        img = create_test_image(image_text)
        
        # Save to disk for verification
        filename = f"test_crash_{crash['camera_id']}_{crash['frame_id']}.jpg"
        cv2.imwrite(filename, img)
        print(f"Saved test image to {filename}")
        
        # Save to database
        success = db.save_crash_image(
            crash['camera_id'],
            crash['frame_id'],
            crash['city'],
            crash['district'],
            crash['crash_time'],
            img
        )
        
        print(f"Added test crash {crash['camera_id']}-{crash['frame_id']} to database: {'Success' if success else 'Failed'}")
    
    print("Test data creation completed!")

if __name__ == "__main__":
    main() 