# Nature automated tests

Run from the repository root:

```bash
python -m unittest discover -s nature/tests -p 'test_*.py' -v
node --check nature/view/nature-view-controller.js
node --check nature/view/nature-publisher-client.js
```

Install the shared Python dependencies first with `python -m pip install -r editorial-engine/requirements.txt`.

The contract suite uses mocked Commons metadata and temporary SQLite databases. It does not access the network or change the active app. The Nature GitHub Actions workflow also exercises the shared Engine in the Publisher process.
