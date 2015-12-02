TARGET_IP:=gd
TARGET_DIRECTORY:=/root/driver/

SRCS := app.js soilMoisture.js chainableRGBLed.js package.json 

all: $(SRCS)
	echo $(SRCS)
	scp $(SRCS) root@$(TARGET_IP):$(TARGET_DIRECTORY)

