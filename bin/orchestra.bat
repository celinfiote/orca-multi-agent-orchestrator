@echo off
node "C:\Users\Usuario\Documents\helios-gemini3\tools\cluster_manager.js" elect %1
node "C:\Users\Usuario\Documents\helios-gemini3\tools\orchestry_daemon.js" %*
