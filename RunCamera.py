import sys
from PyQt5.QtWidgets import *
from PyQt5.QtGui import *
from PyQt5.QtCore import *
import cv2
import numpy as np
import zmq
from System.Data.CONSTANTS import *
from System.CameraNode import CameraNode
import random

vidpath = ''
# Updated to major Indian cities
cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad',
         'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
         'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra',
         'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
         'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai', 'Allahabad']


class Button(QPushButton):
    def __init__(self, title, parent):
        super().__init__(title, parent)
        self.setAcceptDrops(True)

    def dragEnterEvent(self, e):
        m = e.mimeData()
        if m.hasUrls():
            e.accept()
        else:
            e.ignore()

    def dropEvent(self, e):
        global vidpath
        m = e.mimeData()
        if m.hasUrls():
            self.parent().loadVideo(m.urls()[0].toLocalFile())
            vidpath = m.urls()[0].toLocalFile()
            print(m.urls()[0].toLocalFile())


class Client(QWidget):
    def __init__(self, port=MASTERPORT, ip=MASTERIP):
        super().__init__()

        self.setWindowTitle('Video Processor')
        self.setGeometry(350, 90, 629, 597)
        self.setFixedSize(615, 419)

        # Video controls
        self.select_vid = Button("", self)
        self.select_vid.setText('Select video')
        self.select_vid.move(170, 20)
        self.select_vid.resize(91,71)
        self.select_vid.clicked.connect(self.getfiles)
        font = QFont('SansSerif', 9)
        font.setBold(True)
        self.select_vid.setFont(font)

        # Video display area
        self.play_vid = QPushButton(self)
        self.play_vid.setStyleSheet("background-color: #000000;")
        self.play_vid.setText('')
        self.play_vid.move(30, 105)
        self.play_vid.resize(559, 300)
        self.play_vid.clicked.connect(self.playVideo)

        # Process button
        process = QPushButton(self)
        process.setText('Process')
        process.move(350, 20)
        process.resize(91,71)
        process.clicked.connect(self.sendToBk)
        process.setFont(font)

        # Initialize connection
        context = zmq.Context()
        self.socket = context.socket(zmq.REQ)
        self.socket.connect("tcp://"+ip+":"+str(port))

    def sendToBk(self):
        global vidpath, cities

        if vidpath=='':
            return

        video_id = vidpath.split('.')[0]
        video_id = video_id.split('/')
        video_id = int(video_id[-1])
        print("hello")
        CameraNode(video_id, 'videos/' + str(video_id) + '.mp4', files=Work_Detect_Files, city=random.choice(cities), district_no='District ' + str(random.randint(1, 30))).start()
        self.playVideo()

    def playVideo(self):
        global vidpath
        print(vidpath)
        if vidpath=='':
            return

        cap = cv2.VideoCapture(vidpath)

        if not cap.isOpened():
            print("Error opening video file")

        while cap.isOpened():
            ret, frame = cap.read()
            if ret:
                cv2.imshow('Frame', frame)
                if cv2.waitKey(25) & 0xFF == ord('q'):
                    break
            else:
                break

        cap.release()
        cv2.destroyAllWindows()

    def getfiles(self):
        global vidpath

        fileName, _ = QFileDialog.getOpenFileName(self, 'Single File', 'C:\\', '*.mp4 *.mkv *.avi')

        if fileName=='':
            return

        self.loadVideo(path=fileName)
        vidpath = fileName
        print(vidpath, 'vid')
        print(fileName)

    def loadVideo(self, path='h.mp4'):
        cap = cv2.VideoCapture(path)
        ret, frame = cap.read()

        img = cv2.resize(frame, (351, 241), interpolation=cv2.INTER_AREA)

        button = cv2.imread('UI/Play-Button-PNG-Picture.png')
        button = cv2.resize(button, (111, 111), interpolation=cv2.INTER_AREA)

        height_needed = 241 - button.shape[0]
        width_needed = 351 - button.shape[1]

        top = int(np.floor(height_needed / 2))
        bottom = int(np.ceil(height_needed / 2))
        left = int(np.floor(width_needed / 2))
        right = int(np.ceil(width_needed / 2))

        border = cv2.copyMakeBorder(button, top=top, bottom=bottom, left=left, right=right, borderType=cv2.BORDER_CONSTANT, value=0)
        border = np.where(border < 150, img, border)

        border = cv2.resize(border, (559, 300), interpolation=cv2.INTER_AREA)
        cv2.imwrite('UI/tempToLoad.png', border)
        self.play_vid.setStyleSheet("background-image : url(UI/tempToLoad.png);")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    form = Client()
    form.show()
    sys.exit(app.exec_())
