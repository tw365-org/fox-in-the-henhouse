import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def start_server():
    os.chdir(DIRECTORY)
    for p in range(PORT, PORT + 20):
        try:
            with socketserver.TCPServer(("127.0.0.1", p), Handler) as httpd:
                url = f"http://localhost:{p}"
                print("=" * 60)
                print("  THE FOX IN THE HENHOUSE | 狐狸與雞舍")
                print("  A First-Person Tech-Horror Experience Satirizing AI Giants")
                print("=" * 60)
                print(f"  Game Server running at: {url}")
                print("  Press Ctrl+C to stop server.")
                print("=" * 60)
                webbrowser.open(url)
                httpd.serve_forever()
                break
        except OSError:
            continue

if __name__ == "__main__":
    start_server()
