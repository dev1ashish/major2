#!/usr/bin/env python3
"""
Test script to simulate Twilio SMS functionality
Shows what the crash alert SMS would look like with frontend links
"""

import sys
import os
from datetime import datetime

# Add the current directory to Python path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def simulate_crash_alert_sms(camera_id, frame_id, city, district):
    """Simulate what the Twilio SMS would look like"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    frontend_url = f"http://localhost:3333/?crash={camera_id}-{frame_id}"
    
    message_body = (
        f"🚨 CRASH ALERT!\n"
        f"Time: {timestamp}\n"
        f"Location: {city}, {district}\n"
        f"Camera ID: {camera_id}\n"
        f"🔗 View Details: {frontend_url}"
    )
    
    print("=" * 50)
    print("📱 SIMULATED TWILIO SMS MESSAGE")
    print("=" * 50)
    print(message_body)
    print("=" * 50)
    print(f"\n🌐 Direct Link: {frontend_url}")
    print(f"📧 Test Page: file://{os.path.abspath('test_sms_link.html')}")
    print("\n✅ Copy the link above and paste it in your browser to test!")
    
    return frontend_url

if __name__ == "__main__":
    print("🧪 TWILIO SMS LINK TESTING")
    print("\nSimulating crash alerts for existing crashes in database...\n")
    
    # Test with real crashes from your database
    test_crashes = [
        {"camera_id": 1518, "frame_id": 1, "city": "Abu Kabir", "district": "District 7"},
        {"camera_id": 1518, "frame_id": 61, "city": "Al-Mansura", "district": "District 27"},
        {"camera_id": 1552, "frame_id": 106, "city": "Damietta", "district": "District 8"}
    ]
    
    for i, crash in enumerate(test_crashes, 1):
        print(f"\n📍 TEST CRASH #{i}:")
        simulate_crash_alert_sms(
            crash["camera_id"], 
            crash["frame_id"], 
            crash["city"], 
            crash["district"]
        )
        
        if i < len(test_crashes):
            print("\n" + "-" * 30)
    
    print(f"\n🎯 NEXT STEPS:")
    print("1. Make sure your frontend server is running on http://localhost:3333")
    print("2. Click any of the links above")
    print("3. The frontend should load and display the specific crash image")
    print("4. You should see a green '🔗 Loaded from SMS Link' indicator") 