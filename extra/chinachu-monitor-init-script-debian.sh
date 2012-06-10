#!/bin/sh
### BEGIN INIT INFO
# Provides: chinachu-monitor
# Required-Start: $network
# Required-Stop: $network
# Default-Start: 2 3 5
# Default-Stop: 0 1 6
# Description: chinachu is fully-automated recoding system.
### END INIT INFO

case "$1" in
'start')
	su chinachu -c "~/.nave/installed/0.6.18/bin/node ~/chinachu/app-monitor.js >> ~/chinachu/log/monitor.log 2>&1 &"
	;;
'stop')
	su chinachu -c "pkill -KILL -f ~/chinachu/app-monitor.js"
	;;
*)
	echo "Usage: $0 { start | stop }"
	;;
esac
exit 0
