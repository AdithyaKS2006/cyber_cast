import asyncio
import json
import websockets
import sys
import requests

async def run_cdp():
    res = requests.get('http://localhost:9222/json').json()
    ws_url = res[0]['webSocketDebuggerUrl']
    
    async with websockets.connect(ws_url) as ws:
        # Overwrite startListening to remove alert just in case
        js_code = """
        window.startListening = function() {
          document.getElementById('connection-screen').classList.remove('active');
          document.getElementById('connection-screen').classList.add('active');
          const statusEl = document.getElementById('connection-status');
          statusEl.innerText = "Hosting...";
          
          if (window.bluetoothSerial.listenInsecure) {
            window.bluetoothSerial.listenInsecure(() => {
              window.isConnected = true;
              showChatScreen("Peer Device");
              subscribeToData();
            }, (err) => {
              statusEl.innerText = "Listen Error: " + err;
            });
          } else {
            window.bluetoothSerial.listen(() => {
              window.isConnected = true;
              showChatScreen("Peer Device");
              subscribeToData();
            }, (err) => {
              statusEl.innerText = "Listen Error: " + err;
            });
          }
        };
        // Click the button
        document.getElementById('btn-host').click();
        """
        req = {
            "id": 1,
            "method": "Runtime.evaluate",
            "params": {
                "expression": js_code
            }
        }
        await ws.send(json.dumps(req))
        res = await ws.recv()
        print(f"CDP response: {res}")

asyncio.run(run_cdp())
