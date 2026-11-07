"""Run a small local WSGI server for development/smoke tests."""
from wsgiref.simple_server import make_server
from .app import application

if __name__ == "__main__":
    with make_server("127.0.0.1", 8080, application) as server:
        print("LIVE // EARTH Feed Collector API listening on http://127.0.0.1:8080")
        print("Use HTTPS in production and set FEED_COLLECTOR_ALLOWED_ORIGINS.")
        server.serve_forever()
