```bash
bun install
cd server
python3 -m venv venv
source venv/bin/activate # windows ./venv/Scripts/Activate.ps1
pip install -r requirements.txt
deactivate
cd ..
bun dev
```
