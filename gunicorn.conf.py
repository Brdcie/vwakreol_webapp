# Gunicorn configuration
bind = "127.0.0.1:8000"
workers = 2
timeout = 300
keepalive = 10
max_requests = 1000
preload_app = True