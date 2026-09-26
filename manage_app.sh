#!/bin/bash

case "$1" in
    up)
        echo "Starting StockSense containers..."
        podman-compose up -d --build
        echo "StockSense is running on http://localhost:8000"
        ;;
    down)
        echo "Stopping StockSense containers..."
        podman-compose down
        ;;
    restart)
        echo "Restarting StockSense containers..."
        podman-compose down
        podman-compose up -d --build
        echo "StockSense is restarted and running on http://localhost:8000"
        ;;
    logs)
        podman-compose logs -f
        ;;
    *)
        echo "Usage: $0 {up|down|restart|logs}"
        exit 1
esac
