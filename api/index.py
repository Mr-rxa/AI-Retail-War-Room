import os
import sys

# Ensure project root is in python path for Vercel
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app import app

# WSGI entrypoint for Vercel Serverless Function
app = app
