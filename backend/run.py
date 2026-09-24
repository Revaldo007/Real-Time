import uvicorn

if __name__ == "__main__":
    print("\n" + "="*50)
    print(" Starting Rivo Backend for PC & Mobile access")
    print(" Accessible locally at:   http://localhost:8000")
    print(" Accessible on Wi-Fi at:  http://0.0.0.0:8000")
    print("="*50 + "\n")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
