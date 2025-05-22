#!/usr/bin/env python3
"""
Test script to add a crash image to the database for frontend testing
"""

import cv2
import numpy as np
from datetime import datetime
from System.Data.Database import CrashDatabase

def create_test_crash_image():
    """Create a test crash image with red rectangles and text"""
    # Create a realistic looking traffic scene
    img = np.zeros((360, 480, 3), dtype=np.uint8)
    
    # Add a gray road background
    img[:] = (80, 80, 80)  # Gray background
    
    # Add road markings (white lines)
    cv2.line(img, (0, 180), (480, 180), (255, 255, 255), 2)  # Center line
    cv2.line(img, (0, 160), (480, 160), (255, 255, 255), 1)  # Lane marking
    cv2.line(img, (0, 200), (480, 200), (255, 255, 255), 1)  # Lane marking
    
    # Add some cars
    # Car 1 (blue car)
    cv2.rectangle(img, (150, 140), (200, 170), (255, 0, 0), -1)
    cv2.rectangle(img, (150, 140), (200, 170), (0, 0, 0), 2)
    
    # Car 2 (red car - crashed)
    cv2.rectangle(img, (220, 150), (270, 180), (0, 0, 255), -1)
    cv2.rectangle(img, (220, 150), (270, 180), (0, 0, 0), 2)
    
    # Add crash effect (red rectangle around crash area)
    crash_area = (140, 130, 280, 190)
    cv2.rectangle(img, (crash_area[0], crash_area[1]), (crash_area[2], crash_area[3]), (0, 0, 255), 3)
    
    # Add "CRASH DETECTED!" text
    cv2.putText(img, "CRASH DETECTED!", (crash_area[0], crash_area[1] - 10), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
    
    # Add timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(img, f"Time: {timestamp}", (10, 30), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
    
    # Add camera info
    cv2.putText(img, "Camera: 9999", (10, 350), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return img

def main():
    """Main function to create and save test crash image"""
    print("Creating test crash image...")
    
    # Create test image
    crash_image = create_test_crash_image()
    
    # Save to file for verification
    cv2.imwrite("test_crash_9999_1.jpg", crash_image)
    print("Test image saved as test_crash_9999_1.jpg")
    
    # Save to database
    db = CrashDatabase()
    crash_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    success = db.save_crash_image(
        camera_id=9999,
        frame_id=1,
        city="Test City",
        district="Test District",
        crash_time=crash_time,
        image=crash_image
    )
    
    if success:
        print("✅ Test crash image saved to database successfully!")
        print(f"   Camera ID: 9999")
        print(f"   Frame ID: 1")
        print(f"   Location: Test City, Test District")
        print(f"   Time: {crash_time}")
    else:
        print("❌ Failed to save test crash image to database")
    
    # Create a second test image
    print("\nCreating second test crash image...")
    crash_image2 = create_test_crash_image()
    
    # Modify it slightly
    cv2.putText(crash_image2, "CRASH #2", (300, 50), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
    
    cv2.imwrite("test_crash_9999_2.jpg", crash_image2)
    
    success2 = db.save_crash_image(
        camera_id=9999,
        frame_id=2,
        city="Test City 2",
        district="Test District 2", 
        crash_time=crash_time,
        image=crash_image2
    )
    
    if success2:
        print("✅ Second test crash image saved to database successfully!")

if __name__ == "__main__":
    main() 