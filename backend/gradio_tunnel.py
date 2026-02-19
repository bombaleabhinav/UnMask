
import gradio as gr
import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure backend directory is in path so we can import main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from main import app as fastapi_app
except ImportError:
    # Fallback if running from a different context
    from backend.main import app as fastapi_app

# Create a Gradio interface
with gr.Blocks() as demo:
    gr.Markdown("# ForensicFlow Backend Tunnel")
    gr.Markdown("The backend is running. Use the public URL below for API calls.")
    gr.Markdown("This interface confirms the tunnel is active.")

def start_tunnel():
    print("Starting Gradio Tunnel...")
    
    # Launch Gradio interface with public tunnel
    # We use prevent_thread_lock so we can execute code after launch
    # share=True creates the tunnel
    _, local_link, public_link = demo.launch(share=True, prevent_thread_lock=True)
    

    # demo.app is the FastAPI instance developed/served by Gradio
    # We inject our existing FastAPI application's routes into it
    # This exposes /api/analyze on the public URL
    demo.app.include_router(fastapi_app.router)
    
    # Gradio enables CORS by default, so we don't need to add it manually here.
    # (Attempting to add it after launch causes a RuntimeError)

    print(f"\n✅ Public Tunneled URL: {public_link}")
    
    # Write to .env in project root (outside frontend folder)
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_file = os.path.join(root_dir, ".env")
    
    with open(env_file, "w") as f:
        # VITE prefix is required for frontend to see it
        f.write(f"VITE_API_URL={public_link}\n")
        
    print(f"✅ Updated {env_file} with VITE_API_URL={public_link}")
    print("Keep this script running to maintain the tunnel.")
    
    try:
        # Keep main thread alive
        import time
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Stopping...")
        demo.close()

if __name__ == "__main__":
    start_tunnel()
