#!/usr/bin/env python3
"""
Setup and run script for the crash detection system
This script will:
1. Set up the database
2. Add test crash images
3. Start the backend services
4. Start the frontend server
"""

import os
import subprocess
import time
import sys
from pathlib import Path

def run_command(command, background=False):
    """Run a command in subprocess"""
    try:
        if background:
            return subprocess.Popen(command, shell=True)
        else:
            result = subprocess.run(command, shell=True, capture_output=True, text=True)
            return result
    except Exception as e:
        print(f"Error running command '{command}': {e}")
        return None

def setup_database():
    """Initialize the database and add test data"""
    print("🔧 Setting up database...")
    
    # Run the test crash image script
    result = run_command("python test_crash_image.py")
    if result and result.returncode == 0:
        print("✅ Database setup completed with test data")
        print(result.stdout)
    else:
        print("⚠️ Database setup had issues, but continuing...")
        if result:
            print(result.stderr)

def start_frontend():
    """Start the frontend server"""
    print("🌐 Starting frontend server...")
    
    # Check if node_modules exists
    frontend_path = Path("frontend")
    if not (frontend_path / "node_modules").exists():
        print("📦 Installing frontend dependencies...")
        os.chdir("frontend")
        result = run_command("npm install")
        if result and result.returncode != 0:
            print("❌ Failed to install frontend dependencies")
            print(result.stderr)
            return None
        os.chdir("..")
    
    # Start the frontend server
    os.chdir("frontend")
    frontend_process = run_command("node server.js", background=True)
    os.chdir("..")
    
    if frontend_process:
        print("✅ Frontend server started on http://localhost:3333")
        return frontend_process
    else:
        print("❌ Failed to start frontend server")
        return None

def start_backend():
    """Start the backend services"""
    print("🚀 Starting backend services...")
    
    backend_process = run_command("python run_argus.py", background=True)
    
    if backend_process:
        print("✅ Backend services started")
        return backend_process
    else:
        print("❌ Failed to start backend services")
        return None

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    # Check Python packages
    required_packages = ['cv2', 'PyQt5', 'zmq', 'numpy', 'PIL']
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing Python packages: {', '.join(missing_packages)}")
        print("Please install them using: pip install -r requirements.txt")
        return False
    
    # Check Node.js
    result = run_command("node --version")
    if not result or result.returncode != 0:
        print("❌ Node.js not found. Please install Node.js to run the frontend.")
        return False
    
    print("✅ All dependencies found")
    return True

def main():
    """Main function"""
    print("=" * 60)
    print("🚗 TRAFFIC CRASH DETECTION SYSTEM")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        print("\nPlease install missing dependencies and try again.")
        sys.exit(1)
    
    # Setup database
    setup_database()
    time.sleep(2)
    
    # Start frontend
    frontend_process = start_frontend()
    time.sleep(3)
    
    # Start backend
    backend_process = start_backend()
    time.sleep(5)
    
    if frontend_process and backend_process:
        print("\n" + "=" * 60)
        print("🎉 SYSTEM SUCCESSFULLY STARTED!")
        print("=" * 60)
        print("📊 Frontend Dashboard: http://localhost:3333")
        print("🖥️  PyQt5 Camera Interface: Use 'python RunCamera.py' to process videos")
        print("📂 Test Videos Available: videos/1566.mp4, videos/1552.mp4, etc.")
        print("🔧 Backend Services: Running on ports 10000-10008")
        print("=" * 60)
        print("\n📋 TO TEST THE SYSTEM:")
        print("1. Open http://localhost:3333 in your browser")
        print("2. You should see test crash images in the dashboard")
        print("3. Run 'python RunCamera.py' in another terminal")
        print("4. Select a video from the videos/ folder")
        print("5. Click 'Process' to detect crashes")
        print("6. New crashes will appear in the web dashboard")
        print("\n⏹️  Press Ctrl+C to stop all services")
        
        try:
            # Keep the script running
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutting down services...")
            if frontend_process:
                frontend_process.terminate()
            if backend_process:
                backend_process.terminate()
            print("✅ All services stopped. Goodbye!")
    else:
        print("\n❌ Failed to start one or more services")
        sys.exit(1)

if __name__ == "__main__":
    main() 