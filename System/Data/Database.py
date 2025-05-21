import sqlite3
import os
import cv2
import numpy as np
import io

class CrashDatabase:
    def __init__(self, db_path="crash_database.db"):
        """Initialize SQLite database for crash images"""
        self.db_path = db_path
        self.initialize_db()

    def initialize_db(self):
        """Create database tables if they don't exist"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create crash_images table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS crash_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    camera_id INTEGER NOT NULL,
                    frame_id INTEGER NOT NULL,
                    city TEXT,
                    district TEXT,
                    crash_time TEXT,
                    image BLOB,
                    UNIQUE(camera_id, frame_id)
                )
            ''')
            conn.commit()
        except sqlite3.Error as e:
            print(f"Database initialization error: {e}")
        finally:
            if conn:
                conn.close()
    
    def save_crash_image(self, camera_id, frame_id, city, district, crash_time, image):
        """Save crash image to database"""
        if image is None:
            return False
            
        conn = None
        try:
            # Convert image to binary
            _, img_encoded = cv2.imencode('.jpg', image)
            img_binary = img_encoded.tobytes()
            
            # Save to database
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO crash_images
                (camera_id, frame_id, city, district, crash_time, image)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (camera_id, frame_id, city, district, crash_time, img_binary))
            conn.commit()
            return True
        except sqlite3.Error as e:
            print(f"Error saving crash image to database: {e}")
            return False
        finally:
            if conn:
                conn.close()
    
    def get_crash_image(self, camera_id, frame_id):
        """Retrieve crash image from database"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT image FROM crash_images
                WHERE camera_id = ? AND frame_id = ?
            ''', (camera_id, frame_id))
            result = cursor.fetchone()
            
            if result and result[0]:
                # Convert binary back to image
                img_array = np.frombuffer(result[0], dtype=np.uint8)
                img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
                return img
            return None
        except sqlite3.Error as e:
            print(f"Error retrieving crash image from database: {e}")
            return None
        finally:
            if conn:
                conn.close()
                
    def get_all_crash_records(self):
        """Get all crash records from database"""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            cursor.execute('''
                SELECT camera_id, frame_id, city, district, crash_time
                FROM crash_images
                ORDER BY crash_time DESC
            ''')
            records = cursor.fetchall()
            
            result = []
            for record in records:
                result.append({
                    'camera_id': record[0],
                    'frame_id': record[1],
                    'city': record[2],
                    'district': record[3],
                    'crash_time': record[4]
                })
            return result
        except sqlite3.Error as e:
            print(f"Error retrieving crash records from database: {e}")
            return []
        finally:
            if conn:
                conn.close() 