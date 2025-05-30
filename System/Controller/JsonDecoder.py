import threading
from time import time

from System.Controller.JsonEncoder import JsonEncoder
from System.Data.CONSTANTS import *
from System.Functions.Crashing import Crashing
from System.Functions.Detection import Detection
from System.Functions.Master import Master
from System.Functions.Tracking import Tracking
from System.NodeType import NodeType
from VIF.vif import VIF


class JsonDecoder(threading.Thread):
    """
    Class responsible for decoding and processing messages between system components
    """
    
    def __init__(self, type=None, read_file=False, tf=False):
        """
        Initialize the decoder
        
        Args:
            type: Type of node (Master, Detection, Tracking, Crashing)
            read_file: Whether to use file-based object detection
            tf: Whether to use TensorFlow for detection
        """
        threading.Thread.__init__(self)
        self.sender_encode = JsonEncoder()
        self.yolo = None
        self.read_file = read_file
        self.tf = tf
        self.table = {}  # For performance tracking
        
        # Initialize components based on node type
        if type == NodeType.Detetion and not read_file:
            if tf:
                # Import here to avoid circular imports
                from Car_Detection_TF.yolo import YOLO
                self.yolo = YOLO()
        
        self.vif = None
        if NodeType.Crashing == type:
            self.vif = VIF()

    def run(self, message):
        """
        Process incoming message
        
        Args:
            message: Message to process
        """
        self.decode(message)

    def decode(self, msg):
        """
        Decode message and route to appropriate handler
        
        Args:
            msg: Message to decode
        """
        func = msg[FUNCTION]

        if func == FEED:  # 1st step: receive feed from video file
            camera_id = msg[CAMERA_ID]
            starting_frame_id = msg[STARTING_FRAME_ID]
            frames = msg[FRAMES]
            frame_width = msg[FRAME_WIDTH]
            frame_height = msg[FRAME_HEIGHT]
            read_file = msg[READ_FILE]
            boxes_file = msg[BOXES]
            city = msg[CITY]
            district_no = msg[DISTRICT]

            self.feed(camera_id, starting_frame_id, frames, frame_width, frame_height, 
                     read_file, boxes_file, city, district_no)

        elif func == DETECT:  # 2nd step: detect cars in the first frame
            camera_id = msg[CAMERA_ID]
            starting_frame_id = msg[STARTING_FRAME_ID]
            frames = msg[FRAMES]
            frame_width = msg[FRAME_WIDTH]
            frame_height = msg[FRAME_HEIGHT]
            read_file = msg[READ_FILE]
            boxes_file = msg[BOXES]
            city = msg[CITY]
            district_no = msg[DISTRICT]

            self.detect(camera_id, starting_frame_id, frames, frame_width, frame_height, 
                        read_file, boxes_file, city, district_no)

        elif func == TRACK:  # 3rd step: track cars over frames
            camera_id = msg[CAMERA_ID]
            starting_frame_id = msg[STARTING_FRAME_ID]
            frames = msg[FRAMES]
            frame_width = msg[FRAME_WIDTH]
            frame_height = msg[FRAME_HEIGHT]
            boxes = msg[BOXES]
            city = msg[CITY]
            district_no = msg[DISTRICT]
            start_detect_time = msg[START_DETECT_TIME]
            end_detect_time = msg[END_DETECT_TIME]

            self.track(camera_id, starting_frame_id, frames, frame_width, frame_height, 
                      boxes, start_detect_time, end_detect_time, city, district_no)

        elif func == CRASH:  # 4th step: check for crashes
            camera_id = msg[CAMERA_ID]
            starting_frame_id = msg[STARTING_FRAME_ID]
            frames = msg[FRAMES]
            trackers = msg[TRACKERS]
            city = msg[CITY]
            district_no = msg[DISTRICT]
            start_detect_time = msg[START_DETECT_TIME]
            end_detect_time = msg[END_DETECT_TIME]
            start_track_time = msg[START_TRACK_TIME]
            end_track_time = msg[END_TRACK_TIME]

            self.crash(camera_id, starting_frame_id, frames, trackers, start_detect_time, 
                      end_detect_time, start_track_time, end_track_time, city, district_no)

        elif func == RESULT:  # 5th step: process results
            camera_id = msg[CAMERA_ID]
            starting_frame_id = msg[STARTING_FRAME_ID]
            crash_dimentions = msg[CRASH_DIMENTIONS]
            city = msg[CITY]
            district_no = msg[DISTRICT]
            crash_frame = msg.get("CRASH_FRAME", None)

            self.result(camera_id, starting_frame_id, crash_dimentions, city, district_no, crash_frame)

        elif func == SEARCH:  # Search for crash records
            start_date = msg[START_DATE]
            end_date = msg[END_DATE]
            start_time = msg[START_TIME]
            end_time = msg[END_TIME]
            city = msg[CITY]
            district = msg[DISTRICT]
            self.query(start_date, end_date, start_time, end_time, city, district)
            
        elif func == REQ_VIDEO:  # Request crash video
            camera_id = msg[CAMERA_ID]
            starting_frame_id = msg[STARTING_FRAME_ID]
            self.reqVideo(camera_id, starting_frame_id)

        elif func == RECENT_CRASHES:  # Get recent crash records
            self.sendRecentCrashes()

    def feed(self, camera_id, starting_frame_id, frames, frame_width, frame_height, read_file, boxes_file, city, district_no):
        """
        Save frames and forward to detection step
        """
        master = Master()
        master.saveFrames(camera_id, starting_frame_id, frames, frame_width, frame_height)
        self.sender_encode.detect(camera_id, starting_frame_id, frames, frame_width, frame_height, 
                                  read_file, boxes_file, city, district_no)

    def detect(self, camera_id, starting_frame_id, frames, frame_width, frame_height, read_file, boxes_file, city, district_no):
        """
        Detect vehicles in frames and forward to tracking step
        """
        start_detect_time = time()
        
        # Initialize YOLO if needed
        if not read_file and self.yolo is None and self.tf:
            from Car_Detection_TF.yolo import YOLO
            self.yolo = YOLO()

        # Detect vehicles
        detection = Detection(self.yolo)
        boxes = detection.detect(frames, frame_width, frame_height, read_file, 
                                boxes_file, self.read_file, self.tf)

        # Log performance and forward to tracking
        self.printLog("Detect", camera_id, start_detect_time, starting_frame_id+len(frames))
        self.sender_encode.track(camera_id, starting_frame_id, frames, boxes, 
                                frame_width, frame_height, start_detect_time, city, district_no)

    def track(self, camera_id, starting_frame_id, frames, frame_width, frame_height, boxes, start_detect_time, end_detect_time, city, district_no):
        """
        Track vehicles across frames and forward to crash detection
        """
        start_track_time = time()
        
        track = Tracking()
        trackers = track.track(frames, boxes, frame_width, frame_height)
        
        self.printLog("Track", camera_id, start_track_time, starting_frame_id+len(frames))
        self.sender_encode.crash(camera_id, starting_frame_id, frames, trackers, 
                                start_detect_time, end_detect_time, start_track_time, city, district_no)

    def crash(self, camera_id, starting_frame_id, frames, trackers, start_detect_time, end_detect_time, start_track_time, end_track_time, city, district_no):
        """
        Check for crashes among tracked vehicles
        """
        if self.vif is None:
            self.vif = VIF()

        start_crash_time = time()
        crashing = Crashing(self.vif)
        crash_dimentions, crash_frame, crash_frame_index = crashing.crash(frames, trackers)
        
        self.printLog("Crash", camera_id, start_crash_time, starting_frame_id+len(frames))
        self.sender_encode.result(camera_id, starting_frame_id, crash_dimentions, 
                                 start_detect_time, end_detect_time, start_track_time, 
                                 end_track_time, start_crash_time, city, district_no, crash_frame)

    def result(self, camera_id, starting_frame_id, crash_dimentions, city, district_no, crash_frame):
        """
        Process crash detection results
        """
        master = Master()
        master.checkResult(camera_id, starting_frame_id, crash_dimentions, city, district_no, crash_frame)

    def query(self, start_date, end_date, start_time, end_time, city, district):
        """Execute search query for crash records"""
        master = Master()
        master.executeQuery(start_date, end_date, start_time, end_time, city, district)

    def reqVideo(self, camera_id, starting_frame_id):
        """Request video for a specific crash"""
        master = Master()
        master.sendVideoToGUI(camera_id, starting_frame_id)

    def sendRecentCrashes(self):
        """Retrieve and send recent crash records"""
        master = Master()
        master.sendRecentCrashesToGUI()

    def printLog(self, Module, camera_id, starting_time, number_of_frames):
        """Log performance metrics for system modules"""
        if camera_id not in self.table or self.table[camera_id][0] > number_of_frames:
            self.table[camera_id] = [number_of_frames, 0]
            
        self.table[camera_id][0] = number_of_frames
        self.table[camera_id][1] += time() - starting_time
        
        avg_time = self.table[camera_id][1] / number_of_frames
        total_time = self.table[camera_id][1]
        
        print(f"AVG {Module} Time {camera_id}: {avg_time}")
        print(f"Total {Module} Time {camera_id}: {total_time}")