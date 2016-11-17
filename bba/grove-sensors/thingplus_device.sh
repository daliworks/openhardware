#!/bin/sh

if [ -z $BASE_DIR ]; then
  PATH_ABS=$(readlink -f $0)
  BASE_DIR=$(dirname $PATH_ABS)
fi

NODE=/usr/bin/node
LOG_DIR="$BASE_DIR/log"

PID_FILE="$BASE_DIR/.driver.pid"
LOCK_FILE="$BASE_DIR/thingplus_device.lock"

if [ ! -e $LOCK_FILE ]; then
  trap "rm -f $LOCK_FILE; exit" INT TERM EXIT
  touch $LOCK_FILE
else
  echo $0 is already running, remove "$LOCK_FILE" to exceute.
  exit 1;
fi

if [ ! -d $LOG_DIR ] ; then
  mkdir -p $LOG_DIR
fi

check_running() {
  if [ -f $PID_FILE ] ; then
    PID=`cat $PID_FILE`
    ps -p $PID > /dev/null 2>&1
    return $? 
  fi

  return 1;
}

start() {
  #recover rsync if needed
  if check_running ; then
    echo "already running"
  else
    cd $APP_DIR
    PWD=$BASE_DIR $NODE $BASE_DIR/app.js 2>&1 >> $LOG_DIR/thingplus_device.log &
    echo $! > $PID_FILE;
    echo "thingplus device started"
  fi
}

stop() {
  sync
  pkill -F $PID_FILE 2> /dev/null;
  rm -f $PID_FILE;
}

case "$1" in
  status)
    if check_running; then
      echo "running"
    else
      echo "stopped"
    fi
    ;;

  start)
    start
    ;;

  stop)
    stop
    ;;

  restart)
    stop
    start
    ;;

  setup)
    #setup only
    ;;

  *)
    echo "Usage: $0 {start|stop|restart|setup}"
    rm -f $LOCK_FILE
    exit 1
esac

rm -f $LOCK_FILE
