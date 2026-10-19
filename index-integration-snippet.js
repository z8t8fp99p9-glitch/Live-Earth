// In the existing homepage's function activate(id), replace the old
// status.textContent line for the Location placeholder with:
if(id==="location"){location.href="./location.html?locate=1";return}
status.textContent = `${labels[id]} view is not connected yet. Your Earth globe remains available.`;
